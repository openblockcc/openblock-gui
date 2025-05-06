import React from 'react';
import {FormattedMessage} from 'react-intl';
import {defaults} from 'lodash';
import log from '../../log';
import {DeviceType} from '../../device';


import unselectDeviceIconURL from './unselectDevice/unselectDevice.png';

import arduinoUnoIconURL from './arduinoUno/arduinoUno.png';
import arduinoUnoConnectionIconURLL from './arduinoUno/arduinoUno-illustration.svg';
import arduinoUnoConnectionSmallIconURL from './arduinoUno/arduinoUno-small.svg';

import arduinoNanoIconURL from './arduinoNano/arduinoNano.png';
import arduinoNanoConnectionIconURLL from './arduinoNano/arduinoNano-illustration.svg';
import arduinoNanoConnectionSmallIconURL from './arduinoNano/arduinoNano-small.svg';

import arduinoLeonardoIconURL from './arduinoLeonardo/arduinoLeonardo.png';
import arduinoLeonardoConnectionIconURLL from './arduinoLeonardo/arduinoLeonardo-illustration.svg';
import arduinoLeonardoConnectionSmallIconURL from './arduinoLeonardo/arduinoLeonardo-small.svg';

import arduinoMega2560IconURL from './arduinoMega2560/arduinoMega2560.png';
import arduinoMega2560ConnectionIconURLL from './arduinoMega2560/arduinoMega2560-illustration.svg';
import arduinoMega2560ConnectionSmallIconURL from './arduinoMega2560/arduinoMega2560-small.svg';

import arduinoUnoR4MinimaIconURL from './arduinoUnoR4Minima/arduinoUnoR4Minima.png';
import arduinoUnoR4MinimaConnectionIconURLL from './arduinoUnoR4Minima/arduinoUnoR4Minima-illustration.svg';
import arduinoUnoR4MinimaConnectionSmallIconURL from './arduinoUnoR4Minima/arduinoUnoR4Minima-small.svg';

import arduinoUnoR4WifiIconURL from './arduinoUnoR4Wifi/arduinoUnoR4Wifi.png';
import arduinoUnoR4WifiConnectionIconURLL from './arduinoUnoR4Wifi/arduinoUnoR4Wifi-illustration.svg';
import arduinoUnoR4WifiConnectionSmallIconURL from './arduinoUnoR4Wifi/arduinoUnoR4Wifi-small.svg';

import microbitIconURL from './microbit/microbit.png';
import microbitConnectionIconURLL from './microbit/microbit-illustration.svg';
import microbitConnectionSmallIconURL from './microbit/microbit-small.svg';

import microbitV2IconURL from './microbitV2/microbitV2.png';
import microbitV2ConnectionIconURLL from './microbitV2/microbitV2-illustration.svg';
import microbitV2ConnectionSmallIconURL from './microbitV2/microbitV2-small.svg';

import esp32IconURL from './esp32/esp32.png';
import esp32ConnectionIconURLL from './esp32/esp32-illustration.svg';
import esp32ConnectionSmallIconURL from './esp32/esp32-small.svg';

import esp32S3IconURL from './esp32S3/esp32S3.png';
import esp32S3ConnectionIconURLL from './esp32S3/esp32S3-illustration.svg';
import esp32S3ConnectionSmallIconURL from './esp32S3/esp32S3-small.svg';

import esp8266NodeMCUIconURL from './esp8266NodeMCU/esp8266NodeMCU.png';
import esp8266NodeMCUConnectionIconURL from './esp8266NodeMCU/esp8266NodeMCU-illustration.svg';
import esp8266NodeMCUConnectionSmallIconURL from './esp8266NodeMCU/esp8266NodeMCU-small.svg';

import k210MaixDockIconURL from './k210MaixDock/k210MaixDock.png';
import k210MaixDockConnectionIconURLL from './k210MaixDock/k210MaixDock-illustration.svg';
import k210MaixDockConnectionSmallIconURL from './k210MaixDock/k210MaixDock-small.svg';

