# SEUNGWAN_KANG // PORTFOLIO

> An interactive 3D bedroom you can walk into through a browser tab.
> Click the monitor to drop into a faux desktop OS. Click the arcade to play Snake, Tetris, or Minesweeper.
> Click the laptop to open a terminal with real commands. Click the turntable to spin records.
>
> Built in **Blender**, baked, exported as a single `.glb`, and rendered in the browser with
> **Three.js / React Three Fiber** on top of **Next.js 16**.

```
┌─────────────────────────────────────────────────────────────┐
│  [ 0.000000] portfolio bootloader v1.0                      │
│  [ 0.018441] Mounting WebGL2 context...       [ OK ]        │
│  [ 0.042319] Loading /public/portfolio_room.glb (21.5 MB)   │
│  [ 0.089173] Decoding Draco meshes...         [ OK ]        │
│  [ 0.401778] Loading HDR environment map...   [ OK ]        │
│  [ 0.629017] All systems nominal.                           │
│                                                             │
│  > launching seungwan_kang // portfolio ...                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Table of Contents

- [What this is](#what-this-is)
- [Tech stack](#tech-stack)
- [Repository layout](#repository-layout)
- [The pipeline, end to end](#the-pipeline-end-to-end)
  - [1. Modelling the room in Blender](#1-modelling-the-room-in-blender)
  - [2. Lighting and texture baking](#2-lighting-and-texture-baking)
  - [3. Decimation and optimisation](#3-decimation-and-optimisation)
  - [4. POV cameras as a contract with the web app](#4-pov-cameras-as-a-contract-with-the-web-app)
  - [5. Exporting to glTF](#5-exporting-to-gltf)
  - [6. Loading the GLB in React Three Fiber](#6-loading-the-glb-in-react-three-fiber)
  - [7. Camera rig and zone tweens](#7-camera-rig-and-zone-tweens)
  - [8. HTML inside the 3D scene](#8-html-inside-the-3d-scene)
  - [9. The four interactive surfaces](#9-the-four-interactive-surfaces)
  - [10. Post-processing and tone mapping](#10-post-processing-and-tone-mapping)
  - [11. Audio engine](#11-audio-engine)
  - [12. The boot sequence and entry gate](#12-the-boot-sequence-and-entry-gate)
- [Running locally](#running-locally)
- [Performance notes and known quirks](#performance-notes-and-known-quirks)
- [Credits](#credits)

---

## What this is

A single-page personal site, but instead of a scroll-driven landing page, the site **is a room**.
The camera sits in the middle of a small studio bedroom — desk, monitor, laptop, arcade cabinet, turntable, guitars, amps. Click any of the four interactive surfaces and the camera tweens into a Numpad-0 view of that object, and a real piece of UI gets projected onto its physical screen. Click "back," and the camera tweens out.

Four interactive surfaces, four self-contained little apps:

| Surface     | Overlay         | What lives there                                                         |
| ----------- | --------------- | ------------------------------------------------------------------------ |
| Monitor     | **SwanOS**      | Faux desktop OS — windows, taskbar, about-me, projects, links            |
| Laptop      | **TerminalOS**  | Real terminal with `ls`, `cd`, `cat`, mini-games, easter eggs            |
| Arcade      | **ArcadeMenu**  | Snake, Tetris, Minesweeper with a CRT shader pass                        |
| Turntable   | **Records**     | A record player UI — choose, spin, swap; the platter rotates in 3D       |

Everything else in the room is just decoration with a story (a Quad Cortex on the desk, a Strat on a stand, a Twin Reverb against the wall, etc.).

---

## Tech stack

**3D / source**
- **Blender 4.x** — modelling, UV unwrap, baking, POV cameras
- **Cycles** — for the baked lighting pass
- **glTF 2.0 / .glb** — single-file export, Draco-compressed meshes, KTX2 textures

**Web / runtime**
- **Next.js 16** (App Router) + **React 19**
- **Three.js 0.183** + **@react-three/fiber 9** + **@react-three/drei 10**
- **@react-three/postprocessing** for bloom, vignette, chromatic aberration
- **GSAP** for camera tweens (ease curves on FOV + position + quaternion)
- **Zustand** for scene state and audio state
- **Tailwind CSS v4** + a lot of hand-written CSS for the OS chromes
- **Vercel** for hosting

---

## Repository layout

```
portfolio/
├── room.blend                 # The Blender source file (current)
├── room.pre-decimate.blend    # Pre-decimation snapshot kept as a checkpoint
├── assets/                    # Reference assets — third-party USDZ/ZIPs used while modelling
│   ├── Arcade_Cabinet.usdz
│   ├── desktop-pc/            # Monitor, keyboard, mouse references
│   ├── laptop/                # Laptop reference
│   ├── studio-speaker/
│   ├── focusrite-scarlett-2i4/
│   ├── Fender_Combo_Deluxe_Reverb.usdz
│   ├── Neural_DSP_Quad_Cortex.usdz
│   ├── Worn_out_vintage_Fender_Stratocaster_guitar.usdz
│   ├── Turntable.usdz
│   └── ...
└── web/                       # The Next.js app
    ├── public/
    │   ├── portfolio_room.glb # The exported scene (21.5 MB)
    │   ├── audio/             # Records and SFX
    │   └── fonts/
    └── src/
        ├── app/               # Next.js App Router entry
        ├── scene/             # Canvas, Room, CameraRig, PostFX, ScreenHtml, stores
        ├── overlays/          # The four "screens"
        │   ├── SwanOS/        # Faux desktop OS on the monitor
        │   ├── Terminal/      # Real terminal on the laptop
        │   ├── Arcade/        # Snake / Tetris / Minesweeper on the cabinet
        │   ├── Turntable/     # Side-panel controls for the deck
        │   └── _shared/       # Boot splash, mute, now-playing toast, back button
        ├── effects/           # GSAP transitions, flicker, turntable spin, parallax
        └── lib/               # Constants (Blender names), audio engine
