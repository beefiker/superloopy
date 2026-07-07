import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import test from "node:test";

import { decodePng, diffImages, encodePng } from "../skills/superloopy-frontend/scripts/visual-diff.mjs";

function solid(width, height, [r, g, b, a]) {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let p = 0; p < width * height; p += 1) {
    rgba[p * 4] = r; rgba[p * 4 + 1] = g; rgba[p * 4 + 2] = b; rgba[p * 4 + 3] = a;
  }
  return rgba;
}

function decoded(width, height, rgba) {
  return decodePng(encodePng(width, height, rgba));
}

function pngWithDimensions(width, height) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const chunk = (type, data) => {
    const out = Buffer.alloc(12 + data.length);
    out.writeUInt32BE(data.length, 0);
    out.write(type, 4, "ascii");
    data.copy(out, 8);
    return out;
  };
  return Buffer.concat([signature, chunk("IHDR", ihdr), chunk("IEND", Buffer.alloc(0))]);
}

test("encode/decode round-trips RGBA pixels through all PNG filters", () => {
  const rgba = solid(16, 16, [255, 255, 255, 255]);
  rgba[0] = 10; rgba[1] = 20; rgba[2] = 30; rgba[3] = 200; // one off pixel
  const back = decodePng(encodePng(16, 16, rgba));
  assert.equal(back.width, 16);
  assert.equal(back.height, 16);
  assert.deepEqual(Array.from(back.rgba.slice(0, 4)), [10, 20, 30, 200]);
});

test("decodePng rejects oversized IHDR dimensions before inflating pixel data", () => {
  assert.throws(
    () => decodePng(pngWithDimensions(40_000, 40_000)),
    /PNG dimensions exceed/
  );
});

test("identical images score 100 with no hotspots", () => {
  const a = decoded(16, 16, solid(16, 16, [255, 255, 255, 255]));
  const b = decoded(16, 16, solid(16, 16, [255, 255, 255, 255]));
  const r = diffImages(a, b);
  assert.equal(r.dimensionsMatch, true);
  assert.equal(r.diffPixels, 0);
  assert.equal(r.similarityScore, 100);
  assert.equal(r.alphaChannelIntact, true);
  assert.deepEqual(r.hotspots, []);
});

test("a localized difference is measured and the worst grid cell surfaces first", () => {
  const ref = solid(16, 16, [255, 255, 255, 255]);
  const act = solid(16, 16, [255, 255, 255, 255]);
  for (let y = 0; y < 4; y += 1) {
    for (let x = 0; x < 4; x += 1) {
      const i = (y * 16 + x) * 4;
      act[i] = 255; act[i + 1] = 0; act[i + 2] = 0; act[i + 3] = 255; // red 4x4 top-left
    }
  }
  const r = diffImages(decoded(16, 16, ref), decoded(16, 16, act));
  assert.equal(r.diffPixels, 16);
  assert.equal(r.similarityScore, 94); // 1 - 16/256 = 0.9375 -> 94
  assert.ok(r.hotspots.length > 0);
  assert.equal(r.hotspots[0].diffRatio, 1);
  assert.ok(r.hotspots[0].gridX < 2 && r.hotspots[0].gridY < 2);
});

test("dimension mismatch is reported and only the overlap is compared", () => {
  const a = decoded(16, 16, solid(16, 16, [0, 0, 0, 255]));
  const b = decoded(16, 8, solid(16, 8, [0, 0, 0, 255]));
  const r = diffImages(a, b);
  assert.equal(r.dimensionsMatch, false);
  assert.equal(r.height, 8);
  assert.equal(r.diffPixels, 0);
});

test("lost transparency trips alphaChannelIntact", () => {
  const ref = decoded(8, 8, solid(8, 8, [255, 255, 255, 0])); // transparent reference
  const act = decoded(8, 8, solid(8, 8, [255, 255, 255, 255])); // opaque actual
  const r = diffImages(ref, act);
  assert.equal(r.alphaChannelIntact, false);
});
