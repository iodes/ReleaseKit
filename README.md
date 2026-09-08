# ReleaseKit

Git-based visual release notes, written with your coding agent and stored with your product.

ReleaseKit provides a deterministic CLI, portable agent skills, an original visual language, and versioned content files. Your agent writes the copy and uses its available image tools. The CLI prepares Git evidence, compiles image prompts, validates artifacts, and exports JSON with local assets.

## Project image policy

Dark **and** light illustrations are recommended by default. Choose one theme when generation cost matters more than providing a dedicated variant for both viewer themes:

```yaml
# releasekit/config.yaml
visuals:
  themes: both # both | dark | light
```

This edits one field in the complete generated config; keep the other visual settings. You can also select the policy at setup with `releasekit init --themes light`.

One scene brief drives both variants. Object positions, scale, crop, interaction state, and semantic colors stay consistent while presentation surfaces and lighting adapt. Single-theme exports contain one real asset and an explicit fallback, without inventing a second variant. Images are shared across locales.

`releasekit image plan <version>` reports pending and reusable asset counts before any image generation. It never calls a model API. Previously imported current assets are reused. If image generation is unavailable, the prompts remain available for an external tool.

## Local setup

Requires Git and Node.js 22.12 or later. Node.js 24 is recommended for development.

```sh
npm install
npm run build
npm pack
npm install -g ./iodes-releasekit-0.1.0.tgz
```

The package can be built and installed locally; no public registry publication is required. In the product's Git repository:

```sh
releasekit init --tools codex,claude,cursor --themes both
```

Codex and Cursor share a single project skill tree to avoid duplicate discovery. Claude Code receives its project skill tree. Installation prints invocation hints. `releasekit update` refreshes owned files, preserves user edits, and reports conflicts.

## Agent workflow

Ask your agent to use `releasekit-draft` to create notes between two tags or commits. Include the desired release version. For example:

> Prepare release 1.4.0 from v1.3.0 to v1.4.0. Write Korean and English notes, create the configured image variants, and export the latest three releases.

The installed skills are `releasekit-draft`, `releasekit-image`, `releasekit-translate`, and `releasekit-review`. They use the CLI rather than implementing Git parsing or asset bookkeeping again.

```sh
releasekit prepare 1.4.0 --from v1.3.0 --to v1.4.0 --previous 1.3.0
releasekit note add 1.4.0 queue-action
# Fill the note files, evidence references, and shared visual brief.
releasekit image plan 1.4.0
# Generate externally or through the agent's image tool, then select the files.
releasekit image import 1.4.0 queue-action --theme dark --file ./selected-dark.png
releasekit image import 1.4.0 queue-action --theme light --file ./selected-light.png
# Review the completed translation before marking it current.
releasekit translation mark 1.4.0 queue-action --locale en-US
releasekit validate 1.4.0
releasekit finalize 1.4.0
releasekit export --current 1.4.0 --limit 3 --locale ko-KR --out ./release-output
```

Use `--from-root` for an explicitly requested full-history first release. `--to` defaults to `HEAD`, and `--previous` can supply the default comparison start. Existing drafts are edited in place; `prepare` does not overwrite them. `--json` provides structured results, and `--cwd` selects a project working directory.

There is no built-in model API, viewer, hosted database, automatic Git commit, or publishing step.

## Visual guidance

The built-in guidance goes beyond a style adjective. It includes eight composition recipes, feature-to-image selection, a scene contract, semantic palette roles, theme-pair invariants, text rules, cost-aware reuse, external generation handoff, and visual acceptance checks.

- [Visual language](kit/references/visual-language.md)
- [Composition recipes](kit/references/composition-recipes.md)
- [Theme pairs and cost](kit/references/theme-pairing.md)
- [Writing and translation](kit/references/writing.md)
- [Original dark/light example and three-version bundles](examples/README.md)

All shipped guidance uses independent, brand-neutral descriptions. Product-specific imagery should depict the user's actual feature. Reference-company identities, attributed style labels, copied artwork, and unrelated product silhouettes do not belong in briefs or generated output.

## Version and file contract

Each release stores its own changes and an explicit `previous` release link. Export follows that chain, keeping the current version and the configured number of preceding versions in separate groups. The default count is three including current. Version strings are not sorted to infer ancestry, and similar notes in separate versions are retained.

Content uses YAML metadata, Markdown locale files, image briefs and prompts, and local raster assets. Git boundaries are pinned to immutable commits. Notes carry evidence, and translations carry source fingerprints. A ready release has a content fingerprint so later edits are detected.

Project visual defaults are captured when a release is prepared. To apply changed project settings to an existing draft:

```sh
releasekit image plan 1.4.0 --sync-config
```

This preserves selected files and schedules only the newly required or stale variants. Ready content must first be reopened with `status: draft` and `contentHash: null`.

See [the file contract](kit/references/format.md) and the generated [JSON schemas](schemas). Export contains display data and relative assets, excluding Git evidence, prompts, and private source paths. Consumers select `image.variants[theme]` or `image.variants[image.fallbackTheme]` and safely render `bodyMarkdown`.

## Development checks

```sh
npm run check
npm test
npm run build
npm pack --dry-run
```

Tests cover pinned Git ranges, reverted changes, branched release history, theme scheduling, asset integrity, single-theme fallback, stale translations, finalized content edits, installation conflicts, and command-line behavior. CI runs on Windows and Linux with Node.js 22 and 24.

MIT licensed.
