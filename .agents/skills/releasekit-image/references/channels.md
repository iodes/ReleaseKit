# Channels and whole-release moves

## First draft and later drafts

Read the request, conversation, config, and existing releases before choosing anything. Channel setup is editorial work performed by the skill; the CLI never prompts.

- With no saved releases and no intentional channel setting, ask whether to use channels. Offer a single history or the initial map below, and accept custom channel names and direct include combinations through free text.
- If language choices are also unresolved, bundle language and channel-use questions in one native question request when supported. After channel use is decided, ask the first draft's target channel only if still unresolved. Keep at most one unanswered request and wait for its answers as described in [the shared question workflow](workflow.md#ask-with-the-native-question-ui).
- Save non-use as `channels: false`, or save the chosen map in `releasekit/config.yaml`, before `prepare`. Preserve unrelated settings. Do not add a separate save-confirmation question.
- Initialization intentionally leaves `channels` absent. Existing projects with saved unchanneled releases and no setting continue their single history without a new first-use prompt. Reuse explicit choices already made in the request, conversation, or config.
- For later new drafts, `channels: false` means no channel question. With a configured map, reuse an explicit target such as “Draft 2.1 for dev”; use the only configured channel when exactly one exists. Otherwise ask which configured channel to write for. Do not infer it merely from the most recent release, version spelling, or Git branch name.
- Existing drafts retain their saved channel, source languages, and Git boundaries. If the same version exists in several channels and the request does not resolve the intended release, ask which release to edit. A request to change the existing channel uses the move workflow below.
- Once a choice is saved, do not ask whether to use channels on every draft. A requested configuration change affects future work and exports; it does not relocate saved releases.
- While a necessary channel answer is pending, do not prepare folders, scaffold notes, or write channel-specific copy. Independent repository inspection may continue. A preselected choice or elapsed wait is not an answer.

Initial channel map, used only when the user selects it:

```yaml
channels:
  prod:
    include: [prod]
  dev:
    include: [dev, prod]
  stage:
    include: [prod]
```

`include` controls viewing, not where a draft belongs. In this example stage can own releases, but the stage view displays prod only. Never automatically add a channel to its own include list. The CLI rejects empty lists, duplicate includes, and unknown referenced names.

Keep the resolved `{ channel, version }` identity through note edits, translations, images, validation, and finalization. Pass `--channel <name>` to each command. Omitting it always addresses the unchanneled history, even when channel settings exist. Avoid presenting CLI argument questions when the actual product choice is already clear.

## Display history and export

All channel releases share one chain of `{ channel, version }` previous references. Channel-free releases retain a separate chain of plain version references. The source tree is `releases/<channel>/<version>/` or `releases/<version>/` respectively. Duplicate versions across channels remain distinct; never deduplicate their notes by title or version.

For example, newest to oldest:

```text
dev/2.1 -> prod/1.1 -> dev/2.0 -> prod/1.0 -> null
```

Export walks that chain without date or version sorting. The dev view above displays all ready entries; prod and stage display only ready prod entries. Excluded channels and unfinished drafts are skipped without stopping traversal. No branch/end-point question is needed: malformed, disconnected, or branching channel histories are errors to repair.

```sh
releasekit export --channel dev --out ./output/dev
releasekit export --channel prod --limit 3 --out ./output/prod
```

Omitting `--limit` exports all matching releases. `--limit N` counts only entries surviving channel/status filtering and limits the combined result, not each channel separately. `history.limit` is removed; if encountered, replace it with an explicit export option only when that limit is requested. `--current` remains available only for unchanneled exports.

The first displayed entry supplies default locales and the current identity. Missing or stale content in selected releases blocks output before files are created. Exported channel `previous` links connect the next included entry and end at null; source references remain unchanged. Files retain `release-notes.<locale>.json`, with channel assets under `assets/<channel>/<version>/`. Re-export to a new directory when rules or membership change.

## Git boundaries

Display ancestry and Git comparison scope are independent for channel releases. `prepare` links to the current global head, even if that head is another channel or a draft. Do not use that entry's commit as the analysis boundary merely because it is the display predecessor.

Choose comparison start from explicit `--from`, the latest saved same-channel release's `source.toSha`, or that channel's saved `history.start`, in that order. Honor a deliberately selected `--from-root`. The CLI pins and checks actual Git ancestry for the comparison interval. If no valid interval is established, inspect the repository and ask only when materially different scopes remain. A different channel's draft does not block finalization.

```sh
releasekit start --channel prod --at v1.0.0 --past summary --baseline-version 1.0.0
releasekit prepare 1.0.0 --channel prod
releasekit prepare 2.1 --channel dev --from <start-ref> --to <end-ref>
```

Channel start settings live at `channels.<name>.history.start`; unchanneled starts remain at `history.start`. A channel baseline can follow another channel in display history. Language defaults still come from current project config for every new draft, not from either predecessor.

`releasedAt` accepts a date or a timestamp including seconds and a timezone (`Z` or UTC offset), with optional milliseconds. New drafts default to current UTC time. Preserve explicitly supplied dates/times and saved values during revisions, finalization, and moves.

## Move whole releases

Use this workflow for requests such as “Move 1.4.0 to dev”, “Move dev 2.0 and 2.1 to prod”, or “Return these releases to the unchanneled history.” Move the complete release, including all notes, languages, briefs, and assets. Do not rewrite copy, regenerate images, duplicate releases, or reinterpret the request as moving individual feature notes.

1. Resolve the source identities and destination from the request and saved files. Ask only if the intended source or destination remains ambiguous. One command selects versions in one source channel (or the unchanneled history) and one destination.
2. Run the move command with `--dry-run`. Inspect paths, affected references, and collisions. Channel-to-channel moves retain global positions automatically. Crossing between channel and unchanneled histories preserves selected relative order and appends at the newest end by default. Use `--after <version-or-channel/version>` or `--at-start` only for a requested alternative insertion point.
3. When the request and placement are clear and preflight succeeds, execute the same command without `--dry-run`; do not add another permission question. A missing destination channel needs explicit configuration. Existing destination versions/files stop the batch; do not overwrite, rename, or merge automatically.
4. Report moved source/destination identities, retained ready/draft status, and updated links/references. Validate the affected ready releases if additional edits occurred. Do not promise that an existing export has changed; export again only when requested.

```sh
releasekit release move 1.4.0 --to-channel dev --dry-run
releasekit release move 1.4.0 --to-channel dev
releasekit release move 2.0 2.1 --from-channel dev --to-channel prod --dry-run
releasekit release move 2.0 2.1 --from-channel dev --to-channel prod
releasekit release move 1.4.0 --from-channel prod --to-unchanneled
```

Use the CLI for the move, not shell folder moves or direct channel-field edits. It preserves original Git SHA boundaries, timestamps, note/translation text, image bytes, and ready/draft status. It checks existing ready fingerprints before updating relocation-related hashes, updates incoming links and managed visual reference paths, preserves stale-image state, and updates existing generated prompts through their generator. Referenced baseline settings move with their baseline unless the destination already has a conflicting start.

The batch preflights before mutation and rolls back on write failures. If rollback itself fails, the error names preserved recovery data; report that exact state and resolve it before attempting another move. Do not mark a partial move successful or blanket-rehash previously modified ready content.
