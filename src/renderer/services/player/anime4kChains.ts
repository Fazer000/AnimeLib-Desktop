/// <reference types="@webgpu/types" />
/* eslint-disable no-undef */
/**
 * Цепочки шейдеров Anime4K для уровней улучшения картинки
 */
import type { UpscalePreset } from '../../../constants';

/**
 * Загружает только нужные шейдеры отдельным чанком
 */
export const loadAnime4K = () =>
  import(
    /* webpackChunkName: "anime4k", webpackExports: ["PresetPipeline", "ClampHighlights", "CNNM", "CNNVL", "CNNUL", "CNNx2M", "CNNx2VL", "CNNx2UL", "recordPipelineList"] */
    'anime4k-webgpu-async'
  );

export type Anime4KModule = Awaited<ReturnType<typeof loadAnime4K>>;

export type Anime4KPipelineList = Parameters<
  Anime4KModule['recordPipelineList']
>[1];

export type Anime4KChain = Anime4KPipelineList[number];

type PipelineClass = new (descriptor: {
  device: GPUDevice;
  inputTexture: GPUTexture;
}) => Anime4KChain;

interface ChainDescriptor {
  device: GPUDevice;
  inputTexture: GPUTexture;
  nativeDimensions: { width: number; height: number };
  targetDimensions: { width: number; height: number };
}

/**
 * Собирает цепочку уровня по схеме Mode A: восстановление, x2 при нужде,
 * подгонка под экран и второй x2 для больших экранов
 */
export function createAnime4KChain(
  lib: Anime4KModule,
  preset: UpscalePreset,
  descriptor: ChainDescriptor,
): Anime4KChain {
  const restore: PipelineClass = {
    fast: lib.CNNM,
    balanced: lib.CNNVL,
    quality: lib.CNNUL,
  }[preset];
  const upscale: PipelineClass = {
    fast: lib.CNNx2M,
    balanced: lib.CNNx2VL,
    quality: lib.CNNx2UL,
  }[preset];

  class Chain extends lib.PresetPipeline {
    constructor() {
      super(descriptor);
      this.addNode(lib.ClampHighlights)
        .addNode(restore)
        .addUpscaleX2IfNeeded(upscale)
        .addAutoDownscale()
        .addUpscaleX2IfNeeded(lib.CNNx2M);
    }
  }

  return new Chain();
}
