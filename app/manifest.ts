import type { MetadataRoute } from "next";

/** Lets "Add to Home Screen" install Nudge with its icon, opening full-screen. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nudge",
    short_name: "Nudge",
    description: "A fast, minimal workout log. Log every set, nudge it up.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f7f7f8",
    theme_color: "#f7f7f8",
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png" },
      { src: "/icon/512", sizes: "512x512", type: "image/png" },
      { src: "/icon/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
