import { ImageResponse } from "next/og"
import { ghostPath } from "@/components/brand"

export const alt = "aghost: social media scheduler and Instagram DM automation"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const ink = "#16252b"

/** The share card: the monogram, the promise, and the six platforms. */
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "#f7f7f4",
        color: ink,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: 720,
          padding: "64px 0 64px 72px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <svg width="52" height="52" viewBox="0 0 100 100">
            <path fill={ink} fillRule="evenodd" d={ghostPath} />
          </svg>
          <span style={{ fontSize: 40, letterSpacing: "-0.03em" }}>aghost</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <span style={{ fontSize: 26, color: "rgba(22, 37, 43, 0.65)" }}>
            Social media scheduler and Instagram DM automation
          </span>
          <span
            style={{
              fontSize: 76,
              lineHeight: 1,
              letterSpacing: "-0.05em",
            }}
          >
            Post everywhere. Answer every comment.
          </span>
        </div>
        <span style={{ fontSize: 22, color: "rgba(22, 37, 43, 0.6)" }}>
          Instagram · Facebook · LinkedIn · X · Threads · YouTube
        </span>
      </div>
      <div
        style={{
          display: "flex",
          flex: 1,
          margin: "40px 40px 40px 0",
          backgroundImage:
            "radial-gradient(circle at 70% 28%, rgba(255,255,255,0.95), rgba(255,255,255,0) 32%), radial-gradient(circle at 30% 44%, rgba(255,248,236,0.85), rgba(255,248,236,0) 28%), linear-gradient(180deg, #4f80bb 0%, #7ea6d3 32%, #c4d5df 55%, #d5ddd2 64%, #93b06a 78%, #4f7536 100%)",
        }}
      />
    </div>,
    size
  )
}
