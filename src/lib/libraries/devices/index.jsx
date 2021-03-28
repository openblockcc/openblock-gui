import React from 'react';
import {FormattedMessage} from 'react-intl';

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

import maixduinoIconURL from './maixduino/maixduino.png';
import maixduinoConnectionIconURLL from './maixduino/maixduino-illustration.svg';
import maixduinoConnectionSmallIconURL from './maixduino/maixduino-small.svg';

import makeymakeyIconURL from './makeymakey/makeymakey.png';
import makeymakeyConnectionIconURLL from './makeymakey/makeymakey-illustration.svg';
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
    },
    {
        name: 'Makey Makey',
        deviceId: 'makeymakey',
        baseDeviceId: 'arduinoUno',
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
        internetConnectionRequired: false,
        launchPeripheralConnectionFlow: true,
        useAutoScan: false,
        connectionIconURL: makeymakeyConnectionIconURLL,
        connectionSmallIconURL: makeymakeyConnectionSmallIconURL,
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
        helpLink: 'https://makeymakey.com'
    }
];

const makeDeviceLibrary = data => data.map(dev => {
    const matchedDevice = deviceData.find(item => dev.deviceId === item.deviceId);
    if (matchedDevice) {
        return matchedDevice;
    }
    switch (dev.baseToolBoxXml) {
    case 'arduinoBaseToolBox':
        dev.baseToolBoxXml = arduinoBaseToolBox;
        break;
    case 'microbitBaseToolBox':
        dev.baseToolBoxXml = microbitBaseToolBox;
        break;
    }
    return dev;
});

export {
    deviceData as default,
    makeDeviceLibrary
};
