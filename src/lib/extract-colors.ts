// Extract dominant colors from an image File using a median-cut algorithm
// over a downsampled bitmap. Returns up to `count` hex strings ordered by
// the perceptual weight of each cluster (population × saturation boost),
// so meaningful accent colors surface alongside the dominant tones.

type Pixel = [number, number, number];

function toHex(r: number, g: number, b: number) {
  return (
    "#" +
    [r, g, b]
      .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"))
      .join("")
  );
}

function medianCut(pixels: Pixel[], depth: number): Pixel[][] {
  if (depth === 0 || pixels.length === 0) return [pixels];
  // Find channel with greatest range
  let rMin = 255, rMax = 0, gMin = 255, gMax = 0, bMin = 255, bMax = 0;
  for (const [r, g, b] of pixels) {
    if (r < rMin) rMin = r; if (r > rMax) rMax = r;
    if (g < gMin) gMin = g; if (g > gMax) gMax = g;
    if (b < bMin) bMin = b; if (b > bMax) bMax = b;
  }
  const rR = rMax - rMin, gR = gMax - gMin, bR = bMax - bMin;
  const channel = rR >= gR && rR >= bR ? 0 : gR >= bR ? 1 : 2;
  pixels.sort((a, b) => a[channel] - b[channel]);
  const mid = pixels.length >> 1;
  return [
    ...medianCut(pixels.slice(0, mid), depth - 1),
    ...medianCut(pixels.slice(mid), depth - 1),
  ];
}

export async function extractDominantColors(file: File, count = 5): Promise<string[]> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const max = 240;
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return [];
    ctx.drawImage(img, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);

    const pixels: Pixel[] = [];
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 200) continue;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      // Drop pure white / pure black noise only
      if (mx > 250 && mn > 250) continue;
      if (mx < 8) continue;
      pixels.push([r, g, b]);
    }
    if (pixels.length === 0) return [];

    // depth=3 -> up to 8 buckets, depth=4 -> 16. Choose just enough.
    const depth = count <= 4 ? 3 : count <= 8 ? 3 : 4;
    const buckets = medianCut(pixels, depth).filter((p) => p.length > 0);

    // Average each bucket and compute a score that favors populous clusters
    // but gives a small boost to saturated colors so accents aren't lost.
    const clusters = buckets.map((p) => {
      let r = 0, g = 0, b = 0;
      for (const px of p) { r += px[0]; g += px[1]; b += px[2]; }
      r /= p.length; g /= p.length; b /= p.length;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      const sat = mx === 0 ? 0 : (mx - mn) / mx;
      const score = p.length * (1 + sat * 0.6);
      return { r, g, b, n: p.length, score };
    });

    clusters.sort((a, b) => b.score - a.score);

    // De-dupe clusters that are perceptually very close
    const out: string[] = [];
    const picked: Array<{ r: number; g: number; b: number }> = [];
    for (const c of clusters) {
      const tooClose = picked.some(
        (p) => Math.hypot(p.r - c.r, p.g - c.g, p.b - c.b) < 24
      );
      if (tooClose) continue;
      picked.push(c);
      out.push(toHex(c.r, c.g, c.b));
      if (out.length >= count) break;
    }
    return out;
  } finally {
    URL.revokeObjectURL(url);
  }
}