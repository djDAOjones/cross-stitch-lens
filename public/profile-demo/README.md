# Profile demo images

Six owner-supplied preview images for the profile editor's test
preview (M15-UI-04, D114; supplied 2026-08-09, M15-EVID-01). All are
2048 × 2048, so every slot is judged at the same size:

| File | Slot | What it tests |
| --- | --- | --- |
| `landscape-1.jpg` | Landscape photo 1 | a palette on natural colour |
| `landscape-2.jpg` | Landscape photo 2 | the same, on a second subject — one landscape is not evidence |
| `portrait.jpg` | Portrait photo | skin tones, where a narrow profile shows first |
| `graphic.jpg` | Flat-colour graphic | banding and flat-area breakup |
| `stained-glass.jpg` | Stained glass | saturated colour against black leading — the hardest case for a rule-shaped profile |
| `text.png` | Text in three fonts | whether legibility survives the reduction |

The file names are a **contract** with `PHOTO_SLOTS` in
`src/ui/profile-editor-preview.ts`, extensions included — the loader
fetches these exact names. Renaming or re-encoding one turns its slot
into an honest "Image offline" state rather than an error, so the
change is easy to miss; `tests/profile-editor.test.ts` pins the list.
