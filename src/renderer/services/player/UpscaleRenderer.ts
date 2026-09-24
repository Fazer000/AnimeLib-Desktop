/// <reference types="@webgpu/types" />
/* eslint-disable no-undef, no-bitwise */
/**
 * Апскейл кадров видео шейдерами Anime4K на WebGPU. Слева от черты
 * сравнения — обработанный кадр, справа — исходный
 */
import {
  UPSCALE_FRAME_BUDGET_MS,
  UPSCALE_FRAME_WINDOW,
  UPSCALE_STATS_INTERVAL,
} from '../../../constants';
import FrameTimeMeter from '../../utils/FrameTimeMeter';
import type { PixelSize } from '../../utils/upscaleGeometry';
import { createLogger } from '../../../shared/logger';

const log = createLogger('UpscaleRenderer');

const READY_HAVE_CURRENT_DATA = 2;

const PRESENT_SHADER = `
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

@vertex
fn vert_main(@builtin(vertex_index) index: u32) -> VertexOutput {
  var corners = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  let corner = corners[index];
  var output: VertexOutput;
  output.position = vec4f(corner, 0.0, 1.0);
  output.uv = vec2f((corner.x + 1.0) * 0.5, (1.0 - corner.y) * 0.5);
  return output;
}

@group(0) @binding(0) var frameSampler: sampler;
@group(0) @binding(1) var processed: texture_2d<f32>;
@group(0) @binding(2) var original: texture_2d<f32>;
@group(0) @binding(3) var<uniform> split: vec4f;

@fragment
fn frag_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let enhanced = textureSample(processed, frameSampler, uv);
  let source = textureSample(original, frameSampler, uv);
  return vec4f(select(source.rgb, enhanced.rgb, uv.x < split.x), 1.0);
}
`;

const loadAnime4K = () => import('anime4k-webgpu-async');

type Anime4KModule = Awaited<ReturnType<typeof loadAnime4K>>;

type Anime4KPipelineList = Parameters<Anime4KModule['recordPipelineList']>[1];

type FrameCallbackVideo = HTMLVideoElement & {
  requestVideoFrameCallback: (callback: () => void) => number;
  cancelVideoFrameCallback: (handle: number) => void;
};

export interface UpscaleStats {
  frameTimeMs: number;
  overBudgetShare: number;
  sourceSize: PixelSize;
  targetSize: PixelSize;
}

export interface UpscaleRendererOptions {
  onStats?: (stats: UpscaleStats) => void;
  onError?: (error: unknown) => void;
}

export default class UpscaleRenderer {
  private device: GPUDevice | null = null;

  private context: GPUCanvasContext | null = null;

  private canvas: HTMLCanvasElement | null = null;

  private video: FrameCallbackVideo | null = null;

  private presentPipeline: GPURenderPipeline | null = null;

  private sampler: GPUSampler | null = null;

  private splitBuffer: GPUBuffer | null = null;

  private inputTexture: GPUTexture | null = null;

  private pipelines: Anime4KPipelineList = [];

  private bindGroup: GPUBindGroup | null = null;

  private pipelineKey: string = '';

  private building: Promise<void> | null = null;

  private targetSize: PixelSize = { width: 0, height: 0 };

  private split: number = 1;

  private frameHandle: number | null = null;

  private pending: boolean = false;

  private redrawQueued: boolean = false;

  private disposed: boolean = false;

  private framesSinceStats: number = 0;

  private readonly meter = new FrameTimeMeter(UPSCALE_FRAME_WINDOW);

  private readonly onStats?: (stats: UpscaleStats) => void;

  private readonly onError?: (error: unknown) => void;

  constructor({ onStats, onError }: UpscaleRendererOptions = {}) {
    this.onStats = onStats;
    this.onError = onError;
  }

