import {thingKeys} from './ai/aiKinds';
import {CLOUD_SLIDERS, CLOUD_SWITCHES} from './cloud';
import {copyTag, partName, partValues} from './partCopies';

/** Reading key -> the part name the student sees on the board (soilMoisture -> "Soil Moisture Sensor"). */
const readingLabels = connections => {
    const labels = {};
    (connections || []).forEach(c => {
        const tag = copyTag(c, connections);
        partValues(c).forEach(v => {
            if (!labels[v.name]) {
                labels[v.name] = v.kind === 'humidity' ? `${partName(c, connections)} humidity` : `${v.label}${tag}`;
            }
        });
    });
    return labels;
};

/** Longest name a student can give a dashboard switch or slider. */
const CONTROL_NAME_MAX = 20;

/**
 * Titles in the student's words: reading keys become part names, the AI's readings
 * "AI: <thing>", and dashboard controls the names the student gave them ("Pump").
 * @param {Array} connections wired parts
 * @param {object} [ai] project AI
 * @param {object} [names] {switch1: 'Pump'} from the project's Cloud link
 * @returns {function(string): (string|null)} null for keys this project has no name for
 */
const keyTitles = (connections, ai, names) => {
    const labels = readingLabels(connections);
    const things = (ai && ai.things) || [];
    thingKeys(things).forEach((key, i) => {
        labels[key] = `AI: ${things[i].name}`;
    });
    CLOUD_SWITCHES.concat(CLOUD_SLIDERS).forEach(spec => {
        const given = names && typeof names[spec.key] === 'string' ? names[spec.key].trim() : '';
        if (given) {
            labels[spec.key] = given.slice(0, CONTROL_NAME_MAX);
        } else {
            delete labels[spec.key];
        }
    });
    return key => (Object.prototype.hasOwnProperty.call(labels, key) ? labels[key].slice(0, 40) : null);
};

/** The labels TinkerBit Cloud shows for these keys ({distance: 'HC-SR04 Ultrasonic', switch1: 'Pump'}). */
const cloudLabels = (keys, titleOf) => {
    const labels = {};
    keys.forEach(key => {
        if (titleOf(key)) {
            labels[key] = titleOf(key);
        }
    });
    return labels;
};

/** The Dashboard block's own name for a control key ("Dashboard switch 1"). */
const blockName = key => {
    const spec = CLOUD_SWITCHES.concat(CLOUD_SLIDERS).find(c => c.key === key);
    return spec ? spec.label : key;
};

export {CONTROL_NAME_MAX, blockName, cloudLabels, keyTitles, readingLabels};
