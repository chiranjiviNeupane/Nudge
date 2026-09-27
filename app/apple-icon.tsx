import { ImageResponse } from "next/og";
import { CHEVRON_POINTS } from "@/components/nav/Wordmark";

// iPhone home-screen icon. Full-bleed: iOS rounds the corners itself.

const GRADIENT = "linear-gradient(135deg, #7d9bff, #4468e6)";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          // Light blue gradient: colourful enough to stand out on a home screen, without a heavy block.
          backgroundImage: GRADIENT,
        }}
      >
        <svg width={120} height={120} viewBox="0 0 24 24">
          <polyline
            points={CHEVRON_POINTS}
            fill="none"
            stroke="#ffffff"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    size,
  );
}
