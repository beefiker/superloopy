# Search outage review

**Date:** 2026-08-19
**Impact:** empty search results for part of traffic
**Duration:** 26 minutes

## Timeline

| Time | Status |
| --- | --- |
| 10:12 | Empty responses begin on the search API |
| 10:20 | Dashboard alert fires on the empty response rate |
| 10:31 | The index rebuild job is identified as the cause |
| 10:38 | The job is stopped and responses return to normal |

## What happened

The nightly index rebuild started late and ran into morning traffic. The search service read a half-written index. Queries matched nothing. Customers got an empty result screen instead of an error.

> The alert fired on the empty response rate, not the error rate, so the on-call engineer was looking at a healthy error graph for the first eight minutes.

## Follow-up

**Done:** the rebuild refuses to start if it would overlap the morning window. The empty response rate now pages instead of sitting on a dashboard.

**Open:** the on-call runbook needs a section on telling an empty result apart from a failed query, and the owner records the result. We will confirm again before the next drill.