```

---

## The pipeline, end to end

### 1. Modelling the room in Blender

Started from a 3 m × 3 m floor plan with one wall removed — a "diorama" pose so the camera can sit in the missing wall and look in. The room is small on purpose: every prop has to read at a glance, and a small room means fewer triangles and fewer texels to bake.

Most large props were laid in from the reference USDZs in `assets/` (arcade cabinet, turntable, headphones, Strat, Twin Reverb, Quad Cortex), then re-topologised and re-UVd so every interactive surface has clean topology and a single material slot. Each interactive screen — `Monitor_Screen`, `Laptop_Screen`, `Arcade_Screen` — is a **separate flat quad** with its own material, so the web app can find it by name and project HTML onto it.

The desk, walls, ceiling, floor, frames, and monitor stand are one "static" group: they get baked. The speakers, amp, guitar, Quad Cortex, etc. are the "live" group: they don't get baked, and they pick up runtime IBL lighting.

### 2. Lighting and texture baking

The lighting was authored in Cycles with **16 point lights** (under-shelf strips, monitor backlight, RGB on the cabinet, lamp, etc.). Doing 16 real-time point lights in WebGL is fine — until you turn on a post-FX composer, at which point everything goes black on some drivers. So the lighting was **baked into the static group**: floor, walls, ceiling, desk, monitor stand, frames. The bake captures bounce, GI, and the colour bleed from the RGB lights without costing a single runtime light at render time.

The 16 lights are still in the scene (and they get exported to the GLB), but they're disabled at load time:

```ts
// src/scene/Room.tsx
if (light.isLight) {
  light.visible = false;
  light.intensity = 0;
}
```

For the non-baked props, the runtime fills with one ambient light + a `night` HDRI environment map for IBL. That gives the speakers, amp, and guitar believable specular highlights without re-introducing the broken point lights.

### 3. Decimation and optimisation

`room.pre-decimate.blend` is the snapshot before mesh reduction. After it I ran:

- **Decimate** modifier on hero props down to a target tri count
- **Merge by distance** on imported USDZ geometry to clean up duplicated verts
- **UV repack** on every baked object so the bake atlas doesn't waste pixels
- **Material consolidation** — every baked object shares a `BakedAtlas` texture set, every interactive screen has its own `Mat_MonitorScreen` / `ComputerScreen` / `Mat_ArcadeScreen.001` so the web app can animate brightness/flicker per-screen without affecting bezels

The diff between `room.pre-decimate.blend` and `room.blend` is roughly a 60% triangle reduction with no visible quality loss.

### 4. POV cameras as a contract with the web app

The cleanest way to keep "what I see in Blender Numpad-0" identical to "what the user sees in the browser" was to make the **cameras themselves part of the export**. The Blender file contains five empties / cameras:

```
Camera_Pivot           Parent rig
├── Camera_Home        Default pose looking at the room
├── POV_Home           Same as Camera_Home, FOV-authored
├── POV_Monitor        Numpad 0 view from the monitor zone
├── POV_Laptop         Numpad 0 view from the laptop zone
├── POV_Arcade         Numpad 0 view from the arcade
└── POV_Turntable      Three-quarter view of the deck
```

Each `POV_*` is a real Blender camera with a real FOV. At runtime the web app reads its world matrix **and its FOV** and tweens the render camera to match. That means: change a POV in Blender, re-export, and the web framing updates automatically. No magic numbers in the code.

These names are also the only "API" between the two halves of the project. They live in one file:

```ts
// src/lib/constants.ts
export const BLENDER_NAMES = {
  MONITOR_SCREEN: "Monitor_Screen",
  LAPTOP_SCREEN:  "Laptop_Screen",
  ARCADE_SCREEN:  "Arcade_Screen",
  POV_HOME:       "POV_Home",
  POV_MONITOR:    "POV_Monitor",
  // ...
};
```

Rename anything in Blender? Update this file. That's the whole contract.

### 5. Exporting to glTF

Export settings used:

- **Format**: glTF Binary (`.glb`)
- **Include**: Selected + Visible objects, cameras, custom properties
- **Transform**: +Y Up
- **Geometry**: Apply modifiers, UVs, normals, tangents, vertex colors
- **Compression**: Draco mesh compression on (level 6, position quant 14)
- **Materials**: Export with embedded baked textures
- **Animation**: none — all motion is driven from the web app

Output: `web/public/portfolio_room.glb`, ~21.5 MB. Decoded and warm in cache, the canvas mounts in well under a second.

### 6. Loading the GLB in React Three Fiber

Loading is just `useGLTF` + a preload to make sure the file is in the loader cache by the time the component mounts:

```tsx
// src/scene/Room.tsx
const GLB_URL = "/portfolio_room.glb";
useGLTF.preload(GLB_URL);

