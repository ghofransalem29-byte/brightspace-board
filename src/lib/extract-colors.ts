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

    // Average each bucket. Track frequency (population) and saturation
    // separately so we can reserve one slot for a vivid accent that may
    // be small in area but visually striking.
    const clusters = buckets.map((p) => {
      let r = 0, g = 0, b = 0;
      for (const px of p) { r += px[0]; g += px[1]; b += px[2]; }
      r /= p.length; g /= p.length; b /= p.length;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      const sat = mx === 0 ? 0 : (mx - mn) / mx;
      return { r, g, b, n: p.length, sat };
    });

    const tooClose = (
      a: { r: number; g: number; b: number },
      b: { r: number; g: number; b: number },
    ) => Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b) < 24;

    // Reserve the last slot for an accent. Pick (count - 1) dominant
    // colors by raw frequency first, then choose the most saturated
    // color from what's left as the accent.
    const dominantSlots = Math.max(1, count - 1);
    const byFrequency = [...clusters].sort((a, b) => b.n - a.n);

    const picked: Array<{ r: number; g: number; b: number }> = [];
    const out: string[] = [];
    for (const c of byFrequency) {
      if (picked.some((p) => tooClose(p, c))) continue;
      picked.push(c);
      out.push(toHex(c.r, c.g, c.b));
      if (out.length >= dominantSlots) break;
    }

    if (out.length < count) {
      const remaining = clusters.filter((c) => !picked.includes(c));
      // Require a minimum vividness so we don't pick a near-neutral as "accent".
      const accent = remaining
        .filter((c) => c.sat > 0.25)
        .sort((a, b) => b.sat - a.sat)
        .find((c) => !picked.some((p) => tooClose(p, c)));
      if (accent) {
        picked.push(accent);
        out.push(toHex(accent.r, accent.g, accent.b));
      } else {
        // Fall back to next most frequent if no vivid accent exists.
        for (const c of byFrequency) {
          if (picked.some((p) => tooClose(p, c))) continue;
          picked.push(c);
          out.push(toHex(c.r, c.g, c.b));
          if (out.length >= count) break;
        }
      }
    }

    return out;
  } finally {
    URL.revokeObjectURL(url);
  }
}