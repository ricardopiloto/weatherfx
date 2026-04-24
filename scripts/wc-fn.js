import { MODULE, i18nTodaysWeather } from "./const.js";
import { removeTemperature, getKeyByVal, extractDslfTripleFromMessage, extractWeatherControlPayloadAfterTemp } from "./util.js"
import { toggleApp, autoApply, linkWeatherToGI } from "./settings.js"
import { lang, fvttVersion, weatherEffects } from "./weatherfx.js";
import { createEffect, Effect } from "./effect.js"

export async function weatherControlHooks() {
    if (game.modules.get('weather-control').active) {
        Hooks.on('renderT', async function (app, html, data) {
            if (!isChatOutputOn()) {
                noChatOutputDialog();
            }
            if (!game.settings.get("weatherfx", "currentWeather"))
                await getPrecipitation();
        })

        // Hook on every created message, if this is a message created with the alias "Today's Weather", then trigger the Weather FX part. 
        Hooks.on('createChatMessage', async function (message) {
            let todaysWeather = await langJson()
            todaysWeather = todaysWeather[i18nTodaysWeather]
            let sceneAutoApply = game.scenes.viewed.getFlag('weatherfx', 'auto-apply') ? true : false;
            if (fvttVersion < 10) //compatibility with v9
                message = message.data
            if (message.speaker.alias == todaysWeather) {
                const legacyEiS = game.settings.get("weather-control", "legacyEnemyInShadowsWeather");
                const payloadForStore =
                    legacyEiS === false
                        ? extractWeatherControlPayloadAfterTemp(message.content) || removeTemperature(message.content) || ""
                        : removeTemperature(message.content);
                await game.settings.set(MODULE, "currentWeather", payloadForStore);
                const shouldApplyForScene = !linkWeatherToGI || !!canvas.scene?.globalLight;
                if (shouldApplyForScene && autoApply && sceneAutoApply) {
                    checkWeather(message.content);
                }
            }
        });
    }
}

// this function should be a temporary fix. It gets the weatherData.precipitation from weather-control settings in case Weather FX doesn't have a string to use.
export async function getPrecipitation() {
    let weatherData = await game.settings.get("weather-control", "weatherData").precipitation
    await game.settings.set("weatherfx", "currentWeather", weatherData)
    return weatherData
}

export function toggleWeatherControl() {
    const defaultPosition = { top: 100 * toggleApp, left: 100 * toggleApp };
    game.settings.set("weatherfx", "toggleApp", toggleApp * -1)
    const element = document.getElementById('weather-control-container');
    if (element) {
        element.style.top = defaultPosition.top + 'px';
        element.style.left = defaultPosition.left + 'px';
        element.style.bottom = null;
    }
}

export function isChatOutputOn() {
    let outputWeatherChat = game.settings.get('weather-control', 'outputWeatherChat')
    // let precipitation = app.weatherTracker.weatherData.precipitation
    if (!outputWeatherChat) {
        const errorMessage = "Weather FX cannot initialize and requires Weather Control 'Output weather to chat?' setting checked in order to get the current weather and apply effects to the current canvas.";
        console.error(errorMessage);
        ui.notifications.error(errorMessage);
    }
    return outputWeatherChat
}

export function noChatOutputDialog() {
    new Dialog({
        title: "No weather data!",
        content: "<p>Please activate <b>Weather Control</b> output to chat, otherwise Weather FX can't access its data</p>",
        buttons: {
            yes: {
                icon: "<i class='fas fa-check'></i>",
                label: "Activate",
                callback: async () => {
                    await game.settings.set('weather-control', 'outputWeatherChat', true)
                    await getPrecipitation();
                }
            },
            no: {
                icon: "<i class='fas fa-times'></i>",
                label: "No, I won't",
                callback: async () => {
                    return
                }
            },
        },
        default: "yes",
    }).render(true);
}

export async function langJson(language = lang) {
    let file = await fetch(`modules/weather-control/lang/${language}.json`);
    let json = await file.json();
    return json;
}

function isWeatherControlDslfMode() {
    return (
        game.modules.get("weather-control")?.active &&
        game.settings.get("weather-control", "legacyEnemyInShadowsWeather") === false
    );
}

/**
 * Map DSLF triple (Deft Steps / non-legacy Weather Control) to createEffect id.
 * Precedence: precipitation (snow/rain intensity) → visibility (fog) → wind (clouds).
 */
function dslfTripleToEffectName(triple) {
    const p = triple.precipitation;
    const v = triple.visibility;
    const w = triple.wind;

    if (p.includes("blizzard")) return "blizzard";
    if (p.includes("snow")) {
        if (p.includes("heavy") || p.includes("large") || p.includes("very")) return "moderateSnow";
        return "lightSnow";
    }
    if (p.includes("very heavy") || p.includes("torrential") || p.includes("downpour")) return "thunderstorm";
    if (p.includes("heavy") && !p.includes("snow")) return "heavyRain";
    if (p === "light" || p.includes("drizzle") || (p.includes("light") && p.includes("rain"))) return "lightRain";
    if (p.includes("moderate")) return "moderateRain";
    if (p.includes("rain")) return "moderateRain";

    const noneLike =
        p === "none" ||
        p === "nil" ||
        p === "—" ||
        p === "-" ||
        p.trim().length === 0;

    if (noneLike) {
        if (v.includes("thick")) return "mostlyCloudy";
        if (v.includes("mist") || v.includes("fog")) return "fair";
        if (w.includes("very strong")) return "partlyCloudy";
        if (w.includes("strong")) return "partlyCloudy";
        if (w.includes("medium")) return "partlyCloudy";
        if (v.includes("clear")) {
            const windTier = normalizeDslfWindToken(w);
            if (windTier === "still" || windTier === "light") return "scatteredClearSky";
        }
        return "clear";
    }

    return null;
}

