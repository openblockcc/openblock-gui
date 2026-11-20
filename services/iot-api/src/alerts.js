/**
 * Threshold rule with hysteresis. Example: "soil < 30, hysteresis 5" triggers below 30 and
 * only re-arms once the value climbs back to 35, so a value hovering at 30 cannot spam.
 * Fires on the inactive -> active edge, and only if the cooldown since the last fire has passed.
 *
 * @param {{op: string, threshold: number, hysteresis: number, cooldown_sec: number,
 *          active: number, last_fired: number|null}} rule
 * @param {number} value
 * @param {number} now epoch ms
 * @returns {{active: boolean, fire: boolean, lastFired: number|null, changed: boolean}}
 */
export function evaluateRule (rule, value, now) {
    const th = rule.threshold;
    const h = rule.hysteresis || 0;
    let trigger;
    let clear;
    switch (rule.op) {
    case '<':
        trigger = value < th;
        clear = value >= th + h;
        break;
    case '<=':
        trigger = value <= th;
        clear = value > th + h;
        break;
    case '>':
        trigger = value > th;
        clear = value <= th - h;
        break;
    case '>=':
        trigger = value >= th;
        clear = value < th - h;
        break;
    default:
        return {active: Boolean(rule.active), fire: false, lastFired: rule.last_fired, changed: false};
    }
    const wasActive = Boolean(rule.active);
    if (!wasActive && trigger) {
        const cooled = rule.last_fired === null || rule.last_fired === undefined ||
            now - rule.last_fired >= rule.cooldown_sec * 1000;
        return {
            active: true,
            fire: cooled,
            lastFired: cooled ? now : rule.last_fired,
            changed: true
        };
    }
    if (wasActive && clear) {
        return {active: false, fire: false, lastFired: rule.last_fired, changed: true};
    }
    return {active: wasActive, fire: false, lastFired: rule.last_fired, changed: false};
}

export function ruleMessage (rule, value, deviceName, label) {
    if (rule.message) {
        return rule.message;
    }
    const shown = Number.isInteger(value) ? value : Number(value.toFixed(2));
    return `${deviceName}: ${label || rule.key} is ${shown} (${rule.op} ${rule.threshold})`;
}
