import { artwork, type ArtworkRequest } from './artwork.ts';

/** Generation and colour planning take 100–500 ms; here they never block the controls. */
self.onmessage = (event: MessageEvent<{ id: number; request: ArtworkRequest }>) => {
  const { id, request } = event.data;
  try {
    self.postMessage({ id, result: artwork(request) });
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
  }
};
