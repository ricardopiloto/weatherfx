import { MODULE, playlistName } from "./const.js";
import { getKeyByVal } from "./util.js"
import { registerSettings, cacheSettings, enableSound, autoApply, instantApply, linkWeatherToGI, enableHB, blizzardSound, rainSound, heavyRainSound, thunderstormSound, weatherSource, currentWeather } from "./settings.js"; //import settings variables and function that register those settings.
import { createEffect } from "./effect.js"; //import function that create the effects
import { generatePlaylist, addSound } from "./playlist.js"
import { firstTime } from "./patchPlaylist.js";
import { weatherRoll } from "./weather-conditions.js"
import { smallWeatherString } from "./sw-fn.js"
import { getPrecipitation, toggleWeatherControl, isChatOutputOn, noChatOutputDialog, weatherControlHooks, checkWeather } from "./wc-fn.js"

let dnd5e = false
export let lang

//Compatibility with v9
export let fvttVersion
export let particleWeather = 'fxmaster.updateParticleEffects'

// Hook that trigger once when the game is initiated. Register and cache settings.
Hooks.once("init", () => {
    // registerWrappers();
    checkSystem(game.system.id); //check if dnd5e
    registerSettings();
    cacheSettings();
});

// Hook that triggers when the game is ready. Check if there is a weather effect been played, then check if sound is enabled and restart the sound that should be played.
Hooks.once('ready', async function () {
    fvttVersion = game.release?.generation ?? parseInt(game.version)
    lang = game.i18n.lang
    console.log(" ======================================== ⛈ Weather FX  ======================================== ")
    console.log(" =================================== FoundryVTT Version: ", fvttVersion, " =================================== ")
    //compatibility with v9
    if (fvttVersion < 10) {
        particleWeather = 'fxmaster.updateWeather'
    }
    await weatherControlHooks();
    await weatherfxPlaylistExists();
});

Hooks.on('ready', async function () {
    game.socket.on('module.weatherfx', async (data) => {
        await doSocket(data);
    });
});

Hooks.on('canvasReady', async function () {
    const thisScene = game.scenes.viewed
    defaultAutoApplyFlag(thisScene)
    if (await canvas.scene.getFlag("weatherfx", "active") !== undefined || await canvas.scene.getFlag("weatherfx", "audio") || await canvas.scene.getFlag("weatherfx", "currentWeather"))
        await firstTime();
})

Hooks.on('renderSceneConfig', async (app, html) => {
    defaultAutoApplyFlag(app.object);
    const autoapplyCheckStatus = app.object.getFlag('weatherfx', 'auto-apply') ? 'checked' : '';
    const injection = `
    <hr>
    <style> .wfx-scene-config {
        border: 1px solid #999;
        border-radius: 8px;
        margin: 8px 0;
        padding: 0 15px 5px 15px;
    }</style>
    <fieldset class="wfx-scene-config">
      <legend> <i class="fas fa-cloud-sun"></i><span>Weather FX</span> </legend>
      <div class="form-group">
        <label>Auto Apply</label>
        <input
          type="checkbox"
          name="flags.weatherfx.auto-apply"
          ${autoapplyCheckStatus}>
        <p class="notes">Toggle auto-apply weather effects to the scene.</p>
      </div>
    </fieldset>`;
    const weatherEffect = html.find('select[name="weather"]');
    const formGroup = weatherEffect.closest(".form-group");
    formGroup.after(injection);
    app.setPosition({ height: "auto" });
})

Hooks.on('smallweatherUpdate', async function (weather, hourly) {
    // await game.settings.set(MODULE, "currentWeather", currentWeather)
    // cacheSettings();
    let sceneAutoApply = game.scenes.viewed.getFlag('weatherfx', 'auto-apply') ? true : false;
    if (!linkWeatherToGI || canvas.scene.globalLight)
        if (autoApply && sceneAutoApply) await smallWeatherString(weather, hourly)
    await game.settings.set(MODULE, 'currentWeather', weather)
})

