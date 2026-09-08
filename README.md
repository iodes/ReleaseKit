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

Choose the tools you use: `codex`, `claude`, `cursor`, or a comma-separated list. Then edit `releasekit/config.yaml` to set your product name, source language, locales, and visual settings. Setup prints the skill invocation hints for each tool.

### 3. Ask your agent

Start with the installed `releasekit-draft` skill. Example conversation with an image tool available:

```text
You: Use releasekit-draft to draft 1.4.0 from v1.3.0 to v1.4.0.
     Write Korean and English notes.
AI:  Created releasekit/releases/1.4.0/
     ✓ Pinned the Git range and collected change evidence
     ✓ Wrote release notes in ko-KR and en-US

You: Add images for the notes.
AI:  ✓ Generated dark/light explanations from shared scene briefs
     ✓ Reviewed and imported both variants for each generated graphic
     The product-detail image is pending; I need an approved capture
     or photo. Translation work can continue while it is pending.

You: Use ./approved-capture.png for the product-detail note.
AI:  ✓ Reviewed and imported it once for both viewer themes

You: Review and finalize 1.4.0, then export up to three releases
     in English to ./release-output.
AI:  ✓ Validated notes, translations, and images
     ✓ Marked release 1.4.0 ready
     Exported release-output/
     ├── release-notes.json   ← Notes grouped by release
     └── assets/             ← Theme variants and shared supplied images
```

Invoke the skill with `$releasekit-draft` in Codex, `/releasekit-draft` in Claude Code, or the skill picker in Cursor. The agent runs the CLI, generates flat explanations, and requests approved source images when the actual product or content must be shown.

## Workflow

```text
Git range → Release draft → Notes + images + translations → Validate → Export
```

| Skill | Purpose |
| --- | --- |
| `releasekit-draft` | Create or revise notes from a Git range. |
| `releasekit-image` | Plan, generate or request, review, and import images. |
| `releasekit-translate` | Translate notes and track source freshness. |
| `releasekit-review` | Review content, evidence, images, and release readiness. |

The agent handles editorial work, media selection, and image generation where appropriate. The CLI handles files, evidence, validation, and export. Finalizing a release marks local content ready; committing, publishing, and displaying it remain separate steps.

<details>
<summary><strong>Step-by-step CLI workflow</strong></summary>

Replace the sample version, Git refs, and note ID with your own. If release `1.3.0` already exists in ReleaseKit, add `--previous 1.3.0` to link its history.

```sh
releasekit prepare 1.4.0 --from v1.3.0 --to v1.4.0
releasekit note add 1.4.0 queue-action

# Fill the notes, evidence references, and visual brief.
# Choose an archetype and set scene.source to generated for this example.
releasekit image plan 1.4.0

# Generate and review the dark image with your agent or an external tool.
releasekit image import 1.4.0 queue-action --theme dark --file ./selected-dark.png

# Plan again to use the accepted dark image as a composition reference.
releasekit image plan 1.4.0
# Generate and review the matching light image, then import it.
releasekit image import 1.4.0 queue-action --theme light --file ./selected-light.png

# Review the completed translation before marking it current.
releasekit translation mark 1.4.0 queue-action --locale en-US
releasekit validate 1.4.0
releasekit finalize 1.4.0
releasekit export --current 1.4.0 --limit 3 --locale ko-KR --out ./release-output
```

- Use `--from-root` for an explicitly requested full-history first release.
- `--to` defaults to `HEAD`; `--previous` can supply the comparison start.
- Edit existing drafts in place. `prepare` never overwrites them.
- Use `note add --no-image` for an intentionally text-only note.
- Add `--json` for structured results or `--cwd` to select a project directory.
- Export to a new directory; an existing destination is never overwritten.

See the [agent workflow](kit/references/workflow.md) for ancestry rules and continuing existing releases.

</details>

<details>
<summary><strong>Updating installed skills</strong></summary>

After installing a newer package version, run `releasekit update` in your product repository. It refreshes managed files, preserves user edits, and reports conflicts.

Codex and Cursor share `.agents/skills` to avoid duplicate discovery. Claude Code uses `.claude/skills`.

</details>

## Image themes

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

If genuine dark/light captures exist, import them with `--theme dark` and `--theme light` instead. A note must use either `shared` or themed entries; remove the previous variant entries when switching. A missing configured capture remains a supplied-image request.

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
        ├── evidence.json      # Pinned Git evidence
        ├── changes.patch      # Net change for this release
        ├── notes/             # Markdown for each locale
        ├── visuals/           # Scene briefs, media sources, and variants
        ├── prompts/           # Prompts for pending generated variants
        └── assets/            # Selected raster images
```

Export follows explicit `previous` links, keeping each version's notes in a separate group. The default limit is **three releases, including the current one**. Similar notes in different versions remain separate.

The bundle contains display data and relative assets. Git evidence, prompts, and private source paths stay out of the export. Consumers safely render `bodyMarkdown` and select `image.variants[theme]`, falling back to `image.variants[image.fallbackTheme]` when needed. Text-only notes have `image: null`.

`fallbackTheme` can be `dark`, `light`, or `shared`. A shared-image export contains one `image.variants.shared` entry with `fallbackTheme: shared`; the same consumer lookup displays it in either viewer theme. Preserve the supplied image's original appearance when displaying it.

Translations track source fingerprints, and finalized releases record content fingerprints to detect later edits. See the [file contract](kit/references/format.md) and [JSON schemas](schemas) for the full structure.

## Documentation

| Guide | What it covers |
| --- | --- |
| [Agent workflow](kit/references/workflow.md) | Git boundaries, drafts, review, and export. |
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

CI runs on Windows and Linux with Node.js 22 and 24. Tests cover Git ranges, release history, image integrity, theme policies, supplied media and shared assets, translation freshness, finalization, installation conflicts, and CLI behavior.

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
