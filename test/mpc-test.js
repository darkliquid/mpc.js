// extra asserty goodness
var sinon = require('sinon');

var net = require('net'),
	MPC = require('../lib/mpc').MPC;

// The typical MPD port. Change to whatever you need to test.
var TCP_PORT = 6600;

module.exports = {
	'MPC': {

		'should create an MPC instance': function (test) {
			test.expect(1);
			var instance = new MPC();
			test.ok(instance instanceof MPC);
			test.done();
		},

		'when a server is running': {
			setUp: function (callback) {
				this.mpdServer = net.createServer();
				this.mpdServer.listen(TCP_PORT, function() {
					callback();
				});
			},
			tearDown: function (callback) {
				var self = this;
				// bin the server after it closes
				this.mpdServer.on('close', function() {
					self.mpdServer.removeAllListeners();
					delete self.mpdServer;
					callback();
				});
				this.mpdServer.close();
			},

			'when connect() is called': {
				setUp: function (callback) {
					this.instance = new MPC();
					callback();
				},
				tearDown: function (callback) {
					this.mpdServer.removeAllListeners();
					this.instance.removeAllListeners();
					this.instance.connection.destroy()
					delete this.instance;
					callback();
				},

				'should connect with no arguments': function(test) {
					test.expect(1);
					this.instance.connect();
					test.ok(this.instance.connection instanceof net.Socket);
					test.done();
				},

				'should connect with port': function(test) {
					test.expect(1);
					this.instance.connect(TCP_PORT);
					test.ok(this.instance.connection instanceof net.Socket);
					test.done();
				},

				'should connect with hostname': function(test) {
					test.expect(1);
					this.instance.connect('127.0.0.1');				
					test.ok(this.instance.connection instanceof net.Socket);
					test.done();
				},

				'should connect with port and hostname': function(test) {
					test.expect(1);
					this.instance.connect(TCP_PORT, '127.0.0.1');
					test.ok(this.instance.connection instanceof net.Socket);
					test.done();
				},

				'should connect with hostname and port': function(test) {
					test.expect(1);
					this.instance.connect('127.0.0.1', TCP_PORT);
					test.ok(this.instance.connection instanceof net.Socket);
					test.done();
				},

				'should throw error on invalid arguments': function(test) {
					test.expect(1);
					test.throws(
						function() {
							this.instance.connect(function() { 'look at me, i am an invalid argument' });
						}
					);
					test.done();
				},

				'should throw error if connection fails': function(test) {
					test.expect(1);
					test.throws(
						function() {
							this.instance.connect('999.999.999.999', 99999);
						}
					);
					test.done();
				},

				'should emit connected event on connection with socket': function(test) {
					test.expect(1);
					this.instance.on('connected', function(socket) {
						test.ok(socket instanceof net.Socket);
						test.done();
					});
					this.instance.connect();
				},

				'should set connected to true': function(test) {
					test.expect(1);
					var self = this;
					this.instance.on('connected', function() {
						test.ok(self.instance.connected);
						test.done();
					});
					this.instance.connect();
				},

				'should set the protocol version': function(test) {
					test.expect(1);
					var self = this;
					this.mpdServer.on('connection', function(s) {
						s.write('OK MPD 0.16.0\n');
					});
					this.instance.on('data', function() {
						test.equal(self.instance.protocol, '0.16.0');
						test.done();
					});
					this.instance.connect();
				}
			},

			'when raw() is called': {
				setUp: function (callback) {
					var self = this;
					this.instance = new MPC();
					this.mpdServer.on('connection', function(s) {
						s.write('OK MPD 0.16.0\n');
						self.server_socket = s;
						callback();
					});
					this.instance.connect();
				},
				tearDown: function (callback) {
					this.mpdServer.removeAllListeners();
					this.instance.removeAllListeners();
					this.instance.connection.destroy();
					if(this.server_socket) this.server_socket.removeAllListeners();
					delete this.instance;
					this.server_socket = undefined;
					callback();
				},

				'it should send command to server': function(test) {
					test.expect(1);
					this.server_socket.on('data', function(data) {
						test.equal(data.toString(), 'ping\n');
						test.done();
					});
					this.instance.raw('ping');
				},

				'MPC should fire a data event with the successful response': function(test) {
					test.expect(2);
					this.server_socket.on('data', function(data) {
						this.write('OK\n');
					});
					var calls = 0;
					this.instance.on('data', function(type, data) {
						calls++;
						if(calls === 2 && data === 'OK') {
							test.equal(type, 'success');
							test.equal(data, 'OK');
							test.done();
						}
					});
					this.instance.raw('ping');
				},

				'it should have the callback called on a successful server response': function(test) {
					test.expect(1);
					this.server_socket.on('data', function(data) {
						this.write('OK\n');
					});
					var spy = sinon.spy(),
						calls = 0;
					this.instance.on('data', function(type, data) {
						calls++
						if(calls === 2) {
							test.ok(spy.alwaysCalledWithExactly('OK'));
							test.done();
						}
					});
					this.instance.raw('ping', spy);
				},

				'it should not have the callback called on a failed server response': function(test) {
					test.expect(2);
					this.server_socket.on('data', function(data) {
						this.write('ACK\n');
					});
					var spy = sinon.spy(),
						calls = 0;
					this.instance.on('data', function(type, data) {
						calls++
						if(calls === 2) {
							test.equal(type, 'error');
							test.ok(!spy.called);
							test.done();
						}
					});
					this.instance.raw('ping', spy);
				},			
			},

			'when the connection fails': {
				setUp: function(callback) {
					this.instance = new MPC();
					this.instance.once('connected', function() {
						callback();
					});
					this.instance.connect();
				},

				tearDown: function(callback) {
					this.mpdServer.removeAllListeners();
					this.instance.removeAllListeners();
					this.instance.connection.destroy();
					delete this.instance;
					callback();
				},

				'connection should be false on socket close': function(test) {
					test.expect(1);
					var instance = this.instance;
					this.instance.connection.once('close', function() {
						test.equal(false, instance.connected);
						test.done();
					});
					this.instance.connection.emit('close');
				},

				'disconnected event should be emitted on socket close': function(test) {
					test.expect(1);
					this.instance.once('disconnected', function() {
						test.ok(true);
						test.done();
					});
					this.instance.connection.emit('close');
				},

				'connection should be false on socket end': function(test) {
					test.expect(1);
					var instance = this.instance;
					this.instance.connection.once('end', function() {
						test.equal(false, instance.connected);
						test.done();
					});
					this.instance.connection.emit('end');
				},

				'disconnected event should be emitted on socket end': function(test) {
					test.expect(1);
					this.instance.once('disconnected', function() {
						test.ok(true);
						test.done();
					});
					this.instance.connection.emit('end');
				}
			},

			'the specific mpd methods': {
				setUp: function (callback) {
					var self = this;
					this.instance = new MPC();
					this.instance.connected = true;
					this.spy = sinon.stub(this.instance, 'raw');
					callback();
				},
				tearDown: function (callback) {
					this.instance.removeAllListeners();
					delete this.instance;
					callback();
				},

				'clearerror should call raw() with correct arguments': function(test) {
					var cb = function() { 'test callback' };
					this.instance.clearerror(cb);
					test.ok(this.spy.calledWithExactly('clearerror', cb));
					test.done();
				},

				'currentsong should call raw() with correct arguments': function(test) {
					var cb = function() { 'test callback' };
					this.instance.currentsong(cb);
					test.ok(this.spy.calledWithExactly('currentsong', cb));
					test.done();
				},	

				'password should call raw() with correct arguments': function(test) {
					var cb = function() { 'test callback' };
					this.instance.password('my_pass', cb);
					test.ok(this.spy.calledWithExactly('password my_pass', cb));
					test.done();
				}			
			}
		
		}

	}
};