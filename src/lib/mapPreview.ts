import type { PluginApi } from '@arkadia/plugin-types';

export interface MapPreviewController {
  preview(roomId: number): void;
  dispose(): void;
}

interface MapPreviewOptions {
  durationMs?: number;
  missingRoomMessage: string;
}

export function createMapPreviewController(
  api: PluginApi,
  options: MapPreviewOptions,
): MapPreviewController {
  const durationMs = options.durationMs ?? 2_000;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let originRoomId: number | null = null;

  const restore = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    const origin = originRoomId;
    originRoomId = null;
    if (origin !== null) void api.command.send(`/ustaw ${origin}`);
  };

  return {
    preview(roomId: number): void {
      if (timer === null) {
        const currentRoomId = api.map.getRoom()?.id;
        if (currentRoomId === undefined) {
          api.output.print(options.missingRoomMessage);
          return;
        }
        originRoomId = currentRoomId;
      } else {
        clearTimeout(timer);
      }

      void api.command.send(`/ustaw ${roomId}`);
      timer = setTimeout(restore, durationMs);
    },
    dispose: restore,
  };
}
