# ADR-0001: HEIC and Apple Live Photo import

- **Status:** Accepted
- **Date:** 2026-06-20

## Context

Users import photos straight from iPhones, which means **HEIC/HEIF** files and
**Apple Live Photos**. Two problems:

1. **Browsers can't decode HEIC.** Outside Safari, a HEIC dropped into the
   editor fails at thumbnail generation (`<img>`/canvas can't decode HEVC), so
   it never imports at all.
2. **Live Photos are two files, not one.** Apple **never embeds the motion
   video inside the HEIC** (verified by byte-inspecting a real sample: single
   `ftyp`, no `moov`/`mdat` movie atoms). A Live Photo is a HEIC still **plus a
   separate `.MOV`**, linked by a content-identifier UUID. When the `.MOV` is
   dropped on export, the motion is unrecoverable. ("Unpack the video inside the
   HEIC" only applies to Google/Samsung **Motion Photos**, which append an MP4 —
   not Apple.)

## Decision

### 1. Decode HEIC → JPEG on import

Transcode HEIC/HEIF to JPEG at import and use the JPEG everywhere downstream
(thumbnail, preview, export). The original HEIC is unusable in-browser, so it is
replaced rather than kept.

**Library: `heic-to`** (`heic-to/next` entry for the Next bundler). Chosen over
the alternatives:

- `heic2any` — larger WASM (~2.7 MB vs ~1.2 MB), less actively tracking libheif.
- `libheif-js` — lower-level; we'd hand-roll the decode→canvas→blob pipeline.
- Server-side conversion — rejected; keeps everything client-side (no upload,
  no infra), consistent with the rest of the editor.

The `/next` build inlines the WASM (~3 MB) so there's **no separate `.wasm`
fetch or CDN dependency** at runtime.

### 2. Decode in a Web Worker (with main-thread fallback)

The decode runs in a dedicated Web Worker (`media/heic.worker.ts`). Rationale:
`heic-to` uses Emscripten pthreads + `OffscreenCanvas`, but **pthreads only run
off-thread when the page is cross-origin isolated** (COOP/COEP) — OpenCut isn't,
so the HEVC decode + JPEG encode would otherwise run single-threaded **on the
main thread** and freeze the UI (~1–2 s per image, worse for batches). Running
it in our own worker keeps the editor responsive regardless of isolation.

`convertHeicToJpeg` falls back to main-thread decode if a worker can't be
created (older browser / bundling failure), so import never hard-fails.

### 3. Lazy-load the decoder

The decoder (and its WASM) is imported only when a HEIC is actually
encountered, so it never lands in the initial bundle.

### 4. Pair Live Photos by base name (v1)

`detectLivePhotoPairs` matches a HEIC still with its `.MOV` by **shared base
name** (`IMG_6453.HEIC` ↔ `IMG_6453.MOV`) — reliable for Photos exports, which
is how users get both files. The motion clip imports as a video labeled
`"<name> (Live Photo)"`; the still imports as an image.

The **canonical** link is the content-identifier UUID
(`kCGImagePropertyMakerAppleDictionary[17]` in the HEIC ↔
`com.apple.quicktime.content.identifier` in the MOV), and filenames are not
guaranteed to match. We deferred content-id matching because the HEIC side
requires parsing the Apple maker note in-browser; base-name matching covers the
common case. See follow-ups.

### 5. Import surface

- A lone HEIC (no companion `.MOV`) imports as a still — its motion is gone.
- Empty-MIME files are classified by extension (`isHeicFile`,
  `isQuickTimeFile`), and the file-picker `accept` lists `.heic,.heif,.mov`.
- Since the browser sandbox exposes only dropped files (no disk access), we
  **cannot auto-find a sibling `.MOV`** from a single dropped HEIC. Users drag
  both together; folder-drop traversal is a possible future enhancement.

## Consequences

**Positive**
- HEIC photos import at all (previously a hard failure).
- Import stays responsive — decode is off the main thread.
- Live Photo motion is preserved when both files are provided.
- Fully client-side; no server or CDN dependency.

**Negative / trade-offs**
- +~3 MB lazily-loaded chunk on first HEIC import.
- **Color:** iPhones shoot wide-gamut Display P3; canvas JPEG conversion can
  shift hue/saturation if the color profile isn't honored. Accepted for v1.
- Base-name pairing misses renamed/relocated pairs (content-id would fix).
- Live Photo `.MOV` is HEVC, so it previews only in Safari; other browsers show
  the existing "can't preview" warning but still import the clip.

## Follow-ups

- Harden pairing with the content-identifier (cheap on the MOV side; HEIC
  maker-note parsing if renamed-pair support is needed).
- Consider enabling cross-origin isolation (COOP/COEP) so `heic-to`'s pthreads
  parallelize the decode.
- Folder-drop traversal (FileSystem entries API) for "drop the folder, we pair
  it automatically."
- Bounded-concurrency batch conversion for large HEIC imports.
- Optional: Google/Samsung Motion Photo support (extract the appended MP4).

## References

- heic-to — https://github.com/hoppergee/heic-to
- "Handling HEIC on the web" — https://upsidelab.io/blog/handling-heic-on-the-web
- Apple's Live Photo: two separated files — https://www.whexy.com/dyn/ec968903-2fab-44ac-8003-62d14cacc2f5
- MotionPhoto2 (Live Photo metadata/pairing) — https://github.com/PetrVys/MotionPhoto2
- Client-side HEIC converter (OffscreenCanvas/Worker) — https://dev.to/glebr2d2/-how-i-built-a-client-side-heic-converter-no-server-required-2fl4
