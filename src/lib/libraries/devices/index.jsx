import React from 'react';
import {FormattedMessage} from 'react-intl';
import defaultsDeep from 'lodash.defaultsdeep';
import log from '../../log';

import arduinoBaseToolBox from './baseToolbox/arduino';
import microbitBaseToolBox from './baseToolbox/microbit';

import arduinoUnoIconURL from './arduinoUno/arduinoUno.png';
import arduinoUnoConnectionIconURLL from './arduinoUno/arduinoUno-illustration.svg';
import arduinoUnoConnectionSmallIconURL from './arduinoUno/arduinoUno-small.svg';

import arduinoNanoIconURL from './arduinoNano/arduinoNano.png';
import arduinoNanoConnectionIconURLL from './arduinoNano/arduinoNano-illustration.svg';
import arduinoNanoConnectionSmallIconURL from './arduinoNano/arduinoNano-small.svg';

import arduinoMiniIconURL from './arduinoMini/arduinoMini.png';
import arduinoMiniConnectionIconURLL from './arduinoMini/arduinoMini-illustration.svg';
import arduinoMiniConnectionSmallIconURL from './arduinoMini/arduinoMini-small.svg';

import arduinoLeonardoIconURL from './arduinoLeonardo/arduinoLeonardo.png';
import arduinoLeonardoConnectionIconURLL from './arduinoLeonardo/arduinoLeonardo-illustration.svg';
import arduinoLeonardoConnectionSmallIconURL from './arduinoLeonardo/arduinoLeonardo-small.svg';

import arduinoMega2560IconURL from './arduinoMega2560/arduinoMega2560.png';
import arduinoMega2560ConnectionIconURLL from './arduinoMega2560/arduinoMega2560-illustration.svg';
import arduinoMega2560ConnectionSmallIconURL from './arduinoMega2560/arduinoMega2560-small.svg';

import microbitIconURL from './microbit/microbit.png';
import microbitConnectionIconURLL from './microbit/microbit-illustration.svg';
import microbitConnectionSmallIconURL from './microbit/microbit-small.svg';

import microbitV2IconURL from './microbitV2/microbitV2.png';
import microbitV2ConnectionIconURLL from './microbitV2/microbitV2-illustration.svg';
import microbitV2ConnectionSmallIconURL from './microbitV2/microbitV2-small.svg';

import maixduinoIconURL from './maixduino/maixduino.png';
import maixduinoConnectionIconURLL from './maixduino/maixduino-illustration.svg';
import maixduinoConnectionSmallIconURL from './maixduino/maixduino-small.svg';

import esp32IconURL from './esp32/esp32.png';
import esp32ConnectionIconURLL from './esp32/esp32-illustration.svg';
import esp32ConnectionSmallIconURL from './esp32/esp32-small.svg';

import makeymakeyIconURL from './makeymakey/makeymakey.png';
import makeymakeyConnectionIconURL from './makeymakey/makeymakey-illustration.svg';
import makeymakeyConnectionSmallIconURL from './makeymakey/makeymakey-small.svg';