import k210MaixduinoIconURL from './k210Maixduino/k210Maixduino.png';
import k210MaixduinoConnectionIconURLL from './k210Maixduino/k210Maixduino-illustration.svg';
import k210MaixduinoConnectionSmallIconURL from './k210Maixduino/k210Maixduino-small.svg';

import raspberryPiPicoIconURL from './raspberryPiPico/raspberryPiPico.png';
import raspberryPiPicoConnectionIconURL from './raspberryPiPico/raspberryPiPico-illustration.svg';
import raspberryPiPicoConnectionSmallIconURL from './raspberryPiPico/raspberryPiPico-small.svg';

import raspberryPiPicoWIconURL from './raspberryPiPicoW/raspberryPiPicoW.png';
import raspberryPiPicoWConnectionIconURL from './raspberryPiPicoW/raspberryPiPicoW-illustration.svg';
import raspberryPiPicoWConnectionSmallIconURL from './raspberryPiPicoW/raspberryPiPicoW-small.svg';

import raspberryPiPico2IconURL from './raspberryPiPico2/raspberryPiPico2.png';
import raspberryPiPico2ConnectionIconURL from './raspberryPiPico2/raspberryPiPico2-illustration.svg';
import raspberryPiPico2ConnectionSmallIconURL from './raspberryPiPico2/raspberryPiPico2-small.svg';

import raspberryPiPico2WIconURL from './raspberryPiPico2W/raspberryPiPico2W.png';
import raspberryPiPico2WConnectionIconURL from './raspberryPiPico2W/raspberryPiPico2W-illustration.svg';
import raspberryPiPico2WConnectionSmallIconURL from './raspberryPiPico2W/raspberryPiPico2W-small.svg';

import makeymakeyIconURL from './makeymakey/makeymakey.png';
import makeymakeyConnectionIconURL from './makeymakey/makeymakey-illustration.svg';
import makeymakeyConnectionSmallIconURL from './makeymakey/makeymakey-small.svg';

