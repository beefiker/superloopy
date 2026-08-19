# Search outage review

On 2026-08-19 the search API returned empty responses for part of its traffic. Customers saw an empty result screen even when their query matched documents. The failure lasted 26 minutes.

## Timeline

| Time | Status |
| --- | --- |
| 10:12 | Empty responses begin on the search API |
| 10:20 | Dashboard alert fires on the empty response rate |
| 10:31 | The index rebuild job is identified as the cause |
| 10:38 | The job is stopped and responses return to normal |

## What happened

The nightly index rebuild started late and overlapped morning traffic. While it ran, the search service read a partially written index, so a share of queries matched nothing and returned an empty result set rather than a failure.

> The alert fired on the empty response rate, not the error rate, so the on-call engineer was looking at a healthy error graph for the first eight minutes.

## Follow-up

The rebuild now refuses to start when it would overlap the morning window, and the empty response rate pages rather than sitting on a dashboard. Both changes are deployed. The on-call runbook still needs a section on telling an empty result apart from a failed query, and the owner records the result. We will confirm again before the next drill.
