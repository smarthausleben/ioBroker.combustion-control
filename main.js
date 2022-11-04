'use strict';

/*
 * Created with @iobroker/create-adapter v2.3.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');

const BluetoothSerialPort = require('bluetooth-serial-port');

let btSerialHandler;
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

		// create bluetooth event handler
		this.btSerialHandler = new BluetoothSerialPort.BluetoothSerialPort();
		//=====================================================================================
		// Assign serial Blue-Tooth Events
		this.btSerialHandler.on('finished', this.bltFinishedEvent);
		this.btSerialHandler.on('found', this.bltFoundEvent);
		this.btSerialHandler.on('failure', this.bltErrorEvent);
		this.btSerialHandler.on('data', this.bltData);
		//=====================================================================================

		this.btSerialHandler.inquire();


	}

	bltData(buffer){}

	bltFinishedEvent(address, name){}

	bltFoundEvent(address, name){
		if (name !== btName) {
			// nicht der richtige controller
			return;
		}
		if (btMACaddress !== '') {
			if (btMACaddress !== address.toString()) {
				// falsche MAC Adresse
				return;
			}
		}
		// Seriellen Port abfragen
		btSerialHandler.findSerialPortChannel(address, this.foundBltChanel, this.bltErrorEvent);
	}

	foundBltChanel(chanel){
		// function foundBltChanel(chanel)
		btSerialHandler.connect(btMACaddress, chanel, this.bltConnection, this.bltErrorEvent);
	}

	bltConnection(){
		this.setStateAsync('info.connection', true, true);
	}

	bltErrorEvent(err){}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 * @param {() => void} callback
	 */
	onUnload(callback) {
		try {
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