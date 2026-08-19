import { SAMPLE_ORDER } from "./data.generated.mjs";

const VERSION_IDS = ["original", "a", "b", "c"];
const DEFAULT_STATE = Object.freeze({
  sample: "release-note",
  left: "original",
  right: "c",
  mode: "rendered"
});

export const VALID_MODES = Object.freeze(["rendered", "source", "unified"]);

function isValidState(state) {
  return (
    state &&
    SAMPLE_ORDER.includes(state.sample) &&
    VERSION_IDS.includes(state.left) &&
    VERSION_IDS.includes(state.right) &&
    state.left !== state.right &&
    VALID_MODES.includes(state.mode)
  );
}

function normalizedState(state) {
  return isValidState(state) ? { sample: state.sample, left: state.left, right: state.right, mode: state.mode } : { ...DEFAULT_STATE };
}

export function parseViewState(search) {
  const params = new URLSearchParams(search);
  const pairState = {
    left: params.get("left"),
    right: params.get("right"),
    mode: params.get("mode")
  };
  const sample = params.get("sample");

  if (sample === null) {
    return isValidState({ ...pairState, sample: DEFAULT_STATE.sample })
      ? { sample: DEFAULT_STATE.sample, ...pairState }
      : { ...DEFAULT_STATE };
  }

  return normalizedState({ ...pairState, sample });
}

export function serializeViewState(state) {
  const normalized = normalizedState(state);
  const params = new URLSearchParams(normalized);
  return `?${params.toString()}`;
}

export function selectVersion(state, side, versionId) {
  const normalized = normalizedState(state);

  if (!VERSION_IDS.includes(versionId) || !["left", "right"].includes(side)) return normalized;

  const oppositeSide = side === "left" ? "right" : "left";
  if (versionId === normalized[oppositeSide]) {
    return { ...normalized, [side]: versionId, [oppositeSide]: normalized[side] };
  }

  return { ...normalized, [side]: versionId };
}

export function selectSample(state, sampleId) {
  const normalized = normalizedState(state);
  return SAMPLE_ORDER.includes(sampleId) ? { ...normalized, sample: sampleId } : normalized;
}

export function swapVersions(state) {
  const normalized = normalizedState(state);
  return { ...normalized, left: normalized.right, right: normalized.left };
}
