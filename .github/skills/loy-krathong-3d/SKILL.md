---
name: loy-krathong-3d
description: "Use when building, modifying, or reviewing the Thai Loy Krathong 3D festival experience, Three.js scene, floating krathongs, temple, market stalls, or animated visitors."
---

# Loy Krathong 3D Experience

Use this project skill for changes to the interactive Loy Krathong festival website.

## Product direction
- Create a calm, cinematic Thai festival-at-night atmosphere with moonlight, warm lantern light, a temple, market stalls, moving visitors, and a river.
- Keep user-facing copy in Thai. Preserve the existing responsive dark-and-gold visual language.
- Let visitors enter a name, show it on their krathong, and animate the krathong as it drifts on the water.
- Treat the scene as a browser-side experience. Do not add a backend, persistence, or external AI service unless specifically requested.

## 3D implementation
- Use React Three Fiber and Drei components already installed in this workspace; keep scene elements in focused React components under `src/scene/`.
- Prefer procedural geometry, materials, lights, and shader effects over downloaded assets. Do not copy proprietary artwork or introduce assets with unclear licenses.
- Keep animation frame-based with `useFrame`; use stable refs and memoize generated geometry or static data where appropriate.
- Keep controls intuitive and prevent the camera from moving into unusable positions. The optional free camera supports orbit/pan, WASD or arrow-key movement, Q/E vertical movement, Shift sprint, bounded travel, a reset view, and touch D-pad movement on phones; preserve the normal framing when it is off.
- Preserve the expanded festival footprint, additional market stalls, rising sky lanterns, and detailed humanoid guests with animated limbs and varied outfits.
- Keep sky-lantern release interactive and capped, and ensure the river bridge and other landmarks remain navigable in the expanded scene.
- Fireworks should launch from a visible 3D point in the festival, rise above the temple, burst in world space (not as a screen overlay), and clean up transient particles after the burst.
- Keep graphics presets user-adjustable (`performance`, `balanced`, `cinematic`) and use them to control pixel ratio, antialiasing, shadows, light count/intensity, and particle density.
- Provide sensible mobile framing and avoid unnecessary high-cost shadows, particles, or draw calls.
- Place HTML labels with Drei `Html` when Thai text must remain crisp and readable in the scene.

## UI and accessibility
- Keep the name form keyboard-accessible, labeled, and usable on narrow screens.
- Validate and trim entered names before creating a krathong; give status feedback through an `aria-live` region.
- Keep UI overlays readable against the scene and ensure they do not block essential scene controls.
- Respect `prefers-reduced-motion` for interface transitions. Do not communicate essential information through color alone.

## Workflow
1. Read `PLAN.md` and the relevant UI or scene components before changing the experience.
2. Make the smallest coherent change and keep the React UI separate from the Three.js scene where practical.
3. Run `npm run build` and `npm run lint` after implementation; fix issues introduced by the change.
4. Check the interaction at desktop and mobile widths when browser preview is available.
