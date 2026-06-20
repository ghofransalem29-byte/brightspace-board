// Extract dominant colors from an image File using canvas + a simple
// color-bucket histogram. Returns up to `count` hex strings ordered by
// frequency.
export async function extractDominantColors(file: File, count = 5): Promise<string[]> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const max = 120;
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

    // Bucket colors into 5-bit-per-channel cells (32^3 = 32k cells max)
    const buckets = new Map<number, { r: number; g: number; b: number; n: number }>();
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 200) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Skip near-white & near-black noise so dominant accents win
      const max3 = Math.max(r, g, b);
      const min3 = Math.min(r, g, b);
      if (max3 > 245 && min3 > 245) continue;
      if (max3 < 12) continue;
      const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      const cur = buckets.get(key);
      if (cur) {
        cur.r += r;
        cur.g += g;
        cur.b += b;
        cur.n += 1;
      } else {
        buckets.set(key, { r, g, b, n: 1 });
      }
    }

    const sorted = Array.from(buckets.values()).sort((a, b) => b.n - a.n);
    const out: string[] = [];
    const seen = new Set<string>();
    for (const c of sorted) {
      const r = Math.round(c.r / c.n);
      const g = Math.round(c.g / c.n);
      const b = Math.round(c.b / c.n);
      const hex = "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
      // De-dupe colors too similar to ones we already have
      let tooClose = false;
      for (const h of seen) {
        const pr = parseInt(h.slice(1, 3), 16);
        const pg = parseInt(h.slice(3, 5), 16);
        const pb = parseInt(h.slice(5, 7), 16);
        if (Math.abs(pr - r) + Math.abs(pg - g) + Math.abs(pb - b) < 45) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) continue;
      seen.add(hex);
      out.push(hex);
      if (out.length >= count) break;
    }
    return out;
  } finally {
    URL.revokeObjectURL(url);
  }
}