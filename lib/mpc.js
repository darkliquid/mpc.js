/*jshint node: true */

(function(exports) {

	"use strict";

	// Require the libs we need
	var net 		= require('net'),
		util 		= require('util'),
		events 		= require('events');

	/* # client
	 * 
	 * 
	 */
	var MPC = exports.MPC = function() {
		if(!(this instanceof MPC)) {
			return new MPC();
		}
		this.connection = new net.Socket();

		// defaults
		this.port = 6600;
		this.host = '127.0.0.1';
		this.connected = false;
	};

	util.inherits(MPC, events.EventEmitter);

	MPC.prototype.connect = function() {
		var args = Array.prototype.slice.call(arguments),
			self = this,
			host, 
			port;

		args.forEach(function(arg) {
			var type = typeof arg;
			switch(type) {
				case 'number':
					port = arg;
					break;
				case 'string':
					host = arg;
					break;
				default:
					self.emit('error', new Error('bad argument to connect'));
					break;
			}
		});

		this.host = host || this.host;
		this.port = port || this.port;

		this.connection.setEncoding('UTF-8');
		this.connection.on('connect', this._onConnect.bind(this));
		this.connection.on('end', this._onEnd.bind(this));
		this.connection.on('data', this._onData.bind(this));
		this.connection.on('close', this._onClose.bind(this));
		this.connection.on('error', this._onError.bind(this));
		this.connection.on('timeout', this._onTimeout.bind(this));
		this.connection.connect.apply(this.connection, [this.port, this.host]);
	};

	// On Connection
	MPC.prototype._onConnect = function() {
		this.connected = true;
		this.emit('connect');
	};

	// On End
	MPC.prototype._onEnd = function() {
		this.connected = false;
	};

	// On Data
	MPC.prototype._onData = function() {
		var lines = data.split("\n");
		for(var l in lines) {
			if(lines[l].match(/^ACK/)) {
				// error occurred
			} else if(lines[l].match(/^OK MPD/)) {
				// initial connect proto-version string
			} else if(lines[l].match(/^OK$/)) {
				// final 'good' response
			} else {
				// bigger response that'll need parsing
			}
		}
	};

	// On Close
	MPC.prototype._onClose = function() {
		this.connected = false;
	};

	// On Error
	MPC.prototype._onError = function(error) {
		this.connected = false;
		this.emit('error', error || new Error('Something went wrong'));
	};

	// On Timeout
	MPC.prototype._onTimeout = function(error) {
		this.connected = false;
		this.emit('timeout');
	};

	// sends a raw command to the server, calls the callback on receipt
	MPC.prototype.raw = function(command, callback) {
		if(this.connection) {
			this._callbacks.push(callback);
			this._commands.push(command);
			if(this._commands.length === 1) {
				this.connection.write(this._commands.shift() + "\n");
			}
		} else {
			this.connect();
			this.connection.once('connect', function() {
				this.raw(command, callback);
			});
		}
	};

	// sends the clearerror command to the server, calls callback on receipt
	MPC.prototype.clearerror = function(callback) {
		self.raw('clearerror', callback);
	};

	// sends the currentsong command to the server, calls callback on receipt
	MPC.prototype.currentsong = function(callback) {
		self.raw('currentsong', callback);
	};

	// authenticates against the server with the given password, calls callback on receipt
	MPC.prototype.password = function(password, callback) {
		self.raw('password ' + password);
	}

}(exports));
