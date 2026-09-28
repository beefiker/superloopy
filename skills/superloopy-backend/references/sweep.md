# Sweep — deciding each candidate route

Load this only from the "Repair the class" section, once the diff-anchored enumeration has produced
its candidates.
Every disposition here is decided by a command's output, never by reasoning about intent.
A candidate that no command can classify takes the last row, not a guess.

| Does your change make it worse? (run this site with the reproduction's input at the base commit, and with your change using the input the change now requires or accepts in its place — the same input when the change alters no input; compare what the site emits: log lines, responses, stored values, errors) | Does it reach the defect? (run the reproduction, or its equivalent input, through this site) | Was it correct before? (run this site's existing test, or the invariant, at the base commit) | Disposition |
|---|---|---|---|
| yes — with the change the site emits, and at base did not, one of: a caller-supplied secret or credential where a constant or nothing was; data a project rule you can cite by file and line bans from this log, response or store; a write, or a response carrying protected data, made without a guard that ran ahead of this site at base. A new value no cited rule bans at this site is not worse, and neither is an early rejection with no data or write: take the next column. | — | — | **Repair here, in this change**, with a case that fails without it. The worsening is a defect this change ships, whether or not the site was already wrong. |
| no | yes — the symptom reproduces here | — | **Repair here, in this change**, with a case that fails without it. |
| no | no | yes — its current behavior is right | **Pin it.** Add the assertion that locks its present behavior, or carry a filed follow-up id. Do not rewrite shared code under it; if the shared code must change, route the repair so this site keeps its behavior. |
| no | no | no — it is wrong in a different way | **Out of scope.** Pin it the same way; a note is not a discharge. |
| cannot run the check that decides it | | | **Record as unverified** in the receipt, name the command that would decide it, and do not touch it. |

When filing the follow-up needs authority you do not have (an issue-tracker write the user has not
approved), draft it and list it under blockers in the final answer so the user files or overrules
it; the receipt row cites the draft as `blocked`. The assertion that locks present behavior is still
added wherever one is safe to write.

The count is checkable: if the diff changes N symbols and the `routes_into_the_mechanism` field has
fewer than N rows, the enumeration is not finished.
