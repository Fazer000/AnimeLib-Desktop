declare module 'shaka-player/dist/shaka-player.ui' {
  namespace shaka {
    namespace polyfill {
      function installAll(): void;
    }

    interface Player {
      attach(video: HTMLVideoElement): Promise<void>;
      load(uri: string): Promise<void>;
      unload(): Promise<void>;
      destroy(): Promise<void>;
      configure(config: any): void;
      addEventListener(type: string, listener: (event: any) => void): void;
      removeEventListener(type: string, listener: (event: any) => void): void;
    }

    interface PlayerConstructor {
      new (): Player;
      isBrowserSupported(): boolean;
    }

    const Player: PlayerConstructor;
  }

  export = shaka;
}