export function Room() {
  const { scene } = useGLTF(GLB_URL);
  // walk the graph once, register every named object + material
  // into the Zustand store so other parts of the app can find them by name
}
```

After loading, the scene graph is walked once: every named `Object3D` is keyed into a `registerObjects` map, every named `Material` into a `registerMaterials` map. Effects (flicker, turntable spin) and the camera rig look things up by name from those maps — so the rest of the codebase never has to traverse the graph.

### 7. Camera rig and zone tweens

The camera lives under a `Camera_Pivot` rig. Going to a zone is a four-property GSAP tween:

```ts
// src/effects/transitions.ts (sketch)
gsap.to(camera.position, { ...povWorld.position, duration: 1.6, ease: "power3.inOut" });
gsap.to(camera.quaternion, { ...povWorld.quaternion, duration: 1.6, ease: "power3.inOut" });
gsap.to(camera, { fov: pov.fov, onUpdate: () => camera.updateProjectionMatrix() });
```

Each "zone" is just a string in the Zustand `useSceneStore`: `"room" | "monitor" | "laptop" | "arcade" | "turntable"`. Click handler walks the parent chain of the clicked mesh, finds a known name, sets the zone, and the camera tweens. Click "back" or press `Escape` and the zone resets to `"room"`.

While the camera is moving, `<AdaptiveDpr pixelated />` and `<AdaptiveEvents />` from drei drop pixel ratio and pause raycasting so the tween stays buttery on lower-end hardware.

### 8. HTML inside the 3D scene

The trick that makes this whole thing work: **`drei`'s `<Html transform>` lets you mount a real DOM tree onto a 3D plane**. The plane is one of the named screen meshes from the GLB, so the HTML is positioned and rotated exactly where the monitor/laptop/arcade screen lives in 3D space.

`src/scene/ScreenHtml.tsx` does the math:

1. Find the screen mesh by name in the registered objects map
2. Compute its world-space center, surface normal, and on-plane width/height
3. Mount the overlay component inside `<Html transform>` at that pose, with a CSS pixel size that matches the mesh's aspect ratio

Then it just renders normal React. Tailwind, hover states, scrolling, real `<input>` fields — everything works because everything **is** real DOM. The 3D scene just provides the position and rotation.

### 9. The four interactive surfaces

#### Monitor → SwanOS (`src/overlays/SwanOS/`)

A faux desktop OS — windows you can drag, a taskbar, a clock, a wallpaper, an "About Me" window, a "Projects" window, a links window. Pure CSS chrome (`duruos.css`), no third-party UI library.

#### Laptop → TerminalOS (`src/overlays/Terminal/`)

A real terminal. Real prompt, real command parsing, command history, tab-completion, `ls / cd / cat / help / clear / about / projects / contact`, plus mini-games and easter eggs hiding in subfolders. The most code of the four overlays — split into `screens/`, `widgets/`, `data/`, `easter/`, `games/`, `hooks/`, `layout/`.

#### Arcade → ArcadeMenu (`src/overlays/Arcade/`)

A menu, three games (`Snake.tsx`, `Tetris.tsx`, `Minesweeper.tsx`), and a CRT shader pass (`CRTEffects.tsx`) that gives the games scanlines, a barrel distortion, and slight chromatic aberration so they feel like they're actually running on the cabinet's tube.

#### Turntable → TurntableControls (`src/overlays/Turntable/`)

The only overlay that **doesn't** mount on a 3D plane — the turntable's "screen" is the platter, which is too small to read text on. Instead, this one renders as a side-panel HTML overlay when the turntable zone is active. Picking a record actually rotates the platter mesh in 3D via `applyTurntable` in `src/effects/turntable.ts`.

### 10. Post-processing and tone mapping

```ts
// src/scene/Scene.tsx (gl options)
toneMapping: AgXToneMapping,
toneMappingExposure: 0.5,
```

**AgX** is the new default tone map in Blender 4 — picking it on the web side means colours match the bake. `toneMappingExposure: 0.5` keeps emissives from clipping (LEDs read as colours, not white blobs).

Post-processing is `@react-three/postprocessing`'s `EffectComposer` with bloom + vignette + chromatic aberration. **Important caveat**: any runtime point light + the EffectComposer in this version produced black frames in development on some drivers. That's the second reason the GLB lights are disabled at load.

### 11. Audio engine

`useMusicPlayer` (in `src/lib/useSfx.ts`) is the music engine. It owns one `<audio>` element, reads "what should be playing" from the audio store, and crossfades between records when the user picks a new one on the turntable. AudioContext can't auto-start in modern browsers, so the **EntryGate** — the "PRESS ANY KEY / CLICK ANYWHERE" splash that appears after loading — is what unlocks audio. The first user gesture sets `playing: true` and music begins.

A `<MasterMute>` button and a `<NowPlayingToast>` that surfaces "Now playing: …" for two seconds when a record changes round it out.

### 12. The boot sequence and entry gate

The loading fallback isn't just a spinner — it's a fake kernel boot log. `BOOT_LINES` is a hand-authored sequence of `dmesg`-style lines that animate in with random 80–170 ms delays, plus a progress bar that creeps `0% → 94%` and **only fills to 100% when the GLB actually finishes loading**. A bar stuck at 94% is therefore a real signal that something hung.

There's a `MIN_LOADING_MS = 2800` guard so that on cache-hot reloads, where the GLB resolves in ~50 ms, the splash still gets to play. It's branding, not waiting.

After loading, the **EntryGate** intercepts the first keypress or click. Two reasons:

1. AudioContext needs a user gesture before it can play music.
2. It's a clean curtain-up — the user opts into the experience.

---

## Running locally

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To export a new build of the room:
1. Open `room.blend` in Blender 4.x
2. File → Export → glTF 2.0 (`.glb`), with the [export settings](#5-exporting-to-gltf) above
3. Save it to `web/public/portfolio_room.glb` (overwriting the existing file)
4. Hard-refresh the dev server (the GLB is browser-cached)

If you renamed any object or material in Blender, update `web/src/lib/constants.ts` to match.

---

## Performance notes and known quirks

- **Runtime point lights are disabled** — they black-frame the EffectComposer in `@react-three/postprocessing` 3.0.4 and their effect is already baked into the static meshes.
- **Adaptive DPR** drops pixel ratio during camera tweens; full resolution restores at rest.
- **Suspense fallback enforced minimum**: `MIN_LOADING_MS = 2800` so the boot log gets to play even on cache-hot reloads.
- **Each overlay is a dynamic import** — SwanOS, TerminalOS, ArcadeMenu are split into separate chunks, so the boot doesn't block on parsing them.
- **GLB is 21.5 MB** before HTTP compression. Draco shaves ~70% off the mesh data; baked textures are the rest. Vercel's edge serves it gzipped over HTTP/2.
- **Emissive intensity** is scaled by `0.2` at load — Blender's PBR emissives are tuned for Cycles, not AgX; the divisor brings LEDs back to a colourful (not blown-out white) appearance in browser.
- **Camera FOV is per-zone**, mirrored from the Blender POV cameras. If a zoomed-in view feels off, change the FOV in Blender — not in code.

---

## Credits

Designed, modelled, and built by **Seungwan Kang** (baduru / duru).

Reference props in `assets/` are third-party — see each subfolder for licence and attribution.
The room model itself, all overlays, code, and bakes are mine.

Built in 2026.
