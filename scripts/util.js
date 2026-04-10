import { MODULE, MODULE_DIR, JSON_ITEM } from "./const.js"; //import the const variables

export async function getKeyByVal(obj, val) {
    let valuesArray = Object.values(obj)
    let keysArray = Object.keys(obj)
    for (var i = 0; i < valuesArray.length; i++)
        if (valuesArray[i] == val)
            return keysArray[i]
}

export function removeTags(str) { //function to remove html tags from the message string
    if ((str === null) || (str === ''))
        return false;
    else
        str = str.toString();
    return str.replace(/(<([^>]+)>)/ig, '');
}

// remove the temperature from the message string.
export function removeTemperature(string){
    if ((string === null) || (string === ''))
        return false;
    else
        string = string.toString();
    return string.replace(/.+(?<= - )/ig, '');
}

/**
 * Plain text after " - " (temperature prefix stripped). Used when Weather Control
 * emits DSLF / non-legacy lines: "<b>20 °C</b> - None; Clear; Light".
 */
export function extractWeatherControlPayloadAfterTemp(htmlOrText) {
    if (htmlOrText == null || htmlOrText === '') return '';
    let plain = removeTags(htmlOrText.toString());
    if (plain === false || plain === '') return '';
    const idx = plain.indexOf(' - ');
    if (idx === -1) return plain.trim();
    return plain.slice(idx + 3).trim();
}

/**
 * Parse non-legacy triple: Precipitation; Visibility; Wind (English tokens).
 * Returns null if the string does not match.
 */
export function extractDslfTripleFromMessage(htmlOrText) {
    const rest = extractWeatherControlPayloadAfterTemp(htmlOrText);
    if (!rest) return null;
    const parts = rest.split(';').map((p) => p.trim()).filter(Boolean);
    if (parts.length < 3) return null;
    return {
        precipitation: parts[0].toLowerCase(),
        visibility: parts[1].toLowerCase(),
        wind: parts[2].toLowerCase(),
    };
}

export function getTemp(string) { //function to get the temperature from the message string, currently not been used.
    let input = ''
    for (var i = 0; i < string.length; i++) {
        if (string[i] === " ") {
            return parseFloat(input);
        } else {
            input += string[i];
        }
    }
}

//function to generate a json from an actual in-game item inside a particular actor called 'Weather Effects', could be reused in future.
export function getItemDesc() { 
    let itemCollection = game.actors.getName('Weather Effects').items
    let itemDescArray = []
    let itemDesc, fileJson

    itemCollection.contents.forEach(function (item) {
        itemDesc = item.system.description.value;
        itemDescArray.push({
            name: item.name,
            description: itemDesc,
            save: {
                dc: item.system.save.dc,
                ability: item.system.save.ability
            }
        });
    });
    fileJson = JSON.stringify(itemDescArray)
    var blob = new Blob([fileJson], { type: 'text/plain' });
    var file = new File([blob], 'weather-item.json', { type: "text/plain" });
    FilePicker.upload('data', MODULE_DIR, file, {}, { notify: true })
}