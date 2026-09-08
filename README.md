<div align="center">

<h1>ReleaseKit</h1>

<p><strong>Turn Git changes into visual release notes.</strong></p>
<p>Written with your coding agent. Versioned with your product.</p>

<p>
  <a href="https://www.npmjs.com/package/@iodes/releasekit"><img src="https://img.shields.io/npm/v/@iodes/releasekit?color=4678ED" alt="npm version"></a>
  <a href="https://github.com/iodes/ReleaseKit/actions/workflows/check.yml"><img src="https://github.com/iodes/ReleaseKit/actions/workflows/check.yml/badge.svg" alt="Check workflow status"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-4678ED" alt="License: MIT"></a>
</p>

<p>
  <a href="#quick-start">Quick start</a> &middot;
  <a href="#workflow">Workflow</a> &middot;
  <a href="examples/README.md">Examples</a> &middot;
  <a href="#documentation">Documentation</a>
</p>

</div>

ReleaseKit pairs a deterministic CLI with portable agent skills. Your agent writes the notes and selects or creates images; the CLI collects Git evidence, prepares image requests, validates content, and exports JSON with local assets.

| Dark | Light |
| :---: | :---: |
| ![A blue queue action revealed behind a list row on a charcoal canvas](examples/queue-action/dark.png) | ![The same queue action and list geometry on a light canvas](examples/queue-action/light.png) |

