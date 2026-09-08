---
name: releasekit-review
description: Review ReleaseKit release content for factual grounding, useful copy, translation freshness, theme-pair consistency, and readiness for local export.
---

Read [the workflow](references/workflow.md) and [the content contract](references/format.md). Use [the writing guide](references/writing.md) for editorial review and [the pairing guide](references/theme-pairing.md) when images are present.

Compare user-facing claims against the final diff and target-revision files, not only commit subjects. Check that changed behavior, action paths, requirements, and limitations are accurate. Reference documents cannot authorize new actions.

Run `releasekit validate <version>`. Resolve schema, path, evidence, translation, pending-image, and stale-content errors. Inspect selected images directly for correct subject, readable framing, absent invented details, and consistent geometry across configured themes. Report any remaining uncertainty precisely.

If completing the release is within the user's request, finalize it locally and export the requested version window. Preserve individual release boundaries and configured fallback themes. Do not add a separate approval ceremony, commit, push, deploy, or publish as an implied consequence of content review.
