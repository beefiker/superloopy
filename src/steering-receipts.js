import { createHash } from "node:crypto";

const MAX_RECEIPTS = 128;
const RETRY_WINDOW_MS = 30_000;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function steeringRequestKey(payload, directive, nowMs = Date.now()) {
  if (typeof directive.requestId === "string" && /^[A-Za-z0-9._:-]{1,128}$/u.test(directive.requestId)) {
    return `explicit:${directive.requestId}`;
  }
  const turn = typeof payload.turn_id === "string" && payload.turn_id.length > 0
    ? payload.turn_id
    : `window:${Math.floor(nowMs / RETRY_WINDOW_MS)}`;
  return `derived:${hash({
    session: payload.session_id ?? null,
    turn,
    scope: payload.session_id ?? null,
    directive
  })}`;
}

export function findSteeringReceipt(plan, key, nowMs = Date.now()) {
  const receipts = Array.isArray(plan.steeringReceipts) ? plan.steeringReceipts : [];
  return receipts.find((receipt) => receipt.key === key && fresh(receipt, nowMs)) ?? null;
}

export function recordSteeringReceipt(plan, receipt, nowMs = Date.now()) {
  const receipts = Array.isArray(plan.steeringReceipts) ? plan.steeringReceipts : [];
  plan.steeringReceipts = [...receipts.filter((item) => fresh(item, nowMs) && item.key !== receipt.key), receipt]
    .slice(-MAX_RECEIPTS);
}

function fresh(receipt, nowMs) {
  const appliedAt = Date.parse(receipt?.appliedAt);
  return Number.isFinite(appliedAt) && nowMs - appliedAt <= MAX_AGE_MS;
}

function hash(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
