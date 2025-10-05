declare module 'shaka-player/dist/shaka-player.ui' {
  export = shaka;
}

declare namespace shaka {
  export namespace polyfill {
    export function installAll(): void;
  }

  export class Player {
    constructor();

    static isBrowserSupported(): boolean;

    attach(video: HTMLVideoElement): Promise<void>;

    load(uri: string): Promise<void>;

    unload(): Promise<void>;

    destroy(): Promise<void>;

    configure(config: any): void;

    addEventListener(type: string, listener: (event: any) => void): void;

    removeEventListener(type: string, listener: (event: any) => void): void;
  }
}