// This add the control buttons so GM can control 'clear weather effects' or 'apply weather effects'
// Foundry v13+: controls is a Record (e.g. controls.tokens), tools is a Record; use onChange, not onClick.
Hooks.on("getSceneControlButtons", (controls) => {
    const tokenControl = controls.tokens;
    if (!tokenControl?.tools) return;
    const tokenOrder = Object.keys(tokenControl.tools).length;
    tokenControl.tools.clearWeather = {
        name: "clearWeather",
        title: "Clear Weather",
        icon: "fas fa-sun",
        order: tokenOrder,
        button: true,
        visible: game.user.isGM,
        onChange: () => {
            clearEffects();
            if (weatherSource === 'smallweather')
                ChatMessage.create({ speaker: { alias: 'Weather FX: ' }, content: "Weather effects for: " + game.settings.get("weatherfx", "currentWeather").conditions + " <b style='color:red'>removed</b>", whisper: ChatMessage.getWhisperRecipients("GM") });
            else
                ChatMessage.create({ speaker: { alias: 'Weather FX: ' }, content: "Weather effects for: " + game.settings.get("weatherfx", "currentWeather") + " <b style='color:red'>removed</b>", whisper: ChatMessage.getWhisperRecipients("GM") });
        },
    };
    tokenControl.tools.applyWeatherFX = {
        name: "applyWeatherFX",
        title: "Apply Weather FX",
        icon: "fas fa-cloud-sun-rain",
        order: tokenOrder + 1,
        button: true,
        visible: game.user.isGM,
        onChange: async () => {
            if (weatherSource === 'weather-control' && game.modules.get('weather-control').active) {
                if (!game.settings.get("weatherfx", "currentWeather"))
                    await getPrecipitation();
                if (isChatOutputOn()) {
                    let currentWeather = game.settings.get("weatherfx", "currentWeather");
                    checkWeather(currentWeather);
                } else noChatOutputDialog();
            } else if (weatherSource === 'smallweather' && game.modules.get('smallweather').active) {
                await smallWeatherString(currentWeather);
            }
        },
    };
    if (game.modules.get('weather-control')?.active && controls.notes?.tools) {
        const notesOrder = Object.keys(controls.notes.tools).length;
        controls.notes.tools["toggle-weatherApp"] = {
            name: "toggle-weatherApp",
            title: "Toggle Weather Control",
            icon: "fas fa-cloud-sun",
            order: notesOrder,
            button: true,
            visible: game.user.isGM,
            onChange: () => toggleWeatherControl(),
        };
    }
});

function defaultAutoApplyFlag(scene) {
    if (scene.getFlag('weatherfx', 'auto-apply') === undefined) {
        scene.setFlag('weatherfx', 'auto-apply', autoApply);
    }
}

function checkSystem(system) {
    if (system === 'dnd5e')
        dnd5e = true
}

// This function apply weather effects to the canvas, but first cleans any effects that are currently applied.
export async function weatherEffects(effectCondition) {
    await clearEffects();

    await canvas.scene.setFlag("weatherfx", "isActive", true);
    await canvas.scene.setFlag("weatherfx", "effectCondition", effectCondition);

    if (effectCondition.effectsArray.length > 0)
        Hooks.call(particleWeather, effectCondition.effectsArray)

    if (effectCondition.filtersArray.length > 0) {
        effectCondition.filtersArray.forEach((f, i) => {
            FXMASTER.filters.addFilter("weatherfx_" + i, f.type, f.options);
        });
    }

    if (enableSound && effectCondition.hasSound) {
        let playlist = game.playlists.getName(playlistName);
        let sound = playlist.sounds.getName(effectCondition.soundName);
        playlist.playSound(sound);
    }
    if (instantApply) await instantWeather();

    if (effectCondition.type == '' || !dnd5e || !enableHB)
        return;
    else
        return weatherRoll(effectCondition.id);
}

// Remove all current fx on the canvas and stop matching sound. Clears all FXMaster scene effects on this scene (including from other modules).
async function clearEffects() {
    const effectCondition = canvas.scene.getFlag("weatherfx", "effectCondition") ?? {};
    // Clear particle effects: hook + FXMaster scene flag so API Effects list and canvas are cleared (per FXMaster README).
    Hooks.call(particleWeather, []);
    if (canvas.scene.getFlag("fxmaster", "effects") !== undefined)
        await canvas.scene.unsetFlag("fxmaster", "effects");
    // Remove filters by ID so FXMaster reliably clears them (per FXMaster API: removeFilter("myfilterID"))
    const filtersArray = effectCondition.filtersArray ?? [];
    for (let i = 0; i < filtersArray.length; i++) {
        try { FXMASTER.filters.removeFilter("weatherfx_" + i); } catch (_) { /* ignore if already removed */ }
    }
    FXMASTER.filters.setFilters([]);
    if (enableSound && effectCondition.hasSound) {
        const playlist = game.playlists?.getName(playlistName);
        const sound = playlist?.sounds?.getName(effectCondition.soundName);
        if (sound?.playing) playlist.stopSound(sound);
    }
    await canvas.scene.setFlag("weatherfx", "isActive", false);
    if (instantApply) await instantWeather();
}

async function weatherfxPlaylistExists() {
    let playlist = game.playlists?.contents.find((p) => p.name === playlistName);
    let playlistExists = playlist ? true : false;
    if (!playlistExists) await weatherfxPlaylist(playlistName);
}

export async function weatherfxPlaylist(playlistName) {
    await generatePlaylist(playlistName);
    await addSound('blizzard', blizzardSound);
    await addSound('rain', rainSound);
    await addSound('heavyRain', heavyRainSound);
    await addSound('thunderstorm', thunderstormSound);
}

// Helper function for handling sockets.
function emitSocket(type, payload) {
    game.socket.emit('module.weatherfx', {
        type: type,
        payload: payload,
    });
}
async function doSocket(data) {
    if (data.type === 'instantWeather') {
        await instantWeatherPlayer();
    }
}
async function instantWeatherPlayer() {
    await canvas.draw()
}
async function instantWeather() {
    await new Promise(resolve => setTimeout(resolve, 800));
    await canvas.draw()
    emitSocket('instantWeather');
}