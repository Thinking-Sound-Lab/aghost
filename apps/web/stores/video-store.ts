import { create } from "zustand"
import type { VideoShape } from "@workspace/api/contract"

type VideoState = {
  /** Each video's frame and length by URL, read as the browser loads it. */
  shapes: Record<string, VideoShape>
  /** The player that started last; one video plays at a time. */
  playing: string | null
  loaded: (url: string, shape: VideoShape) => void
  started: (player: string) => void
}

export const useVideoStore = create<VideoState>()((set) => ({
  shapes: {},
  playing: null,
  loaded: (url, shape) =>
    set((state) => ({ shapes: { ...state.shapes, [url]: shape } })),
  started: (player) => set({ playing: player }),
}))
