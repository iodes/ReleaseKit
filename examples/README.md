# Example release content

These fictional notes illustrate the public display contract. They are not release announcements for this toolkit or claims about a shipped product.

- [Korean bundle](release-notes.ko-KR.json)
- [English bundle](release-notes.en-US.json)
- [Original paired illustration, scene, prompts, and review](queue-action/README.md)
- [Independent feature briefs](feature-briefs.yaml): an encryption symbol, a static setting, and a data breakdown

The independent briefs pair each fictional note with a different scene and its correctness constraints. They are authoring examples, separate from the public bundle format. The prompt compiler uses only the selected brief and recipe for each note; they do not inherit the list interaction from the raster example. The briefs do not claim to be generated or reviewed raster assets.

Each bundle contains version 1.4.0 followed by 1.3.0 and 1.2.0. The explicit `previous` links define that order. The `queue-action` note appears in two different version groups because each describes that version's change; consumers retain both entries.

Both locales reference the same selected dark and light PNGs. Choose `image.variants[theme]`, falling back to `image.variants[image.fallbackTheme]` only when the requested variant is absent. Text-only notes use `image: null`. These are content examples; build the surrounding scrolling interface in the consumer application.
