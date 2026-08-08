declare module 'shaka-player/dist/shaka-player.ui' {
  namespace shaka {
    namespace polyfill {
      function installAll(): void;
    }

    interface Request {
      uris: string[];
      allowCrossSiteCredentials: boolean;
      headers: { [key: string]: string };
      [key: string]: any;
    }

    interface Response {
      uri: string;
      status?: number;
      headers: { [key: string]: string };
      [key: string]: any;
    }

    interface NetworkingEngine {
      registerRequestFilter(
        filter: (type: number, request: Request) => Promise<any> | void,
      ): any;
      registerResponseFilter(
        filter: (type: number, response: Response) => Promise<any> | void,
      ): any;
      unregisterRequestFilter(filter: (...args: any[]) => any): any;
      unregisterResponseFilter(filter: (...args: any[]) => any): any;
    }

    interface Track {
      active: boolean;
      bandwidth: number;
      height: number | null;
      width: number | null;
      id: number;
      language: string;
      type: string;
      [key: string]: any;
    }

    interface Player {
      attach(video: HTMLVideoElement): Promise<void>;
      load(uri: string): Promise<void>;
      unload(): Promise<void>;
      destroy(): Promise<void>;
      configure(config: any): void;
      addEventListener(type: string, listener: (event: any) => void): void;
      removeEventListener(type: string, listener: (event: any) => void): void;
      getNetworkingEngine(): NetworkingEngine | null;
      getVariantTracks(): Track[];
      getStats(): any;
      getBufferedInfo(): any;
    }

    interface PlayerConstructor {
      new (): Player;
      isBrowserSupported(): boolean;
    }

    const Player: PlayerConstructor;

    namespace net {
      namespace NetworkingEngine {
        enum PluginPriority {
          FALLBACK = 1,
          PREFERRED = 2,
          APPLICATION = 3,
        }

        function registerScheme(
          scheme: string,
          plugin: (...args: any[]) => any,
          priority?: number,
          progressSupport?: boolean,
        ): void;
      }

      namespace HttpFetchPlugin {
        function parse(...args: any[]): any;
        function isSupported(): boolean;
      }

      namespace HttpXHRPlugin {
        function parse(...args: any[]): any;
      }
    }
  }

  export = shaka;
}
