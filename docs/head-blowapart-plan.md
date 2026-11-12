# Plan: the spinning head that blows apart

Status: planning, 2026-11-07. Nothing built. Target: the "Take it apart" section on classiccottrell.ca.

## The idea

A human head turns slowly. Scroll (or the slider) and the face blows apart: skin, skull, and whatever's inside fly outward. The point: the ideas come from inside my head, and it's a little unhinged in there.

## What the site already has

- Home page "Take it apart": a CSS exploded view of a service-desk screen. `#xv` layers, `--x` (0 to 1) set by a range slider, and page scroll drives the same value (`explode()` in `assets/js/site.js`). Slider rests at 35%, never an empty state.
- No-JS rule: every page must read with JavaScript off. Tests enforce it (`tests/no-js.spec.js`, axe on every page, `tests/budget.spec.js` size budgets).
- Ink & Rule art direction: Bristol board, India ink, two blue pencils, one signal-yellow field. No framework, no bundler, static output from `data/*.json` via `npm run build`.
- `Projects/cc-webgl` already has `three@0.185` in a Vite/TS setup. Reusable if we go 3D.

## Decision 1: how to make it (pick one before sourcing anything)

| Option | Look | Reference needed | Weight | Fit with site |
|---|---|---|---|---|
| **A. 3D model in WebGL (three.js)** | Real rotation, true shatter, fragments in depth | A head model + texture | 1 to 3 MB model, plus ~150 KB three | Breaks "no framework / small budget" unless lazy-loaded behind the section |
| **B. Pre-rendered turntable + shatter frames** (image sequence or video scrubbed by scroll) | Whatever you can render, including ink style | Same model, rendered offline | 1 to 4 MB, lazy | Closest to the current scroll-scrubbed pattern; no runtime 3D |
| **C. Drawn ink layers, CSS/SVG exploded** (extend the existing `.xv-layer` system) | Pure Ink & Rule, hand-drawn | Your own drawings of a head, in 6 to 8 sheets | Tiny | Best fit; "spin" is faked with 5 to 7 angle sheets |

Recommendation: **B as the plan, with A's model as the source.** Get one good 3D head, render the turntable and the blow-apart offline in your ink look, ship as a scroll-scrubbed frame sequence with a static poster for no-JS. If the result feels flat, promote the same model to A inside `cc-webgl`. C stays the cheap fallback.

## Decision 2: whose head

This sets the whole reference list. Options: your own head, a stylised generic head, a classical bust. Own head = a photo scan (phone photogrammetry) and the strongest "ideas from inside *my* brain" story. Generic/bust = no likeness or consent questions.

## Reference material to gather

Bring these, in this order of importance.

1. **The head itself.** One of:
   - Your own scan: Polycam / Scaniverse / Apple Object Capture, 60 to 100 photos or a phone LiDAR pass, even soft light, no glasses, hair tied back. Or a FaceBuilder (Blender) head from 3 to 6 photos.
   - A licensed model: Sketchfab / TurboSquid / CGTrader. Check licence allows web redistribution (CC0 or CC-BY, or a paid standard licence). Note the licence in the repo.
   - Photo set only (front, 3/4 left, profile, 3/4 right, back, top) for me to build a stylised version.
2. **The "blow apart" look.** 3 to 6 images or clips of what you mean: exploding statues, Baroque/Renaissance anatomical drawings, exploded-view technical illustrations, Kintsugi shatter, Bruce Conner/Man Ray-ish collage, "head full of stuff" illustration. Say what you like in each, in one line.
3. **What's inside.** The craziness. A list of 10 to 20 things that fly out: your actual ideas (ClassicCottrell world, Terry, linefield, Forma, etc.), tools, doodles, text fragments, drawings from `source/`. This is the content that makes it yours, not generic.
4. **Mood and tone.** Unhinged how: funny, anxious, joyful chaos, dark? One or two sentences, or a reference film/artist.
5. **Existing site assets** (I'll pull these myself): `source/drawings`, `source/sketchbook`, the inked self-portrait (`source/self/ink.png`), linefield pieces, signature SVGs. Confirm which are OK to scatter.
6. **Sound (optional).** A shatter/whoosh cue. Needs a licence note; default is silent, with an opt-in at most.

Rights checklist: anything you didn't make needs a licence that allows web use and modification, recorded alongside the file. Don't use a real third party's face. Your own head is fine.

## Roadmap

1. **Concept lock** (you, ~1 session): answer Decisions 1 and 2, send the reference list. I write a one-page storyboard: 5 beats (idle spin, crack, burst, peak chaos, settle or reassemble).
2. **Asset prep:** get the model into Blender, clean it, split the head into fragments (skin shell, skull, brain, eyes, jaw, loose shards). Fracture with Cell Fracture or hand-cut so the pieces read as a face breaking, not noise.
3. **Look dev:** render 3 test frames in the Ink & Rule look (line + one signal-yellow field). Approve the look before rendering everything.
4. **Render and encode:** turntable 0 to 360 degrees, then the blow-apart as a frame sequence; AVIF/WebP at 2 sizes, 60 to 120 frames; budget under about 2.5 MB transferred, lazy-loaded when the section nears the viewport.
5. **Site integration:**
   - New section in `data/site.json` + generator in `scripts/lib/pages.mjs`, markup beside the existing `#xv`.
   - `assets/js/site.js`: reuse the `explode()` scroll/slider control, but drive frame index instead of `--x`. Keep the slider and keyboard use, `aria-valuetext`, and the Put it back button.
   - No-JS and reduced-motion: show one static poster frame (mid-burst) with a caption. No auto-spin under `prefers-reduced-motion`.
   - Mobile: lower-res sequence, touch drag as well as scroll.
6. **Tests and gates:** extend `budget.spec.js` for the new section, axe + no-JS specs, a `interactions.spec.js` case for the slider driving frames. Run the contrast check.
7. **Review:** look at it at 1440, 768 and 390 wide; then PR to the site repo for your go-ahead (no merge or push without your say).

## Risks and open questions

- Weight and load time are the main risk to a site that currently ships very little. Mitigation: lazy-load, two sizes, poster first.
- A face blowing apart can read as violent or distressing. Keep it stylised (ink, paper, ideas flying out, no gore), and make sure the reduced-motion version is calm.
- Likeness: confirm it's your own head, and decide whether the skin side is photographic or inked.
- Is "ClassicControl.ca" meant to be classiccottrell.ca? I assumed yes.
- Should it replace the current service-desk "Take it apart" or sit as a second one? I assumed a second one, on the home page below the first, or a page of its own.

## What I need from you to start

1. Pick the approach (B recommended) and whose head.
2. Send the head photos or scan, or tell me to shop for a licensed model.
3. 3 to 6 look references with one-line notes.
4. The list of "what's inside".
5. The tone, in a sentence.
