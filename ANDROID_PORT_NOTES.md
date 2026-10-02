# Android version notes

The V1 gameplay is deliberately separated into systems that map directly to an Android engine project later:

- `config.js` → ScriptableObject/resource config
- `player.js` → local FighterController
- `bots.js` → RemotePlayer interface + bot/network providers
- `combat.js` → combat/knockback service
- `arena.js` → six arena controllers
- `match.js` → round and best-of-five state machine
- `meta.js` / `save.js` → progression and local persistence

The supplied FBX/GLB assets are already suitable for importing into Unity/Godot. Keep the same `RemotePlayer` contract so a future multiplayer transport can drive both web and Android without changing combat or match flow.

## V1.2 team-mode mapping
The shared gameplay layer now exposes three queue sizes: `2v2`, `4v4`, and `8v8` via `CFG.MODES`. The human is assigned to Blue Team and the same `RemotePlayer` abstraction fills Blue allies and Red opponents. For a real Android/network implementation, keep the `team` field (`blue` / `red`) and replace `BotRemotePlayer` with the network-backed implementation without changing Fighter/combat/team-round logic.

Friendly fire is intentionally disabled. Match resolution is team-based and first-to-3 rounds, so the Android port should preserve `roundWins.blue`, `roundWins.red`, and dynamic `mode.teamSize` rather than using a fixed fighter count.

## V1.3 map assets
The web build now embeds all 370 KayKit Platformer FREE glTF models and uses real KayKit pieces throughout every arena. For a native Android engine port, import the original KayKit pack directly and keep the same collider/visual split used in `js/arena.js`.


## V1.6 round rotation + combat animations

A match no longer pins all rounds to the first arena. Preserve `roundMapHistory` in the Android port and choose a new arena before each round, excluding arenas already used in that best-of-five.

For KayKit characters, import the Character Animations 1.1 `Rig_Medium` libraries and bind the unarmed punch/kick, forward dodge, hit, cheer and wave clips to the same semantic states used on web. Quaternius characters should continue using their own authored clips unless they are explicitly retargeted in the native engine.


## V1.8 combat reaction parity
Mirror the web hit-state machine on Android: light stagger (0.55–0.78 s), heavy knockdown (1.05–1.35 s), temporary input lock, Lie_Down/Lie_Idle/Lie_StandUp where the KayKit rig supports them, and the same four-step attack rotation. Keep the hit result authoritative if/when real multiplayer is added.


## V1.12 economy, emotes, and mobile parity
Persist `ownedSkins`, `ownedEmotes`, `equippedEmotes[4]`, and the selected fighter in the Android save layer. Use the same coin/gem prices from `CFG.SKINS` and `CFG.EMOTES`. The web emote actions map to existing KayKit Rig_Medium clips (Wave, Cheer, Push-Ups, Sit Floor, Throw, PickUp, Interact, Sneak, Dodge Left/Right, Crouch, Crawl); native Android can bind the same clips directly.

For performance, keep the web strategy: lower render scale on weaker phones, no expensive realtime shadows on low/mobile quality, 30 FPS animation updates for remote fighters, and full-rate player/physics input. Gameplay collision should never be tied to visual LOD.
