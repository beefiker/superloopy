export const sample = Object.freeze({
  "id": "release-note-en",
  "language": "en",
  "label": "Deployment notice",
  "description": "Heading, paragraphs, list",
  "versions": {
    "original": {
      "id": "original",
      "short": "Original",
      "label": "Original",
      "text": "# Deployment notice for 20 August\n\nWe will be carrying out a deployment of the web service at 3:00 PM on 2026-08-20. This deployment is the work of correcting the search result ordering problem and the list screen display errors that were found during operation. During the deployment window the save function may possibly become slower for a maximum of 5 minutes. Content that has already been written is saved automatically, but before beginning any important input, please take a moment to check the current contents one time.\n\n## Changes\n\n- Corrects the problem where results appeared empty when two or more search filters were selected.\n- Corrects the display problem where dates overlapped when an assignee name was long.\n- Corrects the problem where a selected value could disappear after saving notification settings and returning to the previous screen.\n\n## Verification request\n\nAfter deployment the operations team checks search filters, the list screen, and notification settings in order. Each function is inspected once on a test account and once on a standard permission account. If an error is visible, please record the time it occurred, the browser used, and the screen path, and leave it on the operations channel. If there is no separate announcement, monitoring continues until 4:00 PM the same day. If a save delay occurs, do not repeat the input; first check whether the save status changes. If the same problem appears twice, leave a screen capture. Results are marked per function as normal, needs reproduction, or in progress, and passed to the next shift. For items in progress, also write the owner and the next check time.\n\n## If a problem occurs\n\nIf the same error is confirmed twice, the deployment owner stops further deployment and decides with the operations team whether to roll back to the previous version. That decision and whether a customer announcement is needed are left on the operations channel.\n",
      "metrics": {
        "characters": 1940,
        "words": 319,
        "lines": 17
      },
      "audits": [],
      "notes": []
    },
    "b": {
      "id": "b",
      "short": "B",
      "label": "i-have-adhd",
      "text": "# Deployment notice for 20 August\n\n**When:** 3:00 PM, 2026-08-20\n\nWe are deploying the web service. Saving may be up to 5 minutes slower while it runs. Your work is stored automatically, but check the current contents once before you start anything important.\n\n## Changes\n\n- [Search] Results appeared empty when two or more filters were selected — fixed\n- [List] Dates overlapped when an assignee name was long — fixed\n- [Notifications] A selected value could disappear after saving settings and returning to the previous screen — fixed\n\n## Operations checks\n\n1. Test search filters on a test account and a standard permission account.\n2. Repeat for the list screen and notification settings.\n3. Report anything broken with the time, the browser used, and the screen path.\n\nWithout a separate announcement, monitoring continues until 4:00 PM the same day. If saving lags, wait for the status to change instead of submitting again. A capture helps once something shows up twice. Results are marked per function as normal, needs reproduction, or in progress, and passed to the next shift.\n\n**If a problem occurs:** Two confirmed sightings of one error stop further deployment. For items in progress, also write the owner and the next check time. Whether to roll back to the previous version is decided with the operations team, and that decision and whether a customer announcement is needed are left on the operations channel.\n",
      "metrics": {
        "characters": 1426,
        "words": 235,
        "lines": 21
      },
      "audits": [],
      "notes": []
    },
    "c": {
      "id": "c",
      "short": "C",
      "label": "Say It Straight",
      "text": "# Deployment notice for 20 August\n\nWe deploy the web service at 3:00 PM on 2026-08-20. It corrects the search result ordering problem and the list screen display errors found during operation. Saving may be up to 5 minutes slower during the deployment window. Written content is stored automatically, but check the current contents once before starting important input.\n\n## Changes\n\n- Fixes results appearing empty when two or more search filters are selected.\n- Fixes dates overlapping when an assignee name is long.\n- Fixes a selected value disappearing after saving notification settings and returning to the previous screen.\n\n## Verification request\n\nThe operations team checks search filters, the list screen, and notification settings on a test account and a standard permission account. Report any error with the time it occurred, the browser used, and the screen path on the operations channel. Without a separate announcement, monitoring continues until 4:00 PM the same day. If saving lags, wait for the status to change rather than submitting again. Capture the screen once a problem appears twice. Results are marked per function as normal, needs reproduction, or in progress, and passed to the next shift. For items in progress, also write the owner and the next check time.\n\n## If a problem occurs\n\nTwo confirmed sightings of the same error stop further deployment. Whether to roll back to the previous version is decided with the operations team. That decision and whether a customer announcement is needed are left on the operations channel.\n",
      "metrics": {
        "characters": 1558,
        "words": 251,
        "lines": 17
      },
      "audits": [],
      "notes": []
    }
  }
});