const deviceData = [
    {
        name: 'Arduino Uno',
        deviceId: 'arduinoUno',
        manufactor: 'arduino.cc',
        leanMore: 'https://store.arduino.cc/usa/arduino-uno-rev3',
        type: 'arduino',
        iconURL: arduinoUnoIconURL,
        description: (
            <FormattedMessage
                defaultMessage="A great board to get started with electronics and coding."
                description="Description for the Arduino Uno device"
                id="gui.device.arduinoUno.description"
            />
        ),
        featured: true,
        disabled: false,
        bluetoothRequired: false,
        serialportRequired: true,
        defaultBaudRate: '9600',
        internetConnectionRequired: false,
        launchPeripheralConnectionFlow: true,
        useAutoScan: false,
        connectionIconURL: arduinoUnoConnectionIconURLL,
        connectionSmallIconURL: arduinoUnoConnectionSmallIconURL,
        connectingMessage: (
            <FormattedMessage
                defaultMessage="Connecting"
                description="Message to help people connect to their arduino."
                id="gui.device.arduino.connectingMessage"
            />
        ),
        baseToolBoxXml: arduinoBaseToolBox,
        programMode: ['realtime', 'upload'],
        programLanguage: ['block', 'c', 'cpp'],
        tags: ['arduino'],
        helpLink: 'https://store.arduino.cc/usa/arduino-uno-rev3'
    },
    {
        name: 'Arduino Nano',
        deviceId: 'arduinoNano',
        manufactor: 'arduino.cc',
        leanMore: 'https://store.arduino.cc/usa/arduino-nano',
        type: 'arduino',
        iconURL: arduinoNanoIconURL,
        description: (
            <FormattedMessage
                defaultMessage="The Arduino Nano is a classic small board to build your projects with."
                description="Description for the Arduino Nano device"
                id="gui.device.arduinoNano.description"
            />
        ),
        featured: true,
        disabled: false,
        bluetoothRequired: false,
        serialportRequired: true,
        defaultBaudRate: '9600',
        internetConnectionRequired: false,
        launchPeripheralConnectionFlow: true,
        useAutoScan: false,
        connectionIconURL: arduinoNanoConnectionIconURLL,
        connectionSmallIconURL: arduinoNanoConnectionSmallIconURL,
        connectingMessage: (
            <FormattedMessage
                defaultMessage="Connecting"
                description="Message to help people connect to their arduino."
                id="gui.device.arduino.connectingMessage"
            />
        ),
        baseToolBoxXml: arduinoBaseToolBox,
        programMode: ['realtime', 'upload'],
        programLanguage: ['block', 'c', 'cpp'],
        tags: ['arduino'],
        helpLink: 'https://store.arduino.cc/usa/arduino-nano'
    },
    {
        name: 'Arduino Mini',
        deviceId: 'arduinoMini',
        manufactor: 'arduino.cc',
        // Discontinued board
        // leanMore: 'https://store.arduino.cc/usa/arduino/boards-modules',
        type: 'arduino',
        iconURL: arduinoMiniIconURL,
        description: (
            <FormattedMessage
                defaultMessage="The Arduino Mini a classic smaller board to build your projects with."
                description="Description for the Arduino Mini device"
                id="gui.device.arduinoMini.description"
            />
        ),
        featured: true,
        disabled: false,
        bluetoothRequired: false,
        serialportRequired: true,
        defaultBaudRate: '9600',
        internetConnectionRequired: false,
        launchPeripheralConnectionFlow: true,
        useAutoScan: false,
        connectionIconURL: arduinoMiniConnectionIconURLL,
        connectionSmallIconURL: arduinoMiniConnectionSmallIconURL,
        connectingMessage: (
            <FormattedMessage
                defaultMessage="Connecting"
                description="Message to help people connect to their arduino."
                id="gui.device.arduino.connectingMessage"
            />
        ),
        baseToolBoxXml: arduinoBaseToolBox,
        programMode: ['realtime', 'upload'],
        programLanguage: ['block', 'c', 'cpp'],
        tags: ['arduino']
        // helpLink: 'https://store.arduino.cc/usa/arduino-nano'
    },
    {
        name: 'Arduino Leonardo',
        deviceId: 'arduinoLeonardo',
        manufactor: 'arduino.cc',
        leanMore: 'https://store.arduino.cc/usa/leonardo',
        type: 'arduino',
        iconURL: arduinoLeonardoIconURL,
        description: (
            <FormattedMessage
                defaultMessage="The classic Arduino board that can act as a mouse or keyboard."
                description="Description for the Arduino Leonardo device"
                id="gui.device.arduinoLeonardo.description"
            />
        ),
        featured: true,
        disabled: false,
        bluetoothRequired: false,
        serialportRequired: true,
        defaultBaudRate: '9600',
        internetConnectionRequired: false,
        launchPeripheralConnectionFlow: true,
        useAutoScan: false,
        connectionIconURL: arduinoLeonardoConnectionIconURLL,
        connectionSmallIconURL: arduinoLeonardoConnectionSmallIconURL,
        connectingMessage: (
            <FormattedMessage
                defaultMessage="Connecting"
                description="Message to help people connect to their arduino."
                id="gui.device.arduino.connectingMessage"
            />
        ),
        baseToolBoxXml: arduinoBaseToolBox,
        programMode: ['upload'], // due to the software serilport realtim mode is unstable
        programLanguage: ['block', 'c', 'cpp'],
        tags: ['arduino'],
        helpLink: 'https://store.arduino.cc/usa/leonardo'
    },
    {
        name: 'Arduino Mega 2560',
        deviceId: 'arduinoMega2560',
        manufactor: 'arduino.cc',
        leanMore: 'https://store.arduino.cc/usa/mega-2560-r3',
        type: 'arduino',
        iconURL: arduinoMega2560IconURL,
        description: (
            <FormattedMessage
                defaultMessage="The 8-bit board with 54 digital pins, 16 analog inputs, and 4 serial ports."
                description="Description for the Arduino Mega 2560 device"
                id="gui.device.arduinoMega2560.description"
            />
        ),
        featured: true,
        disabled: false,
        bluetoothRequired: false,
        serialportRequired: true,
        defaultBaudRate: '9600',
        internetConnectionRequired: false,
        launchPeripheralConnectionFlow: true,
        useAutoScan: false,
        connectionIconURL: arduinoMega2560ConnectionIconURLL,
        connectionSmallIconURL: arduinoMega2560ConnectionSmallIconURL,
        connectingMessage: (
            <FormattedMessage
                defaultMessage="Connecting"
                description="Message to help people connect to their arduino."
                id="gui.device.arduino.connectingMessage"
            />
        ),
        baseToolBoxXml: arduinoBaseToolBox,
        programMode: ['realtime', 'upload'],
        programLanguage: ['block', 'c', 'cpp'],
        tags: ['arduino'],
        helpLink: 'https://store.arduino.cc/usa/mega-2560-r3'
    },
    {
        name: 'Micro:bit',
        deviceId: 'microbit',
        manufactor: 'microbit.org',
        leanMore: 'https://microbit.org/',
        type: 'microbit',
        iconURL: microbitIconURL,
        description: (
            <FormattedMessage
                defaultMessage="The pocket-sized computer transforming digital skills learning."
                description="Description for the 'micro:bit' device"
                id="gui.device.microbit.description"
            />
        ),
        featured: true,
        disabled: false,
        bluetoothRequired: false,
        serialportRequired: true,
        defaultBaudRate: '115200',
        internetConnectionRequired: false,
        launchPeripheralConnectionFlow: true,
        useAutoScan: false,
        connectionIconURL: microbitConnectionIconURLL,
        connectionSmallIconURL: microbitConnectionSmallIconURL,
        connectingMessage: (
            <FormattedMessage
                defaultMessage="Connecting"
                description="Message to help people connect to their microbit."
                id="gui.device.microbit.connectingMessage"
            />
        ),
        baseToolBoxXml: microbitBaseToolBox,
        programMode: ['upload'],
        programLanguage: ['block', 'python'],
        tags: ['microPython'],
        helpLink: 'https://microbit.org/get-started/first-steps/introduction/'
    },
    {
        name: 'ESP32',
        deviceId: 'arduinoEsp32',
        manufactor: 'espressif',
        leanMore: 'https://www.espressif.com/',
        type: 'arduino',
        iconURL: esp32IconURL,
        description: (
            <FormattedMessage
                defaultMessage="Wi-Fi & Bluetooth control board with rich functions."
                description="Description for the esp32 device"
                id="gui.device.arduinoEsp32.description"
            />
        ),
        featured: true,
        disabled: false,
        bluetoothRequired: false,
        serialportRequired: true,
        defaultBaudRate: '115200',
        internetConnectionRequired: false,
        launchPeripheralConnectionFlow: true,
        useAutoScan: false,
        connectionIconURL: esp32ConnectionIconURLL,
        connectionSmallIconURL: esp32ConnectionSmallIconURL,
        connectingMessage: (
            <FormattedMessage
                defaultMessage="Connecting"
                description="Message to help people connect to their esp32."
                id="gui.device.arduinoEsp32.connectingMessage"
            />
        ),
        baseToolBoxXml: arduinoBaseToolBox,
        programMode: ['upload'],
        programLanguage: ['block', 'python'],
        tags: ['arduino'],
        helpLink: 'https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/hw-reference/esp32/get-started-devkitc.html'
    },
    {
        name: 'Micro:bit V2',
        deviceId: 'microbitV2',
        manufactor: 'microbit.org',
        leanMore: 'https://microbit.org/',
        type: 'microbit',
        iconURL: microbitV2IconURL,
        description: (
            <FormattedMessage
                defaultMessage="Upgraded processor, built-In speaker and microphone, touch sensitive logo."
                description="Description for the 'micro:bit V2' device"
                id="gui.device.microbitV2.description"
            />
        ),
        featured: true,
        disabled: true,
        bluetoothRequired: false,
        serialportRequired: true,
        defaultBaudRate: '115200',
        internetConnectionRequired: false,
        launchPeripheralConnectionFlow: true,
        useAutoScan: false,
        connectionIconURL: microbitV2ConnectionIconURLL,
        connectionSmallIconURL: microbitV2ConnectionSmallIconURL,
        connectingMessage: (
            <FormattedMessage
                defaultMessage="Connecting"
                description="Message to help people connect to their microbit."
                id="gui.device.microbit.connectingMessage"
            />
        ),
        baseToolBoxXml: microbitBaseToolBox,
        programMode: ['upload'],
        programLanguage: ['block', 'python'],
        tags: ['microPython'],
        helpLink: 'https://microbit.org/get-started/first-steps/introduction/'
    },
    {
        name: 'Makey Makey',
        deviceId: 'makeyMakey',
        manufactor: 'makeymakey.com',
        leanMore: 'https://makeymakey.com/',
        type: 'arduino',
        iconURL: makeymakeyIconURL,
        description: (
            <FormattedMessage
                defaultMessage="Makey Makey"
                description="Description for the Makey Makey device"
                id="gui.device.makeymakey.description"
            />
        ),
        featured: true,
        disabled: false,
        bluetoothRequired: false,
        serialportRequired: true,
        defaultBaudRate: '115200',
        internetConnectionRequired: false,
        launchPeripheralConnectionFlow: true,
        useAutoScan: false,
        connectionIconURL: makeymakeyConnectionIconURL,
        connectionSmallIconURL: makeymakeyConnectionSmallIconURL,
        connectingMessage: (
            <FormattedMessage
                defaultMessage="Connecting"
                description="Message to help people connect to their arduino."
                id="gui.device.arduino.connectingMessage"
            />
        ),
        baseToolBoxXml: arduinoBaseToolBox,
        programMode: ['upload'],
        programLanguage: ['block', 'c', 'cpp'],
        tags: ['arduino'],
        helpLink: 'https://makeymakey.com'
    },
    {
        name: 'Maixduino',
        deviceId: 'maixduino',
        manufactor: 'sipeed',
        leanMore: 'https://www.sipeed.com/',
        type: 'maixduino',
        iconURL: maixduinoIconURL,
        description: (
            <FormattedMessage
                defaultMessage="The K210 RISC-V board with ESP32 inside"
                description="Description for the maixduino device"
                id="gui.device.maixduino.description"
            />
        ),
        featured: true,
        disabled: true,
        bluetoothRequired: false,
        serialportRequired: true,
        defaultBaudRate: '115200',
        internetConnectionRequired: false,
        launchPeripheralConnectionFlow: true,
        useAutoScan: false,
        connectionIconURL: maixduinoConnectionIconURLL,
        connectionSmallIconURL: maixduinoConnectionSmallIconURL,
        connectingMessage: (
            <FormattedMessage
                defaultMessage="Connecting"
                description="Message to help people connect to their maixduino."
                id="gui.device.maixduino.connectingMessage"
            />
        ),
        baseToolBoxXml: arduinoBaseToolBox,
        programMode: ['realtime', 'upload'],
        programLanguage: ['block', 'python'],
        tags: ['microPython'],
        helpLink: 'https://maixduino.sipeed.com/'
    }
];

