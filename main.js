'use strict';

/*
 * Created with @iobroker/create-adapter v2.3.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');

// const BluetoothSerialPort = require('node-bluetooth-serial-port');

const { channel } = require('diagnostics_channel');

let btSerialHandler;


let myAdapter;

let btMACaddress;
let btName;
// Load your modules here, e.g.:
// const fs = require("fs");

class CombustionControl extends utils.Adapter {

	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	constructor(options) {
		super({
			...options,
			name: 'combustion-control',
		});
		this.on('ready', this.onReady.bind(this));
		this.on('stateChange', this.onStateChange.bind(this));
		// this.on('objectChange', this.onObjectChange.bind(this));
		// this.on('message', this.onMessage.bind(this));
		this.on('unload', this.onUnload.bind(this));
	}


	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	async onReady() {
		// Initialize your adapter here

		// Reset the connection indicator during startup
		this.setState('info.connection', false, true);

		// The adapters config (in the instance object everything under the attribute "native") is accessible via
		// this.config:

		// get settings device name
		btName = this.config.deviceName;
		await this.setStateAsync('device.name', { val: String(btName), ack: true });
		this.log.info('Device name: ' + String(btName));

		// get settings MAC address
		btMACaddress = this.config.macAddress;
		if(String(btMACaddress) !== ''){
			await this.setStateAsync('device.macaddress', { val: String(btMACaddress), ack: true });

			this.log.info('Defined MAC address: ' + String(btMACaddress));
		}else{
			this.log.info('No MAC address is defined.');
		}

		this.log.info('Update Intervall: ' + String(this.config.updateIntervall) + ' seconds');
		this.log.info('Show additional messages is set to: ' + String(this.config.additionalMessages));

		myAdapter = this;
		start();
	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 * @param {() => void} callback
	 */
	onUnload(callback) {
		try {
			this.log.info('ceck if bluetooth connection is open');
			if (btSerialHandler.isOpen()) {
				this.log.info('closing bluetooth connection');
				btSerialHandler.close();
			}
			// Here you must clear all timeouts or intervals that may still be active
			// clearTimeout(timeout1);
			// clearTimeout(timeout2);
			// ...
			// clearInterval(interval1);

			callback();
		} catch (e) {
			callback();
		}
	}

	// If you need to react to object changes, uncomment the following block and the corresponding line in the constructor.
	// You also need to subscribe to the objects with `this.subscribeObjects`, similar to `this.subscribeStates`.
	// /**
	//  * Is called if a subscribed object changes
	//  * @param {string} id
	//  * @param {ioBroker.Object | null | undefined} obj
	//  */
	// onObjectChange(id, obj) {
	// 	if (obj) {
	// 		// The object was changed
	// 		this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
	// 	} else {
	// 		// The object was deleted
	// 		this.log.info(`object ${id} deleted`);
	// 	}
	// }

	/**
	 * Is called if a subscribed state changes
	 * @param {string} id
	 * @param {ioBroker.State | null | undefined} state
	 */
	onStateChange(id, state) {
		if (state) {
			// The state was changed
			this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
		} else {
			// The state was deleted
			this.log.info(`state ${id} deleted`);
		}
	}

	// If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
	// /**
	//  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
	//  * Using this method requires "common.messagebox" property to be set to true in io-package.json
	//  * @param {ioBroker.Message} obj
	//  */
	// onMessage(obj) {
	// 	if (typeof obj === 'object' && obj.message) {
	// 		if (obj.command === 'send') {
	// 			// e.g. send email or pushover or whatever
	// 			this.log.info('send command');

	// 			// Send response in callback if required
	// 			if (obj.callback) this.sendTo(obj.from, obj.command, 'Message received', obj.callback);
	// 		}
	// 	}
	// }

}

if (require.main !== module) {
	// Export the constructor in compact mode
	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	module.exports = (options) => new CombustionControl(options);
} else {
	// otherwise start the instance directly
	new CombustionControl();
}


function start() {
	// create bluetooth event handler
	btSerialHandler = new (require('bluetooth-serial-port').BluetoothSerialPort)();
	//=====================================================================================
	// Assign serial Blue-Tooth Events
	btSerialHandler.on('finished', blt_finished_Event);
	btSerialHandler.on('found', blt_found_Event);
	btSerialHandler.on('failure', blt_error_Event);
	btSerialHandler.on('data', blt_data_Event);
	btSerialHandler.on('closed', blt_closed_Event);
	//=====================================================================================
	myAdapter.log.info('starting inquire ...');
	btSerialHandler.inquire();

}

function blt_error_Event(err) {
	myAdapter.log.error('[blt_error_Event(err)] Blue tooth Error: ' + err);
}

/**
 * called if blue tooth connection is closed
 */
function blt_closed_Event() {
	myAdapter.log.warn('[blt_closed_Event()] Bluetooth connection was closed');
}

/**
 * called if data is comming from blue tooth serial port
 * @param {} buffer // buffer containing received data
 */
function blt_data_Event(buffer) {
	myAdapter.log.debug('[blt_data_Event(buffer)] Bluetooth data received: ' + String(buffer));
}

function blt_finished_Event() {
	myAdapter.log.debug('[blt_finished_Event(address, name)] Bluetoothe serial \'finished\' Event.');
}

function blt_found_Event(address, name) {
	myAdapter.log.debug('[blt_found_Event(address, name)] hit');
	myAdapter.log.info('Blue toothe serial \'found\' Event. Device adress: ' + String(address) + ' Device name: ' + String(name));
	if (name !== btName) {
		myAdapter.log.error('Device name: \'' + String(name) + '\' is not the device we are looking for.');
		// nicht der richtige controller
		return;
	}

	if (btMACaddress !== '') {
		if (btMACaddress !== String(address)) {
			myAdapter.log.error('Device MAC address: \'' + String(address) + '\' is not the one we are looking for.');
			// falsche MAC Adresse
			return;
		}
	}
	else{
		// no MAC address was defined, so we use the current one and save MAC address
		btMACaddress = address;
		myAdapter.log.warn('[setStateAsync(\'device.macaddress\'] hit. MAC-Adress: ' + String(btMACaddress));
		myAdapter.setStateAsync('device.macaddress', { val: String(btMACaddress), ack: true });
	}

	myAdapter.log.info('Using device: Name: \'' + String(name) + '\' MAC address: \'' + String > (btMACaddress) + '\' requesting serial port channel ...');
	// Seriellen Port abfragen
	btSerialHandler.findSerialPortChannel(btMACaddress, blt_channel_Found, blt_findSerialPort_error_Event);
}

function blt_channel_Found(channel) {
	myAdapter.log.info('Serial channel fond: \'' + String(channel) + '\' Connecting to ...');
	// function foundBltChanel(channel)
	btSerialHandler.connect(btMACaddress, channel, blt_serial_channel_Connected, blt_serial_channel_connect_error_Event);
}

function blt_serial_channel_Connected() {
	myAdapter.log.debug('[blt_serial_channel_Connected()] hit');
	myAdapter.log.info('Successfully connected');
	myAdapter.setStateAsync('info.connection', true, true);
}

function blt_findSerialPort_error_Event(err) {
	myAdapter.log.debug('[blt_findSerialPort_error_Event(err)] hit');
	// Device has no 'serial port channel'
	myAdapter.log.error('Bluetooth ERROR finding serial port: ' + err);
}

function blt_serial_channel_connect_error_Event(err) {
	myAdapter.log.error('Bluetooth serial port connection error: ' + err);
}
