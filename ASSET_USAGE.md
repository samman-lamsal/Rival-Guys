# Rival Guys V1.6 — Supplied Asset Usage

## KayKit Platformer Pack

The complete FREE glTF catalog is embedded in `js/embedded_props.js` (370 models). The game uses the supplied pack throughout the six arenas instead of drawing the maps only with primitive Three.js shapes.

- **Sky Disc:** arrow platforms, springs, barriers, flags, hoops, pickups, bracing, structure pieces, pipes, finish arch.
- **Triple Bridges:** real KayKit wood floor pieces for every breakable bridge segment, outer platform blocks, arches, signs, flags, railings, supports, finish signage.
- **Tumble Towers:** platform blocks on all three tiers, padded railings, slopes, pillars, bracing, arch, pickups.
- **Spinning Sweeper:** the rotating sweeper is built from KayKit barrier pieces, with KayKit ball end-caps, button-base hub, arrows, springs, bombs, flags, pipes and structure pieces.
- **Crumbling Colosseum:** every gameplay tile carries a real colored KayKit platform model; tiles sink, disappear and respawn together with the collider. Arches, direction signs, cones, bracing, struts and pickups complete the arena.
- **Windy Peaks:** platform tops, spring pads, arrow signs, flags, hoops, pipes, bracing and central structure pieces.

The lightweight primitive meshes are retained only as invisible/low-opacity collision helpers. This keeps the web build fast while the player sees the supplied 3D assets.

## Characters + animation

The supplied Quaternius and KayKit character models remain the actual fighters.

KayKit fighters now use the supplied **KayKit Character Animations 1.1** GLBs in addition to the original General/MovementBasic files. The runtime loads real unarmed punch, kick, forward dodge, hit, cheer and wave clips and maps them into the shared fighter state machine. The relevant animation GLBs are embedded in `js/embedded_models.js`.

Quaternius Captain/Skeleton keep their native embedded Punch, HitReact, Run, Jump, Death and Wave clips because their skeleton is different from the KayKit rig.

The animation mixer uses spawn, idle variation, run, jump-start, airborne jump, landing, punch/kick combo, dodge/dash, hit, fall/death, cheer and taunt/emote states. One-shot combat actions crossfade back into locomotion instead of snapping.

## Kenney UI

The supplied Kenney UI Pack remains the source for the large colored button textures and UI styling used by the home/team-selection flow.

### Background music
- `assets/audio/rival_guys_bgm.mp3` — user-supplied music file (`atlasaudio-gaming-606257.mp3`) integrated in V1.17.
