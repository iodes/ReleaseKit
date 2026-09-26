---
title: Minor Improvements
alt: A wrench symbol representing minor improvements
sourceHash: null
---

- Skill updates distinguish completed updates, already-current skills, preserved-file conflicts, skipped updates, and failures, with file counts and next steps.
- Older or invalid release settings no longer block skill updates when the product name and tool selection are valid. Updates leave the configuration untouched; content commands still require valid settings.
- Run `releasekit init` again to change the selected agent tools while retaining the project's other settings.
- Open a local preview of a chosen release with `releasekit preview <version>`.
- Exports now include the entire linked release history by default. Use `--limit N` to cap the count. Existing configurations must remove the obsolete `history.limit` setting before running content commands.
- Release dates can include a time and timezone, allowing releases on the same day to retain their recorded times.
