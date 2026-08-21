const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.84;

export async function snapshotScene(): Promise<string | null> {
  const canvas = document.querySelector("canvas[data-cascade-scene]");
  if (!(canvas instanceof HTMLCanvasElement)) return null;
  if (canvas.width < 8 || canvas.height < 8) return null;

  const scale = Math.min(1, MAX_EDGE / Math.max(canvas.width, canvas.height));
  const w = Math.max(1, Math.round(canvas.width * scale));
  const h = Math.max(1, Math.round(canvas.height * scale));
  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  const ctx = off.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(canvas, 0, 0, w, h);
  return off.toDataURL("image/jpeg", JPEG_QUALITY);
}

export function downloadDataUri(uri: string, name: string) {
  const a = document.createElement("a");
  a.href = uri;
  a.download = name;
  a.click();
}
