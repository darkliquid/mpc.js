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

		// command/callback stack
		this._commands = [];
		this._callbacks = [];
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
		this.connection.setNoDelay();
		this.connection.on('connect', this._onConnect.bind(this));
		this.connection.on('end', this._onEnd.bind(this));
		this.connection.on('data', this._onData.bind(this));
		this.connection.on('close', this._onClose.bind(this));
		this.connection.on('error', this._onError.bind(this));
		this.connection.connect.apply(this.connection, [this.port, this.host]);
	};

	// On Connection
	MPC.prototype._onConnect = function() {
		this.connected = true;
		this.emit('connected', this.connection);
	};

	// On End
	MPC.prototype._onEnd = function() {
		this.connected = false;
		this.emit('disconnected');
	};

	// On Data
	MPC.prototype._onData = function(data) {
		var lines = data.split("\n");
		for(var l in lines) {
			if(lines[l].match(/^ACK/)) {
				// error occurred
				this.emit('data', 'error', lines[l]);
				continue;
			} else if(lines[l].match(/^OK MPD/)) {
				// initial connect proto-version string
				this.protocol = lines[l].match(/^OK MPD ([\d\.]+)$/)[1];
				if(!this.protocol) {
					var error = new Error('unrecogised version string');
					error.version_string = this.protocol;
					this.emit('data', 'error', error);
					continue;
				}
			} else if(lines[l].match(/^OK$/)) {
				// final 'good' response
				var callback = this._callbacks.shift();
				if(callback) callback.apply(this, [lines[l]]);
			} else {
				// bigger response that'll need parsing
			}
			this.emit('data', 'success', lines[l]);
		}
	};

	// On Close
	MPC.prototype._onClose = function() {
		this.connected = false;
		this.emit('disconnected');
	};

	// On Error
	MPC.prototype._onError = function(error) {
		this.connected = false;
		this.emit('error', error || new Error('Something went wrong'));
	};

	// sends a raw command to the server, calls the callback on receipt
	MPC.prototype.raw = function(command, callback) {
		if(this.connected) {
			this._callbacks.push(callback);
			this._commands.push(command);
			if(this._commands.length === 1) {
				this.connection.write(this._commands.shift() + "\n");
			}
		} else {
			var self = this;
			this.once('connected', function() {
				self.raw(command, callback);
			});
			this.reconnect();
		}
	};

	MPC.prototype.reconnect = function() {
		this.connection.removeAllListeners();
		this.connection.destroy();
		delete this.connection;
		var self = this;
		setTimeout(function() {
			self.connection = new net.Socket();
			self.connect(self.host, self.port);
		}, 100);
	};

	// sends the clearerror command to the server, calls callback on receipt
	MPC.prototype.clearerror = function(callback) {
		this.raw('clearerror', callback);
	};

	// sends the currentsong command to the server, calls callback on receipt
	MPC.prototype.currentsong = function(callback) {
		this.raw('currentsong', callback);
	};

	// authenticates against the server with the given password, calls callback on receipt
	MPC.prototype.password = function(password, callback) {
		this.raw('password ' + password, callback);
	}

}(exports));