/**
 * Normalize Weather Control / DSLF wind token (English) to a tier.
 * Order matters: "very strong" is matched before "strong"; "light" before substring noise.
 */
function normalizeDslfWindToken(windRaw) {
    const s = (windRaw || "").toLowerCase().trim();
    if (!s) return "medium";
    if (s.includes("very") && s.includes("strong")) return "very strong";
    if (s.includes("strong")) return "strong";
    if (s.includes("medium")) return "medium";
    if (s.includes("light")) return "light";
    if (s.includes("still") || s.includes("calm")) return "still";
    return "medium";
}

/** Multiplier applied to fog/cloud particle `options.speed` (DSLF wind). */
function dslfWindTierSpeedMultiplier(tier) {
    switch (tier) {
        case "still":
            return 0.45;
        case "light":
            return 0.85;
        case "medium":
            return 1.15;
        case "strong":
            return 1.55;
        case "very strong":
            return 2.0;
        default:
            return 1.0;
    }
}

function duplicateForParticles(obj) {
    if (typeof foundry !== "undefined" && foundry.utils?.duplicate)
        return foundry.utils.duplicate(obj);
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Clone effect condition and scale fog/cloud speeds by DSLF wind (does not mutate effect.js presets).
 */
function applyDslfWindToEffectCondition(condition, windRaw) {
    const tier = normalizeDslfWindToken(windRaw);
    const mult = dslfWindTierSpeedMultiplier(tier);
    const minSp = 0.12;
    const maxSp = 4.5;
    const newEffects = (condition.effectsArray || []).map((p) => {
        const layer = duplicateForParticles(p);
        if (layer?.type !== "fog" && layer?.type !== "clouds") return layer;
        if (layer.options && typeof layer.options.speed === "number") {
            layer.options.speed = Math.min(maxSp, Math.max(minSp, layer.options.speed * mult));
        }
        return layer;
    });
    const filters = condition.filtersArray?.length
        ? duplicateForParticles(condition.filtersArray)
        : [];
    return new Effect(
        condition.name,
        condition.id,
        condition.hasSound,
        condition.sound,
        condition.soundName,
        newEffects,
        filters
    );
}

// checks the string for which weather was generated, create the effect and passes it as argument for Weather Effects function.
export async function checkWeather(msgString) {
    const raw = msgString != null && typeof msgString === "string" ? msgString : String(msgString ?? "");

    if (isWeatherControlDslfMode()) {
        const triple = extractDslfTripleFromMessage(raw);
        if (triple) {
            const effectName = dslfTripleToEffectName(triple);
            if (effectName) {
                const base = createEffect(effectName);
                const withWind = applyDslfWindToEffectCondition(base, triple.wind);
                return weatherEffects(withWind);
            }
        }
    }

    const weatherObject = await langJson();
    const comparableString = await getKeyByVal(weatherObject, raw);
    const enJson = await langJson("en");
    const enValue = comparableString != null ? enJson[comparableString] : undefined;
    msgString = (typeof enValue === "string" ? enValue : raw).toLowerCase();

    if (msgString.includes('rain')) {
        if (msgString.includes('heavy') || msgString.includes('monsoon')) {
            return weatherEffects(createEffect('heavyRain'));
        }
        else if (msgString.includes('firey')) {
            return console.log('🐺******** Preciso fazer ainda: FIERY');
        }
        else if (msgString.includes('freezing')) {
            return weatherEffects(createEffect('moderateFreezingRain'));
        }
        else if (msgString.includes('torrential')) {
            return weatherEffects(createEffect('thunderstorm'));
        }
        else
            return weatherEffects(createEffect('moderateRain'));
    }

    else if (msgString.includes('overcast')) {
        switch (true) {
            case msgString.includes('freezing'): return weatherEffects(createEffect('overcastFreezing'));
            case msgString.includes('drizzles'): return weatherEffects(createEffect('overcastDrizzle'));
            case msgString.includes('snow'): return weatherEffects(createEffect('overcastSnow'));
        }
    }
    else if (msgString.includes('snow')) {
        switch (true) {
            case msgString.includes('large'): return weatherEffects(createEffect('moderateSnow'));
            case msgString.includes('light'): return weatherEffects(createEffect('lightSnow'));
        }
    }
    else if (msgString.includes('flooding'))
        return weatherEffects(createEffect('thunderstorm'));

    else if (msgString.includes('blizzard'))
        return weatherEffects(createEffect('blizzard'));

    else if (msgString.includes('icestorm') || (msgString.includes('ice') && msgString.includes('storm')))
        return weatherEffects(createEffect('iceStorm'));

    else if (msgString.includes('clear sky'))
        return weatherEffects(createEffect('clear'));

    else if (msgString.includes('dark'))
        return weatherEffects(createEffect('darkSky'));

    else if (msgString.includes('scattered clouds'))
        return weatherEffects(createEffect('partlyCloudy'));

    else if (msgString.includes('sun') || msgString.includes('volcano'))
        return weatherEffects(createEffect('sunAsh'));

    else if (msgString.includes('ashfall') || msgString.includes('ashen'))
        return weatherEffects(createEffect('ashfall'));

    else if (msgString.includes('drought'))
        return weatherEffects(createEffect('drought'));

    else if (msgString.includes('hail'))
        return weatherEffects(createEffect('hailStorm'));
}

