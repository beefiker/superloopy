# Search outage review

On 2026-08-19 the search API returned empty responses for a portion of traffic. Customers were shown an empty result screen even when their query did match documents. The failure lasted 26 minutes in total.

## Timeline

| Time | Status |
| --- | --- |
| 10:12 | Empty responses begin on the search API |
| 10:20 | Dashboard alert fires on the empty response rate |
| 10:31 | The index rebuild job is identified as the cause |
| 10:38 | The job is stopped and responses return to normal |

## What happened

The nightly index rebuild started late and overlapped with morning traffic. While it ran, the search service was reading an index that had only been partially written, so a share of queries matched nothing and came back as an empty result set rather than as a failure.

> The alert fired on the empty response rate, not the error rate, so the on-call engineer was looking at a healthy error graph for the first eight minutes.

## Follow-up

The rebuild now refuses to start when it would overlap the morning window, and the empty response rate has become a paging alert rather than a dashboard-only signal. Both changes are already deployed. The on-call runbook still needs a section on telling an empty result apart from a failed query, and the owner records the result. We will confirm again before the next drill.
