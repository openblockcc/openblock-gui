import 'openblock-blocks/arduino_compressed';
import 'openblock-blocks/python_compressed';

const getLanguageFromDeviceType = deviceType => {
    if (deviceType === 'arduino') {
        return 'cpp';
    } else if (deviceType === 'microbit' || deviceType === 'raspberrypico' || deviceType === 'maixduino') {
        return 'python';
    }
    return 'null';
};

const getGeneratorNameFromDeviceType = deviceType => {
    if (deviceType === 'arduino') {
        return 'Arduino';
    } else if (deviceType === 'microbit' || deviceType === 'raspberrypico' || deviceType === 'maixduino') {
        return 'Python';
    }
    return 'null';
};

export {
    getLanguageFromDeviceType,
    getGeneratorNameFromDeviceType
};
