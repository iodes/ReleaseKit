# Supplied-media example

This is an input-request example, not a rendered asset. [The scene](scene.yaml) selects `object-detail` and `source: provided` without pretending that a product image exists. Put the scene fields under `scene` in a real note's visual file and adapt its message to the actual release.

With no selected image, `releasekit image plan <version>` reports one request with `action: provide`, `theme: shared`, and `promptFile: null`. It reports zero generation requests. The agent looks for an approved project asset or asks for the specific capture or image, then continues independent writing work while waiting. Finalization remains blocked by the missing image.

Once a suitable source is available, inspect it and import it once:

```sh
releasekit image import 1.4.0 product-detail --theme shared --file ./approved-capture.png
```

The shared image retains its native pixels and dimensions. Export contains one `variants.shared` entry and `fallbackTheme: shared`, so the consumer can use it in either viewer theme without duplicate files or recoloring. Actual distinct dark/light captures can instead be imported into the corresponding slots.

The same source route applies to `editorial-scene` for actual content artwork or screenshots. Any other category may also choose `provided` when an authentic capture is the appropriate visual. No stock substitute, fictional model, or decorative illustration is needed to fill a missing input.
