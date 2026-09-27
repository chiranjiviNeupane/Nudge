import { ImageResponse } from "next/og";
import { CHEVRON_POINTS } from "@/components/nav/Wordmark";

// App icons, generated at build time: the wordmark's up-chevron in white
// on a light blue gradient. "maskable" is full-bleed with the chevron inside
// Android's safe zone; the others have their own rounded corners.

const GRADIENT = "linear-gradient(135deg, #7d9bff, #4468e6)";

export function generateImageMetadata() {
  return [
    { id: "32", size: { width: 32, height: 32 }, contentType: "image/png" },
    { id: "192", size: { width: 192, height: 192 }, contentType: "image/png" },
    { id: "512", size: { width: 512, height: 512 }, contentType: "image/png" },
    { id: "maskable", size: { width: 512, height: 512 }, contentType: "image/png" },
  ];
}

export default async function Icon({ id }: { id: Promise<string> }) {
  const key = await id;
  const maskable = key === "maskable";
  const size = maskable ? 512 : Number(key);
  const glyph = size * (maskable ? 0.56 : 0.72);
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
          borderRadius: maskable ? 0 : size * 0.22,
        }}
      >
        <svg width={glyph} height={glyph} viewBox="0 0 24 24">
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
    { width: size, height: size },
  );
}
