'use strict';

/*
 * Created with @iobroker/create-adapter v2.3.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');

// const BluetoothSerialPort = require('node-bluetooth-serial-port');

const { channel } = require('diagnostics_channel');

const btSerialHandler = new (require('bluetooth-serial-port').BluetoothSerialPort)();

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
		btMACaddress = this.config.macAddress;
		btName = this.config.deviceName;
		this.log.info('config updateIntervall: ' + this.config.updateIntervall);
		this.log.info('config additionalMessages: ' + this.config.additionalMessages);


		if (true) {
			// create bluetooth event handler
			// this.btSerialHandler = new BluetoothSerialPort.BluetoothSerialPort();
			//=====================================================================================
			// Assign serial Blue-Tooth Events
			btSerialHandler.on('finished', this.blt_finished_Event);
			btSerialHandler.on('found', this.blt_found_Event);
			btSerialHandler.on('failure', this.blt_error_Event);
			btSerialHandler.on('data', this.blt_data_Event);
			btSerialHandler.on('closed', this.blt_closed_Event);
			//=====================================================================================

			try {
				this.log.warn('starting inquire');
				btSerialHandler.inquire();
			} catch (err) {
				this.log.error('[btSerialHandler.inquire()] error: ' + err);
			}
		}
		else{
			myAdapter = this;
			this.main();
		}
	}

	main() {
		myAdapter.log.warn('main() hit');
		const rfcomm = new (require('bluetooth-serial-port').BluetoothSerialPort)();

		try {
			rfcomm.on('found', function (address, name) {
				myAdapter.log.warn('found device:', name, 'with address:', address);
			});
		} catch (err) {
			myAdapter.log.err('[\'found\', function (address, name)] ERROR: ' + err);
		}

		try {
			rfcomm.on('finished', function () {
				myAdapter.log.warn('inquiry finished');
			});
		} catch (err) {
			myAdapter.log.err('[rfcomm.on(\'finished\', function ()] ERROR: ' + err);
		}

		myAdapter.log.warn('start inquiry');
		rfcomm.inquire();
		myAdapter.log.warn('should be displayed before the end of inquiry');
	}

	blt_error_Event(err) {
		this.log.warn('[blt_error_Event(err)] hit');
		this.log.error('Blue tooth Error: ' + err);
	}

	/**
	 * called if blue tooth connection is closed
	 */
	blt_closed_Event() {
		this.log.warn('[blt_closed_Event()] hit');
		this.log.warn('Blue tooth connection was closed');
	}

	/**
	 * called if data is comming from blue tooth serial port
	 * @param {} buffer // buffer containing received data
	 */
	blt_data_Event(buffer) {
		this.log.warn('[blt_data_Event(buffer)] hit');
		this.log.info('Blue tooth data received: ' + String(buffer));
	}

	blt_finished_Event(address, name) {
		this.log.warn('[blt_finished_Event(address, name)] hit');
		this.log.warn('Blue toothe serial \'finished\' Event. Device adress: ' + String(address) + ' Device name: ' + String(name));
	}

	blt_found_Event(address, name) {
		this.log.warn('[blt_found_Event(address, name)] hit');
		this.log.warn('Blue toothe serial \'found\' Event. Device adress: ' + String(address) + ' Device name: ' + String(name));
		if (name !== btName) {
			this.log.error('Device name: \'' + String(name) + '\' is not the device we are looking for.');
			// nicht der richtige controller
			return;
		}
		if (btMACaddress !== '') {
			if (btMACaddress !== address.toString()) {
				this.log.error('Device MAC address: \'' + String(address) + '\' is not the one we are looking for.');
				// falsche MAC Adresse
				return;
			}
		}
		this.log.info('Correct device found. Name: \'' + String(name)) + '\' MAC address: \'' + String > (address) + '\' Connecting to ...';
		// Seriellen Port abfragen
		this.log.warn('[searcing for channel] hit');
		btSerialHandler.findSerialPortChannel(address, this.blt_channel_Found, this.blt_findSerialPort_error_Event);
	}

	blt_channel_Found(channel) {
		this.log.warn('[blt_channel_Found(channel)] hit');
		this.log.info('Serial channel fond: \'' + String(channel) + '\' Connecting to ...');
		// function foundBltChanel(channel)
		btSerialHandler.connect(btMACaddress, channel, this.blt_serial_channel_Connected, this.blt_serial_channel_connect_error_Event);
	}

	blt_serial_channel_Connected() {
		this.log.warn('[blt_serial_channel_Connected()] hit');
		this.log.info('Serial channel is connected');
		this.setStateAsync('info.connection', true, true);
	}

	blt_findSerialPort_error_Event(err) {
		this.log.warn('[blt_findSerialPort_error_Event(err)] hit');
		// Device has no 'serial port channel'
		this.log.error('Blue tooth find serial port Error: ' + err);
	}

	blt_serial_channel_connect_error_Event(err) {
		this.log.error('Blue tooth serial port connection error: ' + err);
	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 * @param {() => void} callback
	 */
	onUnload(callback) {
		try {
			if (btSerialHandler.isOpen()) {
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