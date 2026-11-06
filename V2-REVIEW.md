# Laced Notes V2 review: controlled feature branch

> This is an implementation branch, **not** a production release. GitHub Pages continues to publish the `main` branch. Do not merge before reviewing the data safeguards and testing on an iPad.

## What was implemented

- Official visible names: Blueprints, New Spark, Constellations, Wordverse, Crosswire, Outtakes, Calibration, Wardrobe, The Circuits, Cluster, Imagine, Bloom, Ignite and Ascend.
- Canvas-first adaptive interface with Focus, Explore and Expanded modes and a temporary tool workspace for iPad portrait and narrow mobile layouts.
- The five stage editors have independent storage in V2. Bloom is new and does **not** pretend that the old Seed concept textarea contains language data.
- Wordverse preserves word collections; Constellations preserves custom categories, and the global template is updated when defaults are removed so new Blueprints do not restore removed choices.
- Crosswire: concept collision scaffold, refrain-reversal scaffold, and text statistics diagnostic. The first two **require creative input from the writer** and do not claim generative AI.
- Outtakes: named deliberate captures, comparisons, copy, rename, delete and explicit restore, with a new recoverable snapshot of the current stage before replacement.
- Calibration includes Wardrobe. All seven V1 themes and Chalkboard, After Hours, and the combination are available.
- The Circuits includes creation, renaming, duplication, deletion, text export, JSON backup and import.
- Revised PWA cache version includes the new static assets.

## What was intentionally preserved

The old `index.html` V1 implementation remains in place as a hidden fallback. V2 is loaded through `studio-v2.js` and `studio-v2.css`, isolating the upgraded app from the prior implementation.

On first launch, V2 reads `laced-notes-v1` and imports its projects into `laced-notes-v2` without deleting or overwriting the V1 key. Old stage IDs are mapped as follows:

| V1 storage | V2 result |
| --- | --- |
| `stages.collect` | `stages.cluster` |
| `stages.ideate` | `stages.imagine` |
| `stages.seed` | `legacySeed` displayed in Imagine |
| `stages.start` | `stages.ignite` |
| `stages.iterate` | `stages.ascend` |
| `scratch` | `legacyScratch` displayed in Outtakes |
| `words`, `palette` | Wordverse and Constellations collections |

V2's `stages.bloom` begins empty, deliberately. No old writing is relabeled as a new kind of content.

## Verification status

### Automated checks

Code syntax and static asset references were checked. Migration logic was exercised with populated V1 data, including user categories, old Seed writing and scratch notes. The branch also includes reproducible Node smoke tests:

```bash
node --test tests/v2-smoke.test.cjs
```

These are not substitutes for a real-device test. They do not verify Safari visual layout, installed-PWA cache upgrades, file downloads, keyboard behavior, scrolling, browser storage permissions or every UI interaction.

### Manual acceptance checks required before merge

1. In the current published V1 PWA, use **Operations → Backup all projects (.json)**. Keep that file off the device if possible.
2. Test the V2 branch on an isolated preview origin, or with an existing trusted local copy of the backup. A branch file URL by itself does not provide a full GitHub Pages preview.
3. Confirm every legacy project, stage, scratch note, word and category survived. Do not test data migration on the only remaining copy.
4. Use New Spark and start writing immediately.
5. Move among all five stages, change device orientation and open/close the iPad keyboard. Confirm writing, selection and cursor position survive tool use.
6. Save a chorus to Outtakes, revise the working draft, compare versions and restore with confirmation. Ensure the newer writing becomes a recoverable snapshot.
7. Run Crosswire's three exercises. Do not mistake manual prompts for AI-generated interpretation.
8. Remove and add a Constellations option, create another Blueprint, then reload and check that the preference remains removed.
9. Change themes from **Calibration → Wardrobe** without changing writing content.
10. Export a V2 backup and import it as a copy. Separately import a V1 backup into V2 and check the original content.
11. Test offline loading after the service worker has installed, then test receiving a subsequent update.

## Known limitations / future integration

- Wordverse uses saved vocabulary and **written ending matches**, not a linguistic rhyming dictionary.
- Crosswire's Generate and Transform functions are **structured manual scaffolds**. The diagnostic provides objective text statistics, not psychological inference or AI-generated lyrical quality judgments.
- Song section insertion is available in Ignite; drag-to-reorder, richer section modeling and advanced analysis remain future enhancements.
- Constellations supports creating, renaming, adding, removing and inserting options. Full option descriptions, reordering and preset combinations are not implemented.
- An actual browser/device visual and interaction regression pass has **not** been performed in this chat.
- The published `main` branch and current GitHub Pages site have not been changed.

## Release boundary

Review the feature branch and complete manual checks. Merge and deploy only after separate approval. Preserve the V1 JSON backup before doing so.