  /**
   * Есть ли в окружении WebGPU
   */
  public static isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'gpu' in navigator;
  }

  /**
   * Поднимает устройство WebGPU и начинает обрабатывать кадры видео
   */
  public async start(
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
  ): Promise<void> {
    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: 'high-performance',
    });
    if (!adapter) throw new Error('WebGPU adapter is unavailable');

    const device = await adapter.requestDevice();
    if (this.disposed) {
      device.destroy();
      return;
    }

    this.watchDeviceLoss(device);

    const context = canvas.getContext('webgpu');
    if (!context) throw new Error('WebGPU canvas context is unavailable');

    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format, alphaMode: 'opaque' });

    const module = device.createShaderModule({ code: PRESENT_SHADER });
    this.presentPipeline = await device.createRenderPipelineAsync({
      layout: 'auto',
      vertex: { module, entryPoint: 'vert_main' },
      fragment: { module, entryPoint: 'frag_main', targets: [{ format }] },
      primitive: { topology: 'triangle-list' },
    });

    this.sampler = device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
    });
    this.splitBuffer = device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.device = device;
    this.context = context;
    this.canvas = canvas;
    this.video = video as FrameCallbackVideo;
    this.applyCanvasSize();
    this.writeSplit();

    this.video.addEventListener('seeked', this.requestRedraw);
    this.scheduleFrame();
    this.requestRedraw();
    log.debug('Started, format:', format);
  }

  /**
   * Задаёт размер холста в физических пикселях; цепочка перестраивается
   */
  public resize(size: PixelSize): void {
    if (
      size.width === this.targetSize.width &&
      size.height === this.targetSize.height
    ) {
      return;
    }

    this.targetSize = size;
    this.applyCanvasSize();
    this.requestRedraw();
  }

  /**
   * Положение черты сравнения в долях ширины; 1 — весь кадр обработан
   */
  public setSplit(split: number): void {
    this.split = split;
    this.writeSplit();
    if (this.video?.paused) this.requestRedraw();
  }

  /**
   * Останавливает обработку и освобождает видеопамять
   */
  public dispose(): void {
    this.disposed = true;

    if (this.video && this.frameHandle !== null) {
      this.video.cancelVideoFrameCallback(this.frameHandle);
    }
    this.video?.removeEventListener('seeked', this.requestRedraw);

    this.inputTexture?.destroy();
    this.splitBuffer?.destroy();
    this.context?.unconfigure();
    this.device?.destroy();

    this.video = null;
    this.canvas = null;
    this.context = null;
    this.device = null;
    this.pipelines = [];
  }

  private applyCanvasSize(): void {
    if (!this.canvas || !this.targetSize.width) return;

    this.canvas.width = this.targetSize.width;
    this.canvas.height = this.targetSize.height;
  }

  private async watchDeviceLoss(device: GPUDevice): Promise<void> {
    const info = await device.lost;
    if (!this.disposed) log.warn('GPU device lost:', info.message);
  }

  private writeSplit(): void {
    this.device?.queue.writeBuffer(
      this.splitBuffer as GPUBuffer,
      0,
      new Float32Array([this.split, 0, 0, 0]),
    );
  }

  private scheduleFrame(): void {
    if (this.disposed || !this.video) return;

    this.frameHandle = this.video.requestVideoFrameCallback(this.handleFrame);
  }

  private handleFrame = (): void => {
    this.frameHandle = null;
    this.scheduleFrame();
    this.requestRedraw();
  };

  /**
   * Перерисовывает кадр; запрос во время отрисовки выполняется следом
   */
  private requestRedraw = (): void => {
    if (this.pending) {
      this.redrawQueued = true;
      return;
    }

    this.drawThenDrainQueue();
  };

  private async drawThenDrainQueue(): Promise<void> {
    await this.renderFrame();
    if (this.redrawQueued && !this.disposed) {
      this.redrawQueued = false;
      this.requestRedraw();
    }
  }

  /**
   * Пересобирает цепочку Anime4K под размер кадра и холста
   */
  private async ensurePipelines(): Promise<boolean> {
    const { video } = this;
    if (!video) return false;

    const key = `${video.videoWidth}x${video.videoHeight}>${this.targetSize.width}x${this.targetSize.height}`;
    if (key === this.pipelineKey) return true;
    if (this.building) return false;

    this.building = this.buildPipelines(key);
    try {
      await this.building;
    } finally {
      this.building = null;
    }

    return key === this.pipelineKey;
  }

  private async buildPipelines(key: string): Promise<void> {
    const { device, video, presentPipeline, sampler, splitBuffer } = this;
    if (!device || !video || !presentPipeline || !sampler || !splitBuffer) {
      return;
    }

    const { ModeA } = await loadAnime4K();
    if (this.disposed) return;

    const nativeDimensions = {
      width: video.videoWidth,
      height: video.videoHeight,
    };
    const input = device.createTexture({
      size: [nativeDimensions.width, nativeDimensions.height, 1],
      format: 'rgba16float',
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });
    const mode = new ModeA({
      device,
      inputTexture: input,
      nativeDimensions,
      targetDimensions: { ...this.targetSize },
    });

    this.inputTexture?.destroy();
    this.inputTexture = input;
    this.pipelines = [mode];
    this.bindGroup = device.createBindGroup({
      layout: presentPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: sampler },
        { binding: 1, resource: mode.getOutputTexture().createView() },
        { binding: 2, resource: input.createView() },
        { binding: 3, resource: { buffer: splitBuffer } },
      ],
    });
    this.pipelineKey = key;
    this.meter.reset();
    log.debug('Pipeline built:', key);
  }

  /**
   * Копирует текущий кадр, прогоняет цепочку и выводит результат на холст
   */
  private async renderFrame(): Promise<void> {
    const { device, context, video, presentPipeline } = this;
    if (
      !device ||
      !context ||
      !video ||
      !presentPipeline ||
      video.readyState < READY_HAVE_CURRENT_DATA ||
      !video.videoWidth ||
      !this.targetSize.width
    ) {
      return;
    }

    this.pending = true;
    try {
      if (!(await this.ensurePipelines()) || this.disposed) return;

      const startedAt = performance.now();
      device.queue.copyExternalImageToTexture(
        { source: video },
        { texture: this.inputTexture as GPUTexture },
        [video.videoWidth, video.videoHeight],
      );

      const { recordPipelineList } = await loadAnime4K();
      const encoder = device.createCommandEncoder();
      await recordPipelineList(encoder, this.pipelines);

      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: context.getCurrentTexture().createView(),
            clearValue: { r: 0, g: 0, b: 0, a: 1 },
            loadOp: 'clear',
            storeOp: 'store',
          },
        ],
      });
      pass.setPipeline(presentPipeline);
      pass.setBindGroup(0, this.bindGroup);
      pass.draw(3);
      pass.end();

      device.queue.submit([encoder.finish()]);
      await device.queue.onSubmittedWorkDone();
      this.recordFrameTime(performance.now() - startedAt);
    } catch (error) {
      if (!this.disposed) {
        log.error('Upscale frame failed:', error);
        if (error instanceof DOMException && error.name === 'SecurityError') {
          this.onError?.(error);
        }
      }
    } finally {
      this.pending = false;
    }
  }

  private recordFrameTime(ms: number): void {
    this.meter.push(ms);
    this.framesSinceStats += 1;
    if (this.framesSinceStats < UPSCALE_STATS_INTERVAL || !this.video) return;

    this.framesSinceStats = 0;
    this.onStats?.({
      frameTimeMs: this.meter.average(),
      overBudgetShare: this.meter.overBudgetShare(UPSCALE_FRAME_BUDGET_MS),
      sourceSize: {
        width: this.video.videoWidth,
        height: this.video.videoHeight,
      },
      targetSize: { ...this.targetSize },
    });
  }
}
