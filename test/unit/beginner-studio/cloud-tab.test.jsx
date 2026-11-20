import {cloudLabels, keyTitles} from '../../../src/beginner-studio/domain/cloudPanel';
import {moduleById} from '../../../src/beginner-studio/domain/modules';
import {templateById} from '../../../src/beginner-studio/domain/templates';
import {isAutoTitle} from '../../../src/iot/format';

const parking = templateById('cloud-parking');

describe('dashboard titles in the student\'s words', () => {
    test('reading keys become part names, controls the names the student gave them', () => {
        const ultra = parking.connections.map(c => moduleById(c.moduleId)).find(m => m && m.valueName === 'distance');
        const titleOf = keyTitles(parking.connections, null, {switch1: '  Pump ', slider1: ' ', switch2: 'A very long name for a pump'});
        expect(titleOf('distance')).toBe(ultra.name);
        expect(titleOf('switch1')).toBe('Pump');
        expect(titleOf('switch2')).toBe('A very long name for');
        // Unnamed controls have no title here; TinkerBit Cloud calls them "Switch 1", "Slider 1".
        expect(titleOf('slider1')).toBeNull();
        expect(keyTitles(parking.connections)('switch3')).toBeNull();
    });

    test('Cloud labels: part names for readings, given names for controls', () => {
        const titleOf = keyTitles(parking.connections, null, {switch1: 'Pump'});
        expect(cloudLabels(['distance', 'switch1', 'slider1'], titleOf))
            .toEqual({distance: titleOf('distance'), switch1: 'Pump'});
    });

    test('keys the project does not know have no title, including object keys', () => {
        const titleOf = keyTitles(parking.connections);
        expect(titleOf('soilMoisture')).toBeNull();
        expect(titleOf('toString')).toBeNull();
        expect(titleOf('__proto__')).toBeNull();
        expect(keyTitles([])('distance')).toBeNull();
    });

    test('humidity gets its own name next to the temperature', () => {
        const titleOf = keyTitles([{id: 'c1', moduleId: 'dht', portId: 'D13'}]);
        expect(titleOf('temperature')).toBe(moduleById('dht').name);
        expect(titleOf('humidity')).toBe(`${moduleById('dht').name} humidity`);
    });

    test('only titles nobody typed count as automatic', () => {
        expect(isAutoTitle({key: 'distance', title: 'distance'})).toBe(true);
        expect(isAutoTitle({key: 'distance', title: 'Distance'})).toBe(true);
        expect(isAutoTitle({key: 'distance', title: ''})).toBe(true);
        expect(isAutoTitle({key: 'distance'})).toBe(true);
        expect(isAutoTitle({key: 'switch1', title: 'switch 1'})).toBe(true);
        expect(isAutoTitle({key: 'switch1', title: 'Switch 1'})).toBe(true);
        expect(isAutoTitle({key: 'distance', title: 'Car park'})).toBe(false);
        // Older Studio dashboards titled controls after the block; those follow new names too.
        expect(isAutoTitle({key: 'switch1', title: 'Dashboard switch 1'})).toBe(true);
        expect(isAutoTitle({key: 'slider2', title: 'Dashboard slider 2 (0–100)'})).toBe(true);
        expect(isAutoTitle({key: 'switch1', title: 'Dashboard switch 2'})).toBe(false);
    });
});
