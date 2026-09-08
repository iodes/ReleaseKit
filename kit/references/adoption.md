# First use in an existing product

Read this when a product has no ReleaseKit releases and the author is choosing where to start. Resolve the likely baseline through [repository inspection](workflow.md#resolve-release-scope-from-the-repository) before asking; a clear inferred tag interval does not require confirmation. Setup has two separate decisions: the baseline commit, and how to present the product's earlier history. A baseline is the end of the earlier period; regular change notes begin **after** it. Choosing a tag does not mean starting at the commit that created that tag's features.

Read existing releases and `history.start` in the project config first. Reuse a saved selection when continuing setup. Existing releases use their explicit `previous` links. An explicitly limited Git interval or a requested full-history release already establishes the work's scope; do not add retrospective work or repeat that choice. For first-use requests with unresolved scope, gather the missing decisions using the workflow's [native question UI](workflow.md#ask-with-the-native-question-ui). Follow [the answer-waiting procedure](workflow.md#wait-for-the-users-answer) after asking. Independent inspection may continue while answers are pending, but do not save an unconfirmed choice or draft dependent copy.

## Choose the baseline

Resolve the intended end ref to an immutable commit before inspecting candidates. Find release tags reachable from that commit, for example with `git for-each-ref --merged=<endSha> --sort=-creatordate --format='%(refname:short)' refs/tags`. Inspect candidate commit dates and subjects, and report the selected baseline, or show a small relevant set with each tag and its resolved short SHA only when the intended starting point remains ambiguous. A tag's creation date or version-string order alone does not establish the correct release line or whether it is a stable release.

Suggest the last shipped tag before the first release the author wants to document, when the product's release history supports that choice. If they want to start recording future changes now, offer the current commit. If no suitable tags exist, use recent commits from `git log -n 8 --format='%h %cs %s' <endSha> --` and allow an explicit commit or tag through free-text input. Do not choose the repository's first commit merely because no notes exist.

Explain the boundary in the user's language: “With v1.3.0 as the baseline, regular notes cover changes after v1.3.0. The baseline itself belongs to the earlier-history choice.” If they want a selected commit's change included in the first regular interval, resolve a suitable preceding boundary on that release line; use full history when the root commit itself must be included. Verify ancestry and avoid guessing a merge parent.

## Choose what to do with earlier history

Offer these distinct choices, with product introduction first as a recommendation for an established product unless the request suggests otherwise:

| Choice | What the agent writes | Git work |
| --- | --- | --- |
| Product introduction (`summary`) | A concise introduction to the product and its main capabilities at the baseline. | Read supporting files at the pinned baseline. Do not reconstruct the sequence of old commits. |
| Analyze earlier history (`history`) | Evidence-based notes covering the repository's beginning through the baseline. | Inspect that history and the final state; exclude reverted or removed behavior from claims about what is available. |
| Start with future changes (`skip`) | No earlier-history entry. The first regular release starts after the baseline. | Save the boundary now; inspect the next requested interval when it exists. |

A generic introduction is an editorial format, not permission to invent a launch, availability date, features, or broad improvement claims. “Product overview” is appropriate for retrospective adoption. Use “Initial release” or “App launch” only when the user or reliable product evidence establishes that event at this baseline. Keep the introduction useful and grounded even when the author does not want historical analysis. Request missing product facts instead of finalizing placeholder copy.

For summary or history, identify the baseline's display version and date. Reuse a known product version or ask for a meaningful entry ID; do not invent historical version numbers. `prepare --date` sets the displayed date and otherwise defaults to the current UTC date. A Git commit or tag date is not automatically the product's release date. Language choices follow [the normal workflow](workflow.md#choose-languages) and can be collected with these decisions.

## Save and draft

After resolving the choices, save them once. These examples are alternatives, not commands to run together:

```sh
# Product introduction at v1.3.0, then regular changes after it.
releasekit start --at v1.3.0 --past summary --baseline-version 1.3.0
releasekit prepare 1.3.0
# Write, translate, review, and finalize the baseline content.
releasekit prepare 1.4.0 --previous 1.3.0 --to v1.4.0

# Analyze the repository's beginning through v1.3.0 as one baseline release.
releasekit start --at v1.3.0 --past history --baseline-version 1.3.0
releasekit prepare 1.3.0

# Keep only future changes. This setup also works when HEAD is the baseline.
releasekit start --at v1.3.0 --past skip
releasekit prepare 1.4.0 --to v1.4.0
```

`start` saves the ref, immutable SHA, mode, and optional baseline version in `config.yaml`; it creates no notes. It requires a project without releases and preserves an existing setup. Summary and history require `--baseline-version`; skip has no baseline release or version. Complete shallow history before setup; the CLI does not fetch or check out anything.

For summary or history, preparing the saved baseline version uses its pinned SHA even when HEAD or the original tag has moved. It sets `initialContent` on that release. An explicit conflicting `--to` is rejected. Preparation writes only a draft manifest; the agent still needs to write the content. If that baseline is the only release, the next preparation can infer it as the previous release; explicit `--previous` makes the intended lineage clear.

For skip, the first preparation without an explicit start uses the saved SHA. If there is no later commit yet, keep setup complete and the draft pending until a nonempty requested interval exists. Do not invent an empty release, move the baseline, or create a launch entry. Later releases use `--previous` or explicit boundaries, so the saved start is not reused across every future release. Explicit ranges remain available for intentionally different release lines.

In a summary, attach supporting tracked paths from the baseline snapshot or the baseline SHA itself to each note. Older commits, removed files, later files, and working-tree changes are outside summary evidence. For historical analysis, attach paths or commits within the full pinned range using the normal writing guide. Summaries and analyzed baselines use the same draft (including translations), image, and finalization workflow as other releases, with export when requested; neither mode automatically marks content ready.

Keep the baseline and subsequent release changes in separate groups linked through `previous`. The baseline is one exportable version and counts toward the requested history limit. Skip adds no group. A separately requested reconstruction of individual older versions should use explicit per-version ranges and `previous` links instead of combining those releases into one baseline.
