import { SAMPLE_ORDER, SAMPLES, VERSION_ORDER } from "./data.generated.mjs";

// Derived, not restated: a third hand-written copy of the version list meant a
// new version would be silently rejected here.
const VERSION_IDS = VERSION_ORDER;
const DEFAULT_STATE = Object.freeze({
  sample: SAMPLE_ORDER[0],
  left: "original",
  right: VERSION_IDS.at(-1),
  mode: "rendered"
});

// A sample may omit a version, so "this id exists" is not the same as
// "this sample has it".
function sampleHasVersion(sampleId, versionId) {
  return Boolean(SAMPLES[sampleId]?.versions?.[versionId]?.text);
}

function firstAvailableVersion(sampleId, exclude) {
  return VERSION_IDS.find((id) => id !== exclude && sampleHasVersion(sampleId, id)) ?? null;
}

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
  if (!SAMPLE_ORDER.includes(sampleId)) return normalized;

  // Carry the pair over only where it exists in the target sample. English
  // samples have no Humanize Korean version, so keeping `a` would land the
  // user on the error panel with a disabled option selected.
  let left = sampleHasVersion(sampleId, normalized.left) ? normalized.left : null;
  let right = sampleHasVersion(sampleId, normalized.right) ? normalized.right : null;
  left ??= firstAvailableVersion(sampleId, right);
  right ??= firstAvailableVersion(sampleId, left);

  if (!left || !right || left === right) return { ...normalized, sample: sampleId };
  return { ...normalized, sample: sampleId, left, right };
}

export function swapVersions(state) {
  const normalized = normalizedState(state);
  return { ...normalized, left: normalized.right, right: normalized.left };
}