const deviceData = [
    /**
     * Unselect the deivce back to pure scratch mode
     */
    {
        name: (
            <FormattedMessage
                defaultMessage="Unselect device"
                description="Name for the unselect device"
                id="gui.device.unselectDevice.name"
            />
        ),
        deviceId: 'null',
        iconURL: unselectDeviceIconURL,
        description: (
            <FormattedMessage
                defaultMessage="Unselect the device, return to pure realtime programming mode."
                description="Description for the unselect device"
                id="gui.device.unselectDevice.description"
            />
        ),
        featured: true,
        programMode: ['realtime'],
        programLanguage: ['block'],
        tags: ['realtime']
    },
    {
        name: 'Arduino Uno',
        deviceId: 'arduinoUno',
        manufactor: 'arduino.cc',
        learnMore: 'https://docs.arduino.cc/hardware/uno-rev3',
        type: DeviceType.arduino,
        iconURL: arduinoUnoIconURL,
        description: (
            <FormattedMessage
                defaultMessage="A great board to get started with electronics and coding."
                description="Description for the Arduino Uno Rev3 device"
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
                description="Message to help people connect to their device."
                id="gui.device.connectingMessage"
            />
        ),
        programMode: ['realtime', 'upload'],
        programLanguage: ['block', 'c', 'cpp'],
        tags: ['arduino'],
        helpLink: 'https://wiki.openblock.cc/general-hardware-guidelines/boards/arduino-uno'
    },
    {
        name: 'Arduino Nano',
        deviceId: 'arduinoNano',
        manufactor: 'arduino.cc',
        learnMore: 'https://docs.arduino.cc/hardware/nano',
        type: DeviceType.arduino,
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
                description="Message to help people connect to their device."
                id="gui.device.connectingMessage"
            />
        ),
        programMode: ['realtime', 'upload'],
        programLanguage: ['block', 'c', 'cpp'],
        tags: ['arduino'],
        helpLink: 'https://wiki.openblock.cc/general-hardware-guidelines/boards/arduino-nano'
    },
    {
        name: 'Arduino Leonardo',
        deviceId: 'arduinoLeonardo',
        manufactor: 'arduino.cc',
        learnMore: 'https://docs.arduino.cc/hardware/leonardo',
        type: DeviceType.arduino,
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
                description="Message to help people connect to their device."
                id="gui.device.connectingMessage"
            />
        ),
        programMode: ['upload'], // due to the software serilport realtim mode is unstable
        programLanguage: ['block', 'c', 'cpp'],
        tags: ['arduino'],
        helpLink: 'https://wiki.openblock.cc/general-hardware-guidelines/boards/arduino-leonardo'
    },
    {
        name: 'Arduino Mega 2560',
        deviceId: 'arduinoMega2560',
        manufactor: 'arduino.cc',
        learnMore: 'https://docs.arduino.cc/hardware/mega-2560',
        type: DeviceType.arduino,
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
                description="Message to help people connect to their device."
                id="gui.device.connectingMessage"
            />
        ),
        programMode: ['realtime', 'upload'],
        programLanguage: ['block', 'c', 'cpp'],
        tags: ['arduino'],
        helpLink: 'https://wiki.openblock.cc/general-hardware-guidelines/boards/arduino-mega-2560-r3'
    },
    {
        name: 'Arduino Uno R4 Minima',
        deviceId: 'arduinoUnoR4Minima',
        manufactor: 'arduino',
        learnMore: 'https://docs.arduino.cc/hardware/uno-r4-minima',
        type: DeviceType.arduino,
        iconURL: arduinoUnoR4MinimaIconURL,
        description: (
            <FormattedMessage
                defaultMessage="Offers enhanced performance and expanded memory, maintaining compatibility with existing shields and accessories." // eslint-disable-line max-len
                description="Description for the Arduino Uno R4 Minima device"
                id="gui.device.arduinoUnoR4Minima.description"
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
        connectionIconURL: arduinoUnoR4MinimaConnectionIconURLL,
        connectionSmallIconURL: arduinoUnoR4MinimaConnectionSmallIconURL,
        connectingMessage: (
            <FormattedMessage
                defaultMessage="Connecting"
                description="Message to help people connect to their device."
                id="gui.device.connectingMessage"
            />
        ),
        programMode: ['upload'],
        programLanguage: ['block', 'c', 'cpp'],
        tags: ['arduino'],
        helpLink: 'https://wiki.openblock.cc/general-hardware-guidelines/boards/arduino-uno-r4-minima'
    },
    {
        name: 'Arduino Uno R4 WiFi',
        deviceId: 'arduinoUnoR4Wifi',
        manufactor: 'arduino',
        learnMore: 'https://docs.arduino.cc/hardware/uno-r4-wifi',
        type: DeviceType.arduino,
        iconURL: arduinoUnoR4WifiIconURL,
        description: (
            <FormattedMessage
                defaultMessage="Provides Wi-Fi and Bluetooth connectivity, along with an on-board 12x8 LED matrix for visualizations." // eslint-disable-line max-len
                description="Description for the Arduino Uno R4 WiFi device"
                id="gui.device.arduinoUnoR4Wifi.description"
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
        connectionIconURL: arduinoUnoR4WifiConnectionIconURLL,
        connectionSmallIconURL: arduinoUnoR4WifiConnectionSmallIconURL,
        connectingMessage: (
            <FormattedMessage
                defaultMessage="Connecting"
                description="Message to help people connect to their device."
                id="gui.device.connectingMessage"
            />
        ),
        programMode: ['upload'],
        programLanguage: ['block', 'c', 'cpp'],
        tags: ['arduino'],
        helpLink: 'https://wiki.openblock.cc/general-hardware-guidelines/boards/arduino-uno-r4-wifi'
    },
    {
        name: 'ESP32',
        deviceId: 'arduinoEsp32',
        manufactor: 'espressif',
        learnMore: 'https://docs.espressif.com/projects/esp-dev-kits/en/latest/esp32/index.html',
        type: DeviceType.arduino,
        iconURL: esp32IconURL,
        description: (
            <FormattedMessage
                defaultMessage="Wi-Fi & Bluetooth control board with rich functions."
                description="Description for the esp32 device"
                id="gui.device.esp32.description"
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
                description="Message to help people connect to their device."
                id="gui.device.connectingMessage"
            />
        ),
        programMode: ['upload'],
        programLanguage: ['block', 'c', 'cpp'],
        tags: ['arduino'],
        helpLink: 'https://wiki.openblock.cc/general-hardware-guidelines/boards/esp32'
    },
    {
        name: 'ESP32-S3',
        deviceId: 'arduinoEsp32S3',
        manufactor: 'espressif',
        learnMore: 'https://docs.espressif.com/projects/esp-dev-kits/en/latest/esp32s3/index.html',
        type: DeviceType.arduino,
        iconURL: esp32S3IconURL,
        description: (
            <FormattedMessage
                defaultMessage="Integrates a dedicated AI accelerator and rich peripheral set for efficient, low-power IoT edge and AI workloads." // eslint-disable-line max-len
                description="Description for the esp32-s3 device"
                id="gui.device.esp32S3.description"
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
        connectionIconURL: esp32S3ConnectionIconURLL,
        connectionSmallIconURL: esp32S3ConnectionSmallIconURL,
        connectingMessage: (
            <FormattedMessage
                defaultMessage="Connecting"
                description="Message to help people connect to their device."
                id="gui.device.connectingMessage"
            />
        ),
        programMode: ['upload'],
        programLanguage: ['block', 'c', 'cpp'],
        tags: ['arduino'],
        helpLink: 'https://wiki.openblock.cc/general-hardware-guidelines/boards/esp32s3'
    },
    {
        name: 'NodeMCU',
        deviceId: 'arduinoEsp8266NodeMCU',
        manufactor: 'espressif',
        learnMore: 'https://www.nodemcu.com',
        type: DeviceType.arduino,
        iconURL: esp8266NodeMCUIconURL,
        description: (
            <FormattedMessage
                defaultMessage="Low-cost Wi-Fi SOC control board."
                description="Description for the esp8266 NodeMCU device"
                id="gui.device.esp8266NodeMCU.description"
            />
        ),
        featured: true,
        disabled: false,
        bluetoothRequired: false,
        serialportRequired: true,
        defaultBaudRate: '76800',
        internetConnectionRequired: false,
        launchPeripheralConnectionFlow: true,
        useAutoScan: false,
        connectionIconURL: esp8266NodeMCUConnectionIconURL,
        connectionSmallIconURL: esp8266NodeMCUConnectionSmallIconURL,
        connectingMessage: (
            <FormattedMessage
                defaultMessage="Connecting"
                description="Message to help people connect to their device."
                id="gui.device.connectingMessage"
            />
        ),
        deviceExtensionsCompatible: 'arduinoEsp8266',
        programMode: ['upload'],
        programLanguage: ['block', 'c', 'cpp'],
        tags: ['arduino'],
        helpLink: 'https://wiki.openblock.cc/general-hardware-guidelines/boards/esp8266'
    },
    {
        name: 'MaixDock',
        deviceId: 'arduinoK210MaixDock',
        manufactor: 'sipeed',
        learnMore: 'https://wiki.sipeed.com/hardware/en/maix/maixpy_develop_kit_board/Maix_dock.html',
        type: DeviceType.arduino,
        iconURL: k210MaixDockIconURL,
        description: (
            <FormattedMessage
                defaultMessage="A control board based on the K210 RISC-V chip that only has basic functions and leads out all IO pins." // eslint-disable-line max-len
                description="Description for the K210 MaixDock device"
                id="gui.device.k210MaixDock.description"
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
        connectionIconURL: k210MaixDockConnectionIconURLL,
        connectionSmallIconURL: k210MaixDockConnectionSmallIconURL,
        connectingMessage: (
            <FormattedMessage
                defaultMessage="Connecting"
                description="Message to help people connect to their device."
                id="gui.device.connectingMessage"
            />
        ),
        programMode: ['upload'],
        programLanguage: ['block', 'c', 'cpp'],
        tags: ['arduino'],
        helpLink: 'https://wiki.openblock.cc/general-hardware-guidelines/boards/maix-dock'
    },
    {
        name: 'Maixduino',
        deviceId: 'arduinoK210Maixduino',
        manufactor: 'sipeed',
        learnMore: 'https://wiki.sipeed.com/hardware/en/maix/maixpy_develop_kit_board/maix_duino.html',
        type: DeviceType.arduino,
        iconURL: k210MaixduinoIconURL,
        description: (
            <FormattedMessage
                defaultMessage="The K210 RISC-V board with ESP32 inside."
                description="Description for the K210 maixduino device"
                id="gui.device.k210Maixduino.description"
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
        connectionIconURL: k210MaixduinoConnectionIconURLL,
        connectionSmallIconURL: k210MaixduinoConnectionSmallIconURL,
        connectingMessage: (
            <FormattedMessage
                defaultMessage="Connecting"
                description="Message to help people connect to their device."
                id="gui.device.connectingMessage"
            />
        ),
        programMode: ['upload'],
        programLanguage: ['block', 'c', 'cpp'],
        tags: ['arduino'],
        helpLink: 'https://wiki.openblock.cc/general-hardware-guidelines/boards/maixduino'
    },
    {
        name: 'Raspberry Pi Pico',
        deviceId: 'arduinoRaspberryPiPico',
        manufactor: 'Raspberry Pi Foundation',
        learnMore: 'https://www.raspberrypi.com/documentation/microcontrollers/pico-series.html#pico-1-technical-specification',
        type: DeviceType.arduino,
        iconURL: raspberryPiPicoIconURL,
        description: (
            <FormattedMessage
                defaultMessage="A friendly, easy-to-use microcontroller board that brings your electronics ideas to life." // eslint-disable-line max-len
                description="Description for the Raspberry Pi Pico device"
                id="gui.device.raspberryPiPicoIconURL.description"
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
        connectionIconURL: raspberryPiPicoConnectionIconURL,
        connectionSmallIconURL: raspberryPiPicoConnectionSmallIconURL,
        connectingMessage: (
            <FormattedMessage
                defaultMessage="Connecting"
                description="Message to help people connect to their device."
                id="gui.device.connectingMessage"
            />
        ),
        programMode: ['upload'],
        programLanguage: ['block', 'c', 'cpp'],
        tags: ['arduino'],
        helpLink: 'https://wiki.openblock.cc/general-hardware-guidelines/boards/raspberry-pi-pico'
    },
    {
        name: 'Raspberry Pi Pico W',
        deviceId: 'arduinoRaspberryPiPicoW',
        manufactor: 'Raspberry Pi Foundation',
        learnMore: 'https://www.raspberrypi.com/documentation/microcontrollers/pico-series.html#picow-technical-specification',
        type: DeviceType.arduino,
        iconURL: raspberryPiPicoWIconURL,
        description: (
            <FormattedMessage
                defaultMessage="A Pico with built-in 2.4 GHz Wi-Fi and Bluetooth 5.2, perfect for wireless and IoT projects." // eslint-disable-line max-len
                description="Description for the Raspberry Pi Pico W device"
                id="gui.device.raspberryPiPicoWIconURL.description"
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
        connectionIconURL: raspberryPiPicoWConnectionIconURL,
        connectionSmallIconURL: raspberryPiPicoWConnectionSmallIconURL,
        connectingMessage: (
            <FormattedMessage
                defaultMessage="Connecting"
                description="Message to help people connect to their device."
                id="gui.device.connectingMessage"
            />
        ),
        programMode: ['upload'],
        programLanguage: ['block', 'c', 'cpp'],
        tags: ['arduino'],
        helpLink: 'https://wiki.openblock.cc/general-hardware-guidelines/boards/raspberry-pi-picow'
    },
    {
        name: 'Raspberry Pi Pico 2',
        deviceId: 'arduinoRaspberryPiPico2',
        manufactor: 'Raspberry Pi Foundation',
        learnMore: 'https://www.raspberrypi.com/documentation/microcontrollers/pico-series.html#pico-2-technical-specification',
        type: DeviceType.arduino,
        iconURL: raspberryPiPico2IconURL,
        description: (
            <FormattedMessage
                defaultMessage="High-performance dual-core MCU with ample RAM and flash for complex applications." // eslint-disable-line max-len
                description="Description for the Raspberry Pi Pico 2 device"
                id="gui.device.raspberryPiPico2IconURL.description"
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
        connectionIconURL: raspberryPiPico2ConnectionIconURL,
        connectionSmallIconURL: raspberryPiPico2ConnectionSmallIconURL,
        connectingMessage: (
            <FormattedMessage
                defaultMessage="Connecting"
                description="Message to help people connect to their device."
                id="gui.device.connectingMessage"
            />
        ),
        programMode: ['upload'],
        programLanguage: ['block', 'c', 'cpp'],
        tags: ['arduino'],
        helpLink: 'https://wiki.openblock.cc/general-hardware-guidelines/boards/raspberry-pi-pico2'
    },
    {
        name: 'Raspberry Pi Pico 2 W',
        deviceId: 'arduinoRaspberryPiPico2W',
        manufactor: 'Raspberry Pi Foundation',
        learnMore: 'https://www.raspberrypi.com/documentation/microcontrollers/pico-series.html#pico2w-technical-specification',
        type: DeviceType.arduino,
        iconURL: raspberryPiPico2WIconURL,
        description: (
            <FormattedMessage
                defaultMessage="Built-in 2.4 GHz Wi-Fi and Bluetooth for seamless wireless IoT and smart-home integration." // eslint-disable-line max-len
                description="Description for the Raspberry Pi Pico 2 W device"
                id="gui.device.raspberryPiPico2WIconURL.description"
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
        connectionIconURL: raspberryPiPico2WConnectionIconURL,
        connectionSmallIconURL: raspberryPiPico2WConnectionSmallIconURL,
        connectingMessage: (
            <FormattedMessage
                defaultMessage="Connecting"
                description="Message to help people connect to their device."
                id="gui.device.connectingMessage"
            />
        ),
        programMode: ['upload'],
        programLanguage: ['block', 'c', 'cpp'],
        tags: ['arduino'],
        helpLink: 'https://wiki.openblock.cc/general-hardware-guidelines/boards/raspberry-pi-pico2w'
    },
    {
        name: 'Micro:bit',
        deviceId: 'microbit',
        manufactor: 'microbit.org',
        learnMore: 'https://tech.microbit.org/hardware',
        type: DeviceType.microbit,
        iconURL: microbitIconURL,
        description: (
            <FormattedMessage
                defaultMessage="The pocket-sized computer transforming digital skills learning."
                description="Description for the micro:bit device"
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
                description="Message to help people connect to their device."
                id="gui.device.connectingMessage"
            />
        ),
        programMode: ['upload'],
        programLanguage: ['block', 'microPython'],
        tags: ['microPython'],
        helpLink: 'https://wiki.openblock.cc/general-hardware-guidelines/boards/microbit'
    },
    {
        name: 'Micro:bit V2',
        deviceId: 'microbitV2',
        manufactor: 'microbit.org',
        learnMore: 'https://tech.microbit.org/hardware/1-5-revision/',
        type: DeviceType.microbit,
        iconURL: microbitV2IconURL,
        description: (
            <FormattedMessage
                defaultMessage="Upgraded processor, built-In speaker and microphone, touch sensitive logo."
                description="Description for the micro:bit V2 device"
                id="gui.device.microbitV2.description"
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
        connectionIconURL: microbitV2ConnectionIconURLL,
        connectionSmallIconURL: microbitV2ConnectionSmallIconURL,
        connectingMessage: (
            <FormattedMessage
                defaultMessage="Connecting"
                description="Message to help people connect to their device."
                id="gui.device.connectingMessage"
            />
        ),
        programMode: ['upload'],
        programLanguage: ['block', 'microPython'],
        tags: ['microPython'],
        helpLink: 'https://wiki.openblock.cc/general-hardware-guidelines/boards/microbit-v2'
    },
    {
        name: 'Makey Makey',
        deviceId: 'makeyMakey',
        manufactor: 'makeymakey.com',
        learnMore: 'https://makeymakey.com/pages/how-to',
        type: DeviceType.arduino,
        iconURL: makeymakeyIconURL,
        description: (
            <FormattedMessage
                defaultMessage="Make anything into a key."
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
                description="Message to help people connect to their device."
                id="gui.device.connectingMessage"
            />
        ),
        programMode: ['upload'],
        programLanguage: ['block', 'c', 'cpp'],
        tags: ['arduino'],
        helpLink: 'https://wiki.openblock.cc/general-hardware-guidelines/boards/makeymakey'
    },
    /**
     * For those parent devices that exist in VM but are not displayed in GUI
     */
    {
        deviceId: 'arduinoUnoUltra',
        type: DeviceType.arduino,
        featured: true,
        disabled: false,
        hide: true
    },
    {
        deviceId: 'arduinoSE',
        type: DeviceType.arduino,
        featured: true,
        disabled: false,
        hide: true
    },
    {
        deviceId: 'arduinoEsp8266',
        type: DeviceType.arduino,
        featured: true,
        disabled: false,
        hide: true
    }
];

/**
 * Unique event blocks under different programming frameworks.
 */
const eventBlock = {
    [DeviceType.arduino]: '<block type="event_whenarduinobegin"/>',
    [DeviceType.microPython]: '<block type="event_whenmicropythonbegin"/>',
    [DeviceType.microbit]: `<block type="event_whenmicrobitbegin"/>
                                <block type="event_whenmicrobitbuttonpressed"/>
                                <block type="event_whenmicrobitpinbeingtouched"/>
                                <block type="event_whenmicrobitgesture"/>`
};

/**
 * To get real device id. eg: the third party id like ironKit_arduinoUno.
 * @param {string} deviceId - the id of the device.
 * @return {string} deviceId - the real device id.
 */
const analysisRealDeviceId = deviceId => {
    // if the id contain '_' use the string afer the '_'.
    if (deviceId.indexOf('_') !== -1) {
        return deviceId.split('_')[1];
    }
    return deviceId;
};

/**
 * Make device data from the input data. If it is a buid-in device, return the buid-in
 * data. If it is a third party device, find it's parent device, and overwrite its attributes
 * with the input data.
 * @param {string} deviceList - the list of devices.
 * @return {string} fullData - processed data of devices.
 */
const makeDeviceLibrary = (deviceList = null) => {
    let regeneratedDeviceData = [];

    if (deviceList) {
        if (deviceList[0].isOrdered) { // External resources customize the device arrangement
            regeneratedDeviceData.push(deviceData[0]);
        } else {
            deviceList = deviceData.concat(deviceList);
        }

        deviceList.forEach(dev => {
            const realDeviceId = analysisRealDeviceId(dev.deviceId);
            const matchedDevice = deviceData.find(item => realDeviceId === item.deviceId);
            if (matchedDevice) {
                if (realDeviceId !== dev.deviceId) {
                    return regeneratedDeviceData.push(defaults({}, dev, {hide: false}, matchedDevice));
                }
                return regeneratedDeviceData.push(matchedDevice);
            }
            log.warn('Unable to find the corresponding built-in device:', dev.deviceId);
            return;
        });
    } else {
        regeneratedDeviceData = deviceData;
    }

    return regeneratedDeviceData;
};

export {
    deviceData as default,
    eventBlock,
    makeDeviceLibrary
};
