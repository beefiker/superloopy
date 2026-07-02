#!/usr/bin/env node
// Dependency-free frame-extraction gate for the Superloopy video skill.
// Turns "the render is right" into measurable checks: parses STORYBOARD.md
// beat markers ([t=2s d=1.5s]), extracts a PNG at every beat start (and
// midpoint with --mid) from the rendered MP4, and asserts container facts —
// duration covers the last beat, aspect matches --aspect, an audio stream
// exists. A beat past the video's end (the signature of a truncated render)
// exits non-zero, so it drops straight into the loop:
//   superloopy loop prove -- node skills/superloopy-video/scripts/frame-qa.mjs out.mp4 --storyboard STORYBOARD.md
// Uses only node:fs / node:child_process (ffmpeg + ffprobe on PATH).
// Exports parseBeats/parseTimes for tests.

import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";

const BEAT = /\[t=(\d+(?:\.\d+)?)s(?:\s+d=(\d+(?:\.\d+)?)s)?\]/g;
const DURATION_TOLERANCE_SEC = 0.5;

// Parse storyboard text into ordered beats: [{ t, d }]. `d` may be null.
export function parseBeats(storyboardText) {
  const beats = [];
  for (const m of storyboardText.matchAll(BEAT)) {
    beats.push({ t: Number.parseFloat(m[1]), d: m[2] === undefined ? null : Number.parseFloat(m[2]) });
  }
  return beats.sort((a, b) => a.t - b.t);
}

// Parse a --times list ("0,2.5,7") into beats with no duration.
export function parseTimes(list) {
  return String(list)
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => ({ t: Number.parseFloat(s), d: null }))
    .filter((b) => Number.isFinite(b.t) && b.t >= 0)
    .sort((a, b) => a.t - b.t);
}

function run(cmd, args) {
  const result = spawnSync(cmd, args, { encoding: "utf8" });
  if (result.error && result.error.code === "ENOENT") {
    throw new Error(`${cmd} not found on PATH — install FFmpeg (frame QA cannot run without it).`);
  }
  return result;
}

function probe(videoPath) {
  const result = run("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-show_entries", "stream=codec_type,width,height",
    "-of", "json",
    videoPath
  ]);
  if (result.status !== 0) {
    throw new Error(`ffprobe could not read ${videoPath}: ${(result.stderr || "").trim()}`);
  }
  const parsed = JSON.parse(result.stdout);
  const video = (parsed.streams || []).find((s) => s.codec_type === "video");
  if (!video) throw new Error(`${videoPath} has no video stream.`);
  return {
    durationSec: Number.parseFloat(parsed.format?.duration ?? "0"),
    width: video.width,
    height: video.height,
    hasAudio: (parsed.streams || []).some((s) => s.codec_type === "audio")
  };
}

function extractFrame(videoPath, t, outPath) {
  const result = run("ffmpeg", ["-hide_banner", "-y", "-ss", String(t), "-i", videoPath, "-frames:v", "1", outPath]);
  if (result.status !== 0 || !existsSync(outPath)) {
    throw new Error(`frame extraction failed at t=${t}s: ${(result.stderr || "").trim().split("\n").pop()}`);
  }
}

function main(argv) {
  const args = argv.slice(2);
  const videoPath = args.find((a) => !a.startsWith("--"));
  const opt = (name) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : null;
  };
  const flag = (name) => args.includes(`--${name}`);

  if (!videoPath) {
    console.error("Usage: frame-qa.mjs <video.mp4> (--storyboard <STORYBOARD.md> | --times 0,2.5,7) [--mid] [--out <dir>] [--aspect W:H] [--require-audio] [--json]");
    return 2;
  }

  const errors = [];
  const storyboardPath = opt("storyboard");
  let beats = [];
  if (storyboardPath) beats = parseBeats(readFileSync(storyboardPath, "utf8"));
  else if (opt("times")) beats = parseTimes(opt("times"));
  if (beats.length === 0) {
    console.error("No beats found — pass --storyboard with [t=…s d=…s] markers or --times a,b,c.");
    return 2;
  }

  const info = probe(videoPath);
  const outDir = opt("out") ?? join(dirname(videoPath), "frames");
  mkdirSync(outDir, { recursive: true });

  const aspect = opt("aspect");
  if (aspect) {
    const [w, h] = aspect.split(":").map(Number);
    if (w > 0 && h > 0 && Math.abs(info.width / info.height - w / h) > 0.01) {
      errors.push(`aspect mismatch: video is ${info.width}x${info.height}, brief says ${aspect}.`);
    }
  }
  // Audio presence is only a failure when the storyboard promises audio —
  // an unnarrated light-path snippet is legitimately silent.
  if (flag("require-audio") && !info.hasAudio) {
    errors.push("no audio stream — the storyboard's VO/music plan cannot be satisfied by a silent file.");
  }

  const last = beats[beats.length - 1];
  const expectedEnd = last.d === null ? last.t : last.t + last.d;
  if (info.durationSec + DURATION_TOLERANCE_SEC < expectedEnd) {
    errors.push(`truncated render: video ends at ${info.durationSec.toFixed(2)}s but the last beat ends at ${expectedEnd.toFixed(2)}s.`);
  }

  const frames = [];
  for (const [i, beat] of beats.entries()) {
    if (beat.t >= info.durationSec) {
      errors.push(`beat ${i + 1} starts at ${beat.t}s, past the video end (${info.durationSec.toFixed(2)}s).`);
      continue;
    }
    const framePath = join(outDir, `beat-${String(i + 1).padStart(2, "0")}-t${beat.t}s.png`);
    extractFrame(videoPath, beat.t, framePath);
    const entry = { t: beat.t, d: beat.d, framePath, midFramePath: null };
    if (flag("mid") && beat.d !== null) {
      const mid = beat.t + beat.d / 2;
      if (mid < info.durationSec) {
        entry.midFramePath = join(outDir, `beat-${String(i + 1).padStart(2, "0")}-mid-t${mid}s.png`);
        extractFrame(videoPath, mid, entry.midFramePath);
      }
    }
    frames.push(entry);
  }

  const report = { ok: errors.length === 0, video: videoPath, ...info, outDir, beats: frames, errors };
  if (flag("json")) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`${videoPath}: ${info.width}x${info.height}, ${info.durationSec.toFixed(2)}s, audio=${info.hasAudio} — ${frames.length}/${beats.length} beat frames → ${outDir}`);
    for (const e of errors) console.error(`FAIL: ${e}`);
  }
  return errors.length === 0 ? 0 : 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    process.exit(main(process.argv));
  } catch (error) {
    console.error(String(error?.message ?? error));
    process.exit(2);
  }
}
