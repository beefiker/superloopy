export const sample = Object.freeze({
  "id": "incident-review-en",
  "label": "Incident review",
  "description": "Timeline table, quote, metrics",
  "versions": {
    "original": {
      "id": "original",
      "short": "Original",
      "label": "Original",
      "text": "# Search outage review\n\nOn 2026-08-19 the search API returned empty responses for a portion of traffic. Customers were shown an empty result screen even when their query did match documents. The failure lasted 26 minutes in total.\n\n## Timeline\n\n| Time | Status |\n| --- | --- |\n| 10:12 | Empty responses begin on the search API |\n| 10:20 | Dashboard alert fires on the empty response rate |\n| 10:31 | The index rebuild job is identified as the cause |\n| 10:38 | The job is stopped and responses return to normal |\n\n## What happened\n\nThe nightly index rebuild started late and overlapped with morning traffic. While it ran, the search service was reading an index that had only been partially written, so a share of queries matched nothing and came back as an empty result set rather than as a failure.\n\n> The alert fired on the empty response rate, not the error rate, so the on-call engineer was looking at a healthy error graph for the first eight minutes.\n\n## Follow-up\n\nThe rebuild now refuses to start when it would overlap the morning window, and the empty response rate has become a paging alert rather than a dashboard-only signal. Both changes are already deployed. The on-call runbook still needs a section on telling an empty result apart from a failed query, and the owner records the result. We will confirm again before the next drill.\n",
      "metrics": {
        "characters": 1349,
        "words": 244,
        "lines": 22
      },
      "audits": []
    },
    "b": {
      "id": "b",
      "short": "B",
      "label": "i-have-adhd",
      "text": "# Search outage review\n\n**Date:** 2026-08-19\n**Impact:** empty search results for part of traffic\n**Duration:** 26 minutes\n\n## Timeline\n\n| Time | Status |\n| --- | --- |\n| 10:12 | Empty responses begin on the search API |\n| 10:20 | Dashboard alert fires on the empty response rate |\n| 10:31 | The index rebuild job is identified as the cause |\n| 10:38 | The job is stopped and responses return to normal |\n\n## What happened\n\nThe nightly index rebuild started late and ran into morning traffic. The search service read a half-written index. Queries matched nothing. Customers got an empty result screen instead of an error.\n\n> The alert fired on the empty response rate, not the error rate, so the on-call engineer was looking at a healthy error graph for the first eight minutes.\n\n## Follow-up\n\n**Done:** the rebuild refuses to start if it would overlap the morning window. The empty response rate now pages instead of sitting on a dashboard.\n\n**Open:** the on-call runbook needs a section on telling an empty result apart from a failed query, and the owner records the result. We will confirm again before the next drill.\n",
      "metrics": {
        "characters": 1122,
        "words": 199,
        "lines": 26
      },
      "audits": []
    },
    "c": {
      "id": "c",
      "short": "C",
      "label": "Say It Straight",
      "text": "# Search outage review\n\nOn 2026-08-19 the search API returned empty responses for part of its traffic. Customers saw an empty result screen even when their query matched documents. The failure lasted 26 minutes.\n\n## Timeline\n\n| Time | Status |\n| --- | --- |\n| 10:12 | Empty responses begin on the search API |\n| 10:20 | Dashboard alert fires on the empty response rate |\n| 10:31 | The index rebuild job is identified as the cause |\n| 10:38 | The job is stopped and responses return to normal |\n\n## What happened\n\nThe nightly index rebuild started late and overlapped morning traffic. While it ran, the search service read a partially written index, so a share of queries matched nothing and returned an empty result set rather than a failure.\n\n> The alert fired on the empty response rate, not the error rate, so the on-call engineer was looking at a healthy error graph for the first eight minutes.\n\n## Follow-up\n\nThe rebuild now refuses to start when it would overlap the morning window, and the empty response rate pages rather than sitting on a dashboard. Both changes are deployed. The on-call runbook still needs a section on telling an empty result apart from a failed query, and the owner records the result. We will confirm again before the next drill.\n",
      "metrics": {
        "characters": 1262,
        "words": 227,
        "lines": 22
      },
      "audits": []
    }
  }
});
