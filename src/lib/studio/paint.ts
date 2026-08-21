import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const STYLES = ["van-gogh", "klimt"] as const;
export type PaintStyle = (typeof STYLES)[number];

const PROMPTS: Record<PaintStyle, string> = {
  "van-gogh":
    "Repaint this exact landscape as an oil painting in the manner of Vincent van Gogh. Thick impasto, visible directional brushstrokes, swirling sky, cobalt and ochre, luminous water. Keep the same waterfall, cliffs, pool, and camera angle. No frame, no signature, no text, no people.",
  klimt:
    "Repaint this exact landscape as a painting in the manner of Gustav Klimt. Ornamental gold-leaf patterning in stone and foliage, mosaic tesserae, decorative trees, luminous patterned water. Keep the same waterfall, cliffs, pool, and camera angle. No frame, no signature, no text, no people.",
};

const Input = z.object({
  image: z.string().min(32).max(2_000_000),
  style: z.enum(STYLES),
});

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 8;
const stamps: number[] = [];

function allowPaint() {
  const now = Date.now();
  while (stamps.length && now - stamps[0]! > WINDOW_MS) stamps.shift();
  if (stamps.length >= MAX_PER_WINDOW) return false;
  stamps.push(now);
  return true;
}

export const studioStatus = createServerFn({ method: "GET" }).handler(
  async () => ({ available: Boolean(process.env.XAI_API_KEY) }),
);

export const paintSnapshot = createServerFn({ method: "POST" })
  .validator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "Painting is unavailable right now." };
    }
    if (!allowPaint()) {
      return {
        ok: false as const,
        error: "The studio is at rest. Try again in a few minutes.",
      };
    }
    if (!data.image.startsWith("data:image/")) {
      return { ok: false as const, error: "That snapshot could not be read." };
    }

    const body = {
      model: "grok-imagine-image-2.0",
      prompt: PROMPTS[data.style],
      image: { url: data.image, type: "image_url" },
    };

    const run = () =>
      fetch("https://api.x.ai/v1/images/edits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

    let res = await run();
    if (!res.ok && res.status >= 500) res = await run();
    if (!res.ok) {
      return {
        ok: false as const,
        error: `The studio could not finish the painting (${res.status}).`,
      };
    }

    const json = (await res.json()) as {
      data?: { url?: string; b64_json?: string; mime_type?: string }[];
    };
    const first = json.data?.[0];
    if (first?.b64_json) {
      const mime = first.mime_type || "image/jpeg";
      return {
        ok: true as const,
        image: `data:${mime};base64,${first.b64_json}`,
      };
    }
    if (!first?.url) {
      return { ok: false as const, error: "The studio returned no painting." };
    }

    try {
      const img = await fetch(first.url);
      if (!img.ok) {
        return { ok: true as const, image: first.url };
      }
      const buf = Buffer.from(await img.arrayBuffer());
      const mime = img.headers.get("content-type") || "image/jpeg";
      return {
        ok: true as const,
        image: `data:${mime};base64,${buf.toString("base64")}`,
      };
    } catch {
      return { ok: true as const, image: first.url };
    }
  });
