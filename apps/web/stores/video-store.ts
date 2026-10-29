import { create } from "zustand"
import type { VideoShape } from "@workspace/api/contract"

type VideoState = {
  /** Each video's frame and length by URL, read as the browser loads it. */
  shapes: Record<string, VideoShape>
  loaded: (url: string, shape: VideoShape) => void
}

export const useVideoStore = create<VideoState>()((set) => ({
  shapes: {},
  loaded: (url, shape) =>
    set((state) => ({ shapes: { ...state.shapes, [url]: shape } })),
}))
