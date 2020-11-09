import React from 'react';
import {FormattedMessage} from 'react-intl';

import arduinoBaseToolBox from './baseToolbox/arduino';

import arduinoUnoIconURL from './arduinoUno/arduinoUno.png';
import arduinoUnoInsetIconURL from './arduinoUno/arduinoUno-small.svg';
import arduinoUnoConnectionIconURLL from './arduinoUno/arduinoUno-illustration.svg';
import arduinoUnoConnectionSmallIconURL from './arduinoUno/arduinoUno-small.svg';

import arduinoNanoIconURL from './arduinoNano/arduinoNano.png';
import arduinoNanoInsetIconURL from './arduinoNano/arduinoNano-small.svg';
import arduinoNanoConnectionIconURLL from './arduinoNano/arduinoNano-illustration.svg';
import arduinoNanoConnectionSmallIconURL from './arduinoNano/arduinoNano-small.svg';

import arduinoLeonardoIconURL from './arduinoLeonardo/arduinoLeonardo.png';
import arduinoLeonardoInsetIconURL from './arduinoLeonardo/arduinoLeonardo-small.svg';
import arduinoLeonardoConnectionIconURLL from './arduinoLeonardo/arduinoLeonardo-illustration.svg';
import arduinoLeonardoConnectionSmallIconURL from './arduinoLeonardo/arduinoLeonardo-small.svg';

import arduinoMega2560IconURL from './arduinoMega2560/arduinoMega2560.png';
import arduinoMega2560InsetIconURL from './arduinoMega2560/arduinoMega2560-small.svg';
import arduinoMega2560ConnectionIconURLL from './arduinoMega2560/arduinoMega2560-illustration.svg';
import arduinoMega2560ConnectionSmallIconURL from './arduinoMega2560/arduinoMega2560-small.svg';

// Device is a kind of specail extension
export default [
    {
        name: 'Arduino Uno',
        deviceId: 'arduinoUno',
        collaborator: 'arduino',
        iconURL: arduinoUnoIconURL,
        insetIconURL: arduinoUnoInsetIconURL,
        description: (
            <FormattedMessage
                defaultMessage="The best board to get started with electronics and coding."
                description="Description for the 'Arduino Uno' device"
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
        helpLink: 'https://store.arduino.cc/usa/arduino-uno-rev3'
    },
    {
        name: 'Arduino Nano',
        deviceId: 'arduinoNano',
        collaborator: 'arduino',
        iconURL: arduinoNanoIconURL,
        insetIconURL: arduinoNanoInsetIconURL,
        description: (
            <FormattedMessage
                defaultMessage="The classic Arduino Nano is the smallest board to build your projects with."
                description="Description for the 'Arduino Nano' device"
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
        programMode: ['upload'],
        programLanguage: ['block', 'c', 'cpp'],
        helpLink: 'https://store.arduino.cc/usa/arduino-nano'
    },
    {
        name: 'Arduino Leonardo',
        deviceId: 'arduinoLeonardo',
        collaborator: 'arduino',
        iconURL: arduinoLeonardoIconURL,
        insetIconURL: arduinoLeonardoInsetIconURL,
        description: (
            <FormattedMessage
                defaultMessage="The classic Arduino board that can act as a mouse or keyboard."
                description="Description for the 'Arduino Leonardo' device"
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
        programMode: ['realtime', 'upload'],
        programLanguage: ['block', 'c', 'cpp'],
        helpLink: 'https://store.arduino.cc/usa/leonardo'
    },
    {
        name: 'Arduino Mega 2560',
        deviceId: 'arduinoMega2560',
        collaborator: 'arduino',
        iconURL: arduinoMega2560IconURL,
        insetIconURL: arduinoMega2560InsetIconURL,
        description: (
            <FormattedMessage
                defaultMessage="The 8-bit board with 54 digital pins, 16 analog inputs, and 4 serial ports."
                description="Description for the 'Arduino Mega 2560' device"
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
        helpLink: 'https://store.arduino.cc/usa/mega-2560-r3'
    }
];