/**
 * To get real device id. eg: the third party id like ironKit_arduinoUno.
 * @param {string} deviceId - the id of the device.
 * @return {string} deviceId - the real device id.
 */
const analysisRealDeviceId = deviceId => {
    if (deviceId){
        // if the id contain '_' use the string afer the '_'.
        if (deviceId.indexOf('_') !== -1) {
            deviceId = deviceId.split('_')[1];
        }
    }
    return deviceId;
};

/**
 * Make device data from the input data. If it is a buid-in device, return the buid-in
 * data. If it is a third party device, find it's parent device, and overwrite its attributes
 * with the input data.
 * @param {string} data - the data of devices.
 * @return {string} fullData - processed data of devices.
 */
const makeDeviceLibrary = data => {
    let fullData = data.map(dev => {
        // Check if this is a build-in device.
        const matchedDevice = deviceData.find(item => dev.deviceId === item.deviceId);
        if (matchedDevice) {
            return matchedDevice;
        }

        // This is a third party device. Try to parse it's parent deivce.
        const realDeviceId = analysisRealDeviceId(dev.deviceId);
        if (realDeviceId) {
            const parentDevice = deviceData.find(item => realDeviceId === item.deviceId);
            if (parentDevice) {
                return defaultsDeep({}, dev, parentDevice);
            }
        }
        log.warn('Cannot find this device or it\'s parent device :', dev.deviceId);
        return null;
    });
    fullData = fullData.filter(dev => !!dev);
    return fullData;
};

export {
    deviceData as default,
    makeDeviceLibrary
};
