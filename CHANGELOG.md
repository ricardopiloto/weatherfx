# Changelog

## [Unreleased]

- **Repository cleanup:** Removed the unused Jekyll/Gemfile site scaffold, `TODO.md`, and empty `scripts`/`styles` entries from `module.json`. Removed **SmallWeather** support (`sw-fn.js`, `smallweatherUpdate` hook) and the **Weather Source** / **Larger Cloud Shadows** settings so the fork matches **Weather Control**–only use documented in the README. **OpenSpec** files were not removed.

## [2.0.0] — Fork updates (OpenSpec changes)

This release reflects the fork updated for Foundry v13, FXMaster (gambit07/fxmaster), and the latest Weather Control. The following changes were implemented and tracked via OpenSpec.

### Compatibility and dependencies
- **update-foundry-v13-compat:** Updated module for Foundry VTT v13 API; manifest and runtime code aligned with v13 compatibility; scene flags and version detection updated.
- **update-fxmaster-dependency:** Declared and validated compatibility with latest FXMaster ([gambit07/fxmaster](https://github.com/gambit07/fxmaster)); manifest and FXMaster API usage audited and updated.
- **update-fxmaster-rain-type:** Replaced deprecated `raintop` particle type with `rain` and appropriate options in `effect.js` (and previously `sw-fn.js` when SmallWeather was supported) so rain effects render correctly with current FXMaster.
- **adapt-scene-controls-foundry-v13:** Adapted scene controls to Foundry v13 `getSceneControlButtons` API (Record-based controls and tools); "Clear Weather", "Apply Weather FX", and "Toggle Weather Control" buttons now register and appear correctly for GMs.
- **fix-weatherfx-controls-and-linkweather:** Fixed `linkWeatherToGI is not defined` runtime error and restored reliable visibility of Weather FX buttons when required modules are present.

### Clear Weather and apply behaviour
- **fix-topdown-rain-and-clear-fx:** Top-Down Rain setting is now respected for Weather Control (rain uses `topDown: topDownRain` from settings). Clear Weather removes all effects: filters applied via `addFilter` with stable IDs and cleared with `removeFilter`, particles cleared via hook and FXMaster scene flag.
- **clear-before-apply-and-fxmaster-particles:** Weather FX always clears previous effects before applying a new one (no accumulation). Clear Weather resets FXMaster scene flag so particle effects are fully removed from the canvas and API Effects list.

### Weather Control and effects
- **fix-checkweather-undefined-tolowercase:** Fixed `TypeError: Cannot read properties of undefined (reading 'toLowerCase')` in `checkWeather()` when Weather Control message or language lookup returns undefined; safe fallback before `.toLowerCase()`.
- **add-ice-storm-effect:** When Weather Control reports "Ice Storm" (or equivalent), Weather FX now applies an ice storm effect (heavy rain, clouds, fog, cold climate filter); new `iceStorm` case in `createEffect()` and detection in `checkWeather()`.

### Documentation and tooling
- **update-project-context:** Updated `openspec/project.md` with accurate module purpose, tech stack, dependencies, and conventions.

### Foundry v14 compatibility
- **update-foundry-v14-compat:** `module.json` now includes `type: "module"` and **compatibility.verified: "14"** (minimum remains **12**). Runtime hooks and APIs used by this package were cross-checked against the public v14 docs; no code changes were required for the audited paths. **In-game smoke testing on a v14 world** (controls, chat auto-apply, scene config injection, FXMaster) is recommended when upgrading the host.

### README weather tables
- **add-readme-weather-tables:** README documents the **seasonal 1d100** matrix and **temperature profile** table used by Weather Control, with attribution (*Enemy in Shadows Companion* / DWD via upstream) and a clear split: Weather Control + calendar generate weather; Weather FX maps results to canvas effects.

### Weather Control non-legacy (DSLF) messages
- **support-weather-control-dslf-message-format:** When **`weather-control`** setting **`legacyEnemyInShadowsWeather`** is **`false`**, chat lines shaped like `<b>…°C</b> - Precipitation; Visibility; Wind` are parsed and mapped to FX (`util.js` extractors, `wc-fn.js` `dslfTripleToEffectName`). Legacy EiS-style strings remain unchanged when the setting is true or unset. README documents WFRP4e / Deft Steps, Light Fingers context.
- **refine-dslf-wind-particle-speed:** In DSLF mode, the **wind** token scales **`options.speed`** on **fog** and **clouds** particle layers (cloned `Effect`, no mutation of shared `effect.js` definitions). README lists tier multipliers.
- **add-dslf-clear-scattered-clouds:** DSLF **none + Clear + Still/Light** wind now applies **`scatteredClearSky`** (sparse `clouds` layer in `effect.js`) instead of empty `clear`; wind scaling still differentiates Still vs Light drift. Medium+ clear-sky wind unchanged (`partlyCloudy`).

---

## [1.5.0]
[![Supported Foundry Versions](https://img.shields.io/endpoint?url=https://foundryshields.com/version?url=https://github.com/LeafWulf/weatherfx/releases/download/1.5.0/module.json)](https://foundryvtt.com/packages/weatherfx)  
[![Downloads](https://img.shields.io/github/downloads/LeafWulf/weatherfx/1.5.0/module.zip?logo=github&color=238636&label=downloads)](https://github.com/LeafWulf/weatherfx/releases/1.5.0)

- Now Weather FX is more well adjusted to the data received from smallweather, creating effects that are true to the data.
- Effects now account for:
    - wind direction;
    - wind speed;
    - real precipitation values
    - real cloud cover values
- Also it is now possible to use the new feature: instant apply. This will redraw the scene so you won't have to wait for the effects to transition. This setting is off by default.
- You can now choose between top-down rain or regular foundry's rain. This setting works only with smallweather as weather source.

## [1.4.0]
[![Supported Foundry Versions](https://img.shields.io/endpoint?url=https://foundryshields.com/version?url=https://github.com/LeafWulf/weatherfx/releases/download/1.4.0/module.json)](https://foundryvtt.com/packages/weatherfx)  
[![Downloads](https://img.shields.io/github/downloads/LeafWulf/weatherfx/1.4.0/module.zip?logo=github&color=238636&label=downloads)](https://github.com/LeafWulf/weatherfx/releases/1.4.0)

- Added support to SmallWeather, you only have to select it in the module settings.

## [1.3.0]
[![Supported Foundry Versions](https://img.shields.io/endpoint?url=https://foundryshields.com/version?url=https://github.com/LeafWulf/weatherfx/releases/download/1.3.0/module.json)](https://foundryvtt.com/packages/weatherfx)  
[![Downloads](https://img.shields.io/github/downloads/LeafWulf/weatherfx/1.3.0/module.zip?logo=github&color=238636&label=downloads)](https://github.com/LeafWulf/weatherfx/releases/1.3.0)

- Added control button to toggle Weather Control window application (also useful to use when the window disappears)
- Added a new scene configuration, the GM is able to disable Weather FX in any scene. This is useful to prevent to add weather effects in very large scenes that may cause lag.

## [1.2.0]
[![Supported Foundry Versions](https://img.shields.io/endpoint?url=https://foundryshields.com/version?url=https://github.com/LeafWulf/weatherfx/releases/download/1.2.0/module.json)](https://foundryvtt.com/packages/weatherfx)  
[![Downloads](https://img.shields.io/github/downloads/LeafWulf/weatherfx/1.2.0/module.zip?logo=github&color=238636&label=downloads)](https://github.com/LeafWulf/weatherfx/releases/1.2.0)

- Now using playlists for SFX
- The module detect a scene with old flags and inform the user.
- now supports weather-control in any language.

## [1.1.4]
[![Supported Foundry Versions](https://img.shields.io/endpoint?url=https://foundryshields.com/version?url=https://github.com/paulo-roger/weatherfx/releases/download/1.1.4/module.json)](https://foundryvtt.com/packages/weatherfx)  
[![Downloads](https://img.shields.io/github/downloads/paulo-roger/weatherfx/1.1.4/module.zip?logo=github&color=238636&label=downloads)](https://github.com/LeafWulf/weatherfx/releases/1.1.4)

- Fix for Thunderstorm / Heavy Rain FX. Should be less performance demanding now.

## [1.1.3]
[![Supported Foundry Versions](https://img.shields.io/endpoint?url=https://foundryshields.com/version?url=https://github.com/paulo-roger/weatherfx/releases/download/1.1.3/module.json)](https://foundryvtt.com/packages/weatherfx)  
[![Downloads](https://img.shields.io/github/downloads/paulo-roger/weatherfx/1.1.3/module.zip?logo=github&color=238636&label=downloads)](https://github.com/LeafWulf/weatherfx/releases/1.1.3)

- Temporary fix. It gets the weatherData.precipitation from weather-control settings in case Weather FX doesn't have a string to use.

## [1.1.2]
[![Supported Foundry Versions](https://img.shields.io/endpoint?url=https://foundryshields.com/version?url=https://github.com/paulo-roger/weatherfx/releases/download/1.1.2/module.json)](https://foundryvtt.com/packages/weatherfx)  
[![Downloads](https://img.shields.io/github/downloads/paulo-roger/weatherfx/1.1.2/module.zip?logo=github&color=238636&label=downloads)](https://github.com/LeafWulf/weatherfx/releases/1.1.2)

- Added a check, a warning and a dialog in case the Weather Control output to chat option is set to off. Thanks [roi007leaf](https://github.com/roi007leaf) for the heads up.
- Now hook to check if the song should continue playing is on 'canvasReady' instead of 'ready'.
- Added Heavy Clouds missing image.

## [1.1.1]
[![Supported Foundry Versions](https://img.shields.io/endpoint?url=https://foundryshields.com/version?url=https://github.com/paulo-roger/weatherfx/releases/download/1.1.1/module.json)](https://foundryvtt.com/packages/weatherfx)  
[![Downloads](https://img.shields.io/github/downloads/paulo-roger/weatherfx/1.1.1/module.zip?logo=github&color=238636&label=downloads)](https://github.com/LeafWulf/weatherfx/releases/1.1.1)

- Fixed problem that images were not packed with the module.
- Changed the control icons (sun remove weather fx, sun-rain to apply weather fx)

## [1.1.0]
[![Supported Foundry Versions](https://img.shields.io/endpoint?url=https://foundryshields.com/version?url=https://github.com/paulo-roger/weatherfx/releases/download/1.1.0/module.json)](https://foundryvtt.com/packages/weatherfx)  
[![Downloads](https://img.shields.io/github/downloads/paulo-roger/weatherfx/1.1.0/module.zip?logo=github&color=238636&label=downloads)](https://github.com/LeafWulf/weatherfx/releases/1.1.0)

- **Now compatible with FVTT v9**
- You can chose not to use weather chat conditions
  
## [1.0.0]
[![Supported Foundry Versions](https://img.shields.io/endpoint?url=https://foundryshields.com/version?url=https://github.com/paulo-roger/weatherfx/releases/download/1.0.0/module.json)](https://foundryvtt.com/packages/weatherfx)  
[![Downloads](https://img.shields.io/github/downloads/paulo-roger/weatherfx/1.0.0/module.zip?logo=github&color=238636&label=downloads)](https://github.com/LeafWulf/weatherfx/releases/1.0.0)

- Intial release