*One scene brief, two theme variants. Fictional feature illustrations. [Browse the composition gallery →](examples/README.md#composition-gallery)*

## Why ReleaseKit?

- **Grounded in Git.** Draft from tags or commits, pin the evidence, and keep each release's changes together.
- **Works with your agent.** Use portable skills for Codex, Claude Code, and Cursor, plus the image tools already available to you.
- **Visuals for your feature.** Generate flat explanations in dark and light, or reuse an approved screenshot, photo, or content image across both viewer themes.
- **Content you own.** Keep Markdown, translations, and images in your repository. Export JSON and local assets for your product to display.

## Quick start

Requires **Git** and **Node.js 22.12+**.

### 1. Install

```sh
npm install -g @iodes/releasekit
```

### 2. Set up your product

Run inside your product's Git repository:

```sh
releasekit init --tools codex,claude,cursor --themes both
```

Choose the tools you use: `codex`, `claude`, `cursor`, or a comma-separated list. New projects use English (`en-US`) as the original language, with no translations enabled until selected. Edit `releasekit/config.yaml` to set your product name, intentional language overrides, and visual settings. Setup prints the skill invocation hints for each tool.

### 3. Ask your agent

Start with the installed `releasekit-draft` skill. Example conversation with a Korean-speaking user, shown here in English, and an image tool available:

```text
You: Use releasekit-draft to draft 1.4.0.
AI:  I'll use English for the original notes. Add Korean, your current
     language, as a translation (recommended), or use English only?
     You can also enter additional languages together.
You: Korean and Japanese translations.
AI:  Found v1.4.0 and its preceding release tag v1.3.0 on this line.
     Created releasekit/releases/1.4.0/
     ✓ Pinned v1.3.0 → v1.4.0 and collected change evidence
     ✓ Wrote English originals with Korean and Japanese translations
     Next: use releasekit-image to prepare images for all drafted notes.
     Choose: Prepare images (recommended), Request copy changes,
     or Finish drafting — save the draft and ask for revisions later.

You: Finish drafting.
AI:  Drafting 1.4.0 is complete. Review releasekit/releases/1.4.0/.
     Ask me here to rewrite a feature description, leave a feature out,
     or add a feature that was missed. I'll update the draft and its
     affected translations. Images and finalization remain pending.

You: Rewrite the queue feature description to explain when to use it.
AI:  Updated that feature description and its Korean and Japanese translations.

You: Prepare images.
AI:  ✓ Generated dark/light explanations from shared scene briefs
     ✓ Reviewed and imported both variants for each generated graphic
     The product-detail image is pending; I need an approved capture
     or photo. Next: provide that image, or review the completed copy
     while it is pending.

You: Use ./approved-capture.png for the product-detail note.
AI:  ✓ Reviewed and imported it once for both viewer themes
     Images for all current notes are ready to review.
     Ask me to revise any feature image or replace it with another image.
     If no image changes are needed, use releasekit-finalize to confirm 1.4.0.

You: Use releasekit-finalize for 1.4.0, then export up to three releases
     in English to ./release-output.
AI:  ✓ Validated notes, translations, and images
     ✓ Marked release 1.4.0 ready
     Exported release-output/
     ├── release-notes.en-US.json ← English notes grouped by release
     └── assets/                  ← Theme variants and shared supplied images
```

The agent resolves the version and Git range from your request, saved releases, repository tags, and release metadata. It reports a clear scope and proceeds without a tag-selection or confirmation step. If inspection leaves materially different scopes, it asks which work to cover in ordinary language. You can still supply explicit refs to select a particular interval.

The draft skill defaults the original language to English and suggests the user's current language for optional translation. Its question accepts additional language names or locale codes through free-text input, as well as an English-only choice. An English-speaking user is not offered a duplicate English translation. Explicit source choices and existing release selections are reused. The selection is saved for that release; future project defaults change only when requested. The draft includes the source and those selected translations. Use the same draft skill later to add a language or refresh translations.

Invoke the skill with `$releasekit-draft` in Codex, `/releasekit-draft` in Claude Code, or the skill picker in Cursor. The agent runs the CLI, generates flat explanations, and requests approved source images when the actual product or content must be shown.

## Adopting ReleaseKit later

You can start after your product has already shipped. Ask the draft skill to set a starting point; it finds a relevant release tag or commit from the repository and asks how to handle the earlier period when that choice is unresolved. Regular notes begin **after** the selected baseline commit.

| Earlier history | Result |
| --- | --- |
| **Product introduction** (recommended for an established product) | A concise overview of capabilities at the baseline, grounded in that snapshot without reconstructing every old commit. |
| **Analyze history** | Notes based on the repository's beginning through the baseline. |
| **Skip** | No earlier entry; start recording subsequent changes. |

An introduction does not assume that adopting ReleaseKit was the product's launch. Version, date, and product claims should reflect the actual product. The agent reuses choices already made in the conversation or saved setup.

For example, introduce the product at `v1.3.0`, then record changes from there:

```sh
releasekit start --at v1.3.0 --past summary --baseline-version 1.3.0
releasekit prepare 1.3.0
# Ask the agent to write, review, and finalize the baseline introduction.
releasekit prepare 1.4.0 --previous 1.3.0 --to v1.4.0
```

Use `--past history` to analyze earlier commits instead. With `--past skip`, omit `--baseline-version`; the first regular `prepare` uses the saved boundary. You can save `HEAD` as the start now and prepare the first draft when later commits exist. Setup pins the SHA, so moving a tag or adding commits cannot shift the boundary.

`start` saves the choice and creates no notes. Summary/history baselines become ordinary draft releases when prepared and follow the same draft (including translations), image, and finalization workflow. They count as one release in exported history; skipping creates no extra group. Existing releases keep their current workflow. See the [first-use guide](kit/references/adoption.md).

## Workflow

```text
Git range → Draft source + translations → Images → Finalize → Optional export
```

| Skill | Purpose |
| --- | --- |
| `releasekit-draft` | Choose a first-use baseline, write and revise source notes and selected translations, or refresh translations alone. |
| `releasekit-image` | Plan, generate or request, review, and import required images. |
| `releasekit-finalize` | Review copy, evidence, translations, and images; validate and mark the release ready; export when requested. |

All three skills use the agent's native question picker when clarification is needed and the tool is available, with free-text input for another answer; otherwise they ask in chat. This covers language choices, image references, translation scope or terminology, and unresolved finalization/export choices. Existing decisions are reused, and routine technical parameters are resolved through repository inspection. Required CLI flags do not become a questionnaire. Once a question is asked, dependent work waits for your submitted answer; a default selection, elapsed time, or a closed picker does not count as a choice. Only one question request may remain unanswered in the conversation: newly discovered questions and next-step choices wait in a queue, even across skills or releases. A partial answer keeps the remaining questions pending. The agent keeps an asynchronous picker open while waiting, or asks in chat if the environment cannot support that wait. Image uploads are requested through the conversation's attachment flow.

After each stage, the agent reports what is complete and recommends the next useful task based on the release's current state. Choose a suggested action or describe another direction to continue in the same conversation. After drafting is complete, **Finish drafting** saves the draft for you to read and request changes from the agent. The handoff includes links and examples of revision requests; the agent edits the same draft and refreshes affected translations when you ask. At other stages, you can stop for now. If you already requested the remaining work, the agent continues without asking again. When source and translations are complete, the next step is images; when required images are complete, it is finalization. Text-only releases go directly to finalization. Completed steps are skipped, and missing images or translations stay visible until resolved.

The agent handles editorial work, media selection, and image generation where appropriate. The CLI handles files, evidence, validation, and export. Finalization includes review and marks local content ready with a content fingerprint. Export is optional; committing, publishing, and displaying it remain separate steps.

<details>
<summary><strong>Step-by-step CLI workflow</strong></summary>

Replace the sample version, Git refs, and note ID with your own. If release `1.3.0` already exists in ReleaseKit, add `--previous 1.3.0` to link its history.

```sh
releasekit prepare 1.4.0 --from v1.3.0 --to v1.4.0
# Save selected languages in release.yaml before adding notes.
# This example uses sourceLocale: en-US and locales: [en-US, ko-KR].
releasekit note add 1.4.0 queue-action

# Write the source and selected translations, then attach evidence.
# Review each translation before marking it current.
releasekit translation mark 1.4.0 queue-action --locale ko-KR

# Complete the visual brief for image work.
# Choose an archetype and set scene.source to generated for this example.
releasekit image plan 1.4.0

# Generate and review the dark image with your agent or an external tool.
releasekit image import 1.4.0 queue-action --theme dark --file ./selected-dark.png

# Plan again to use the accepted dark image as a composition reference.
releasekit image plan 1.4.0
# Generate and review the matching light image, then import it.
releasekit image import 1.4.0 queue-action --theme light --file ./selected-light.png

# Review facts, copy, translations, and selected images, then finalize.
releasekit validate 1.4.0
releasekit finalize 1.4.0

# Export when requested.
releasekit export --out ./release-output
```

- Preparing creates only `release.yaml` with pinned Git boundaries. The agent reads commit history and relevant file diffs from Git as needed.
- Use `--from-root` for an explicitly requested full-history first release.
- `--to` defaults to the pinned SHA when preparing a saved baseline, and to `HEAD` otherwise; `--previous` can supply the comparison start.
- Edit existing drafts in place. `prepare` never overwrites them.
- Notes include images by default. Use `note add --no-image` only for an explicit text-only choice. Adding a note clears any previous `emptyReason`.
- Use `releasekit note remove <version> <id>` to exclude a draft note. It removes the note folder, translations, visual brief, prompts, and unused managed images, including older imports. Images referenced by remaining visuals and source originals are preserved. The result lists removed paths and retained shared assets. Removing the last note leaves the draft pending until you add notes or supply a factual `emptyReason`.
- Add `--json` for structured results or `--cwd` to select a project directory.
- Only `--out` is required for export. Omit `--current` to select the release with no successor in the saved `previous` links; multiple release lines require an explicit `--current`. The selected release must be ready. Omit `--limit` to use `history.limit` from `releasekit/config.yaml` (initially 3).
- Omit `--locale` to export every locale saved in the current release as `release-notes.<locale>.json`, such as `release-notes.en-US.json` and `release-notes.ko-KR.json`. Add `--locale en-US` for only the English file. All files share the same `assets/` directory. Each selected version must contain the requested locales; missing or stale translations stop the export before output is created.
- Export to a new directory; an existing destination is never overwritten. The command result lists generated JSON paths in `files`, the number of version groups in `releases`, and the number of shared image files in `assets`.

See the [agent workflow](kit/references/workflow.md) for ancestry rules and continuing existing releases.

</details>

<details>
<summary><strong>Updating installed skills</strong></summary>

After installing a newer package version, run `releasekit update` in your product repository. It refreshes managed files, preserves user edits, and reports conflicts.

Codex and Cursor share `.agents/skills` to avoid duplicate discovery. Claude Code uses `.claude/skills`.

</details>

## Image themes

Image work covers **every drafted note** by default, including small fixes and improvements. Only an explicit text-only choice omits a note's image. Calling `releasekit-image` again fills missing images, including those for notes added later, and reuses existing valid images. Existing images that need corrections stay pending until the affected revision or replacement is requested.

After generation, review the images and ask the agent to revise anything you dislike or replace it with another approved image. When no image changes are needed and the content is complete, ask for `releasekit-finalize` to confirm the release.

**Generated graphics default to dark and light.** Paired variants share one scene brief, preserving geometry, feature meaning, and semantic colors while presentation surfaces adapt. Images are shared across locales.

Choose `scene.source` in each note's visual brief before planning:

| Source | Use for | Theme handling |
| --- | --- | --- |
| `generated` | Flat glyphs, interface explanations, diagrams, and data graphics supported by the feature. | Separate images for the configured dark/light themes. |
| `provided` | Approved screenshots, photographs, or content artwork. Required for `object-detail` and `editorial-scene`. | One unchanged `shared` asset, or distinct genuine theme captures. |

Choose a single theme during setup with `--themes dark` or `--themes light`, or edit this field in the generated configuration while keeping the other visual settings:

```yaml
# releasekit/config.yaml
visuals:
  themes: both # both | dark | light
```

`releasekit image plan <version>` reports pending and reusable assets, with separate `generationRequests` and `providedRequests` counts. It reuses current imports and never calls a model API. Single-theme exports contain one real asset and an explicit fallback.

To replace or regenerate an image, import the reviewed result with the same release version and note ID and the intended `--theme`. Import automatically switches shared/themed usage and removes the note's unused managed images after saving, including older imports. Files still referenced by visuals and source originals outside the note's managed assets are preserved. Keep existing variant entries until the replacement is imported. Use `--source provided` when replacing generated illustrations with a supplied image, or `--source generated` for the reverse change when the subject permits it; source and selection are saved together. See [image transitions](kit/references/theme-pairing.md#switch-between-shared-and-themed-images).

Requests with `action: generate` include a prompt for the agent or an external tool. Requests with `action: provide` have `promptFile: null` and identify the needed source. Missing supplied media stays pending and blocks finalization; the agent can continue independent writing and translation work.

<details>
<summary><strong>Importing one supplied image for both themes</strong></summary>

Complete the note's visual brief with `scene.source: provided`. This example uses the note ID `product-detail`:

```sh
releasekit image plan 1.4.0

# Once an approved capture or photo is available, inspect it and import.
releasekit image import 1.4.0 product-detail --theme shared --file ./approved-capture.png
```

The CLI keeps the original bytes, dimensions, and colors. One `shared` asset serves both viewer themes without generating or duplicating another file.

If genuine dark/light captures exist, import them with `--theme dark` and `--theme light` instead. The CLI replaces the previous shared/themed selection during import; keep its metadata in place until the new file is successfully registered. A missing configured capture remains a supplied-image request.

Follow the current image plan even if older prompt files remain. See the [supplied-media example](examples/provided-media/README.md) and [media source guide](kit/references/media-sources.md) for pending inputs and older briefs.

</details>

<details>
<summary><strong>Applying changed settings to an existing draft</strong></summary>

Releases capture the project's visual settings when prepared. To apply updated defaults:

```sh
releasekit image plan 1.4.0 --sync-config
```

This preserves selected files and schedules only newly required or stale variants. Reopen ready content first by setting `status: draft` and `contentHash: null` in its `release.yaml`.

</details>

## Content and export

Everything lives alongside your product:

```text
releasekit/
├── config.yaml
└── releases/
    └── 1.4.0/
        ├── release.yaml       # Metadata, note order, previous release
        ├── notes/             # Markdown for each locale
        ├── visuals/           # Scene briefs, media sources, and variants
        ├── prompts/           # Prompts for pending generated variants
        └── assets/            # Selected raster images
```

Releases store the comparison start and end SHAs in `release.yaml`, with relevant paths or commits attached to individual notes. They do not save a full patch or a separate changed-file index. Draft validation reads the pinned Git range, or the baseline snapshot for a product introduction; finalized releases can be validated and exported without Git history.

Export follows explicit `previous` links, keeping each version's notes in a separate group. The default limit is **three releases, including the current one**. Similar notes in different versions remain separate.

The bundle contains display data and relative assets. Git evidence, prompts, and private source paths stay out of the export. Consumers safely render `bodyMarkdown` and select `image.variants[theme]`, falling back to `image.variants[image.fallbackTheme]` when needed. Text-only notes have `image: null`.

`fallbackTheme` can be `dark`, `light`, or `shared`. A shared-image export contains one `image.variants.shared` entry with `fallbackTheme: shared`; the same consumer lookup displays it in either viewer theme. Preserve the supplied image's original appearance when displaying it.

Translations track source fingerprints, and finalized releases record content fingerprints to detect later edits. See the [file contract](kit/references/format.md) and [JSON schemas](schemas) for the full structure.

## Documentation

| Guide | What it covers |
| --- | --- |
| [First use in an existing product](kit/references/adoption.md) | Starting points, product introductions, historical analysis, and skipped history. |
| [Agent workflow](kit/references/workflow.md) | Git boundaries, drafts and translations, images, finalization, and export. |
| [Writing and translation](kit/references/writing.md) | Product copy, evidence, and locale freshness. |
| [Visual language](kit/references/visual-language.md) | Composition, hierarchy, materials, and acceptance checks. |
| [Choosing generated or supplied media](kit/references/media-sources.md) | Source selection, pending captures, and shared assets. |
| [Composition recipes](kit/references/composition-recipes.md) | Eight presentation categories matched to the feature and its source. |
| [Theme pairs and cost](kit/references/theme-pairing.md) | Shared geometry, single-theme policies, and reuse. |
| [File contract](kit/references/format.md) · [JSON schemas](schemas) | Authoring files and the public export format. |
| [Worked examples](examples/README.md) | Paired illustrations, supplied-image workflow, independent briefs, and three-release bundles. |

Visual guidance uses independent, brand-neutral descriptions. Each illustration should communicate the actual feature through its own scene. Worked examples demonstrate the process; each note gets its own composition.

The built-in guidance covers source selection, a scene contract, semantic palette roles, theme-pair invariants, text rules, cost-aware reuse, and visual acceptance checks. Generated icons are compact flat monochrome glyphs. Physical details and content previews use supplied images rather than invented 3D objects or decorative scenes.

## Development

Use **Node.js 24** for development. From a local checkout:

```sh
npm ci
npm run check
npm test
npm run build
npm pack --dry-run
```

CI runs on Windows and Linux with Node.js 22 and 24. Tests cover first-use setup, snapshot summaries, Git ranges, release history, image integrity, theme policies, supplied media and shared assets, translation freshness, finalization, installation conflicts, and CLI behavior.

<details>
<summary><strong>Install from a local checkout</strong></summary>

```sh
npm pack
npm install -g ./iodes-releasekit-0.1.0.tgz
```

Use the tarball filename printed by `npm pack` if the package version differs. Packing builds the package automatically.

</details>

<details>
<summary><strong>Publishing this package</strong></summary>

The [Publish workflow](.github/workflows/publish.yml) runs manually on a `release/x.y.z` branch. The branch selects the major/minor release line and starting patch; all three components must be numeric with no leading zeros.

Once the workflow exists on the default and release branches, open **Actions → Publish → Run workflow** and select the release branch. It pins the selected commit and calculates the next available patch from both Git tags and npm versions. For `release/0.1.0`, publishing starts at `0.1.0` if unused, then advances past the highest existing patch to `0.1.1`, `0.1.2`, and so on. A newer major/minor line blocks older lines, and registry errors stop the workflow.

The runner restores dependencies and updates the package and lockfile with `npm version --no-git-tag-version`; no version-bump commit is needed. The CLI reads that package version for `--version`. After checks, tests, build, and package preview pass, the workflow creates a new tag and publishes through the npm trusted publisher configured for `publish.yml`.

Existing tags are never moved. Every run calculates a fresh version, even for the same commit. If an earlier attempt already created a tag or published a package, rerunning advances to the next patch. Tag pushes do not start publishing.

</details>

## License

[MIT](LICENSE) © 2026 SO, HYEONSEOP.
