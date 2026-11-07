# Laced Notes V2 review: controlled feature branch

> This is an implementation branch, **not** a production release. GitHub Pages continues to publish the `main` branch. Do not merge before reviewing the data safeguards and testing on an iPad.

## Repair branch verification — November 6, 2026

Repair branch: `repair/v2-data-reliability`, based on draft PR #1 head `998047e`.

**Release verdict: still blocked pending rendered browser and device verification.** No redesign or feature expansion. The 14 agreed names and existing V2 layout remain unchanged.

### Repairs and executable evidence

**33 tests passed locally.** As a negative control, the same suite against the original V2 JavaScript produced 24 failures and 9 passes (the host-file guard check still reads the repaired host). Syntax checks and `git diff --check` also passed.

`node --test tests/v2-smoke.test.cjs` exercises these paths in a limited simulated DOM with real JavaScript, JSON and injected storage failures. It does **not** prove actual browser rendering or event ordering.

| Confirmed blocker | Repair | Automated coverage |
| --- | --- | --- |
| Corrupt V2 was replaced on startup | Invalid/unrecognized storage enters recovery without writes; original raw storage can be downloaded | Corrupt JSON, null, empty projects, unsupported version, malformed palette, denied reads |
| V1 edits diverged silently after migration | Record exact legacy source; changed V1 projects become recovery copies; V2 drafts stay intact | Initial migration, repeated launch, late V1 edits, pre-repair V2 without baseline |
| Passage restore replaced entire current stage | Preserve whitespace and passage boundaries; restore only when surrounding source context still matches | Revised span, changed surrounding context, old unanchored captures |
| Cross-stage restore overwrote unrelated writing | Restore/compare against saved source stage; whole-stage and passage types are distinct | Cross-stage restore and comparison, restorable safety copy, cancel |
| Save failures could claim success | Save returns a result; status survives rerenders; restore/import/Outtake capture/deletion roll back if persistence fails | Quota failures, failed import, export of unsaved draft, failed deletes |
| Stale selection could replace unrelated text | Selection, insertion caret and scroll are scoped to Blueprint and stage; selection/focus events captured | Repeated insertion, stage/project switch, touch-related event handlers, scroll restoration |
| Hidden V1 code ran alongside V2 | V1 initializer disabled; V2 registers offline worker | Execute V1 inline script with no DOM/storage globals; it must exit immediately |
| Malformed imports could partially add projects | Validate every project before mutation; copy imports and record incoming preferences | Invalid mixed import, V1/V2 round-trips, quota rollback |

A stale-tab guard also refuses to save when either storage key changed since this tab loaded. This is a synchronous comparison guard, not a cross-process transaction lock; truly simultaneous writes remain a browser verification concern.

### Data and recovery boundaries

- The V1 storage key is never written by V2. Migration records its raw source in the V2 backup, increasing storage size; quota failures are visible and leave original keys intact.
- Existing V2 data without a migration baseline imports V1 projects as clearly labeled recovery copies once. This may create deliberate duplicates rather than guess which version is authoritative.
- Old Outtakes lack trustworthy passage boundaries, even when they may have captured an entire draft. They remain readable/copyable; automatic replacement is refused. Crosswire results also use explicit copy/insert rather than whole-stage restore.
- New passage restoration works when only the captured span was revised. If surrounding text changed, copy into an explicitly chosen selection instead of guessing a destination.
- A successful restore stores the prior stage and the replacement in one localStorage write. If that write fails, both changes are rolled back in memory. The prior stage snapshot also preserves an empty or whitespace-only draft.
- Import remains additive. Current workspace preferences stay active; incoming theme/mode/stage/template are retained in import records and subsequent backups. This is not a full workspace-replacement operation.
- Carets, scrolling and unfinished Crosswire experiments are isolated for navigation within a session. Working draft text and saved Outtakes persist across reload. Unsaved experiments still require deliberate preservation.
- Recovery export is a raw storage bundle for repair, not an ordinary import-ready project backup. Malformed data is preserved, not automatically reconstructed.

### Checks still required

- Actual rendered interactions, focus, native prompts, file downloads/chooser and browser event order. The connected cloud browser could not reach the isolated localhost server (`ERR_CONNECTION_REFUSED`). Workspace Playwright had no bundled Chromium/WebKit; the system Chromium launch failed with `socket() failed: Operation not permitted`.
- iPad Safari/PWA keyboard, touch selection, orientation, scrolling and viewport behavior.
- Installed V1-to-V2 service-worker upgrade, offline reload and update/cache behavior. Cache identifier was advanced, but no installed-PWA upgrade is verified.
- Accessibility, actual storage-quota behavior, and rapid simultaneous tab writes.
- A browser round-trip using a real exported V1 backup on a separate test origin. The source schema and JSON paths have been exercised; no user production storage was accessed.

A GitHub Actions workflow runs syntax and data regression checks for feature/repair pushes and PRs. It does not deploy. A passing workflow must not be treated as permission to release.

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

The original V1 source remains in `index.html` for traceability, with its initializer disabled in the V2 host. Only V2 owns live event handlers and persistence. V1 remains available on the untouched production branch; the hidden V1 markup is not a running fallback. Service-worker registration now belongs to V2.

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
