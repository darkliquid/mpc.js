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

				'should set connected to true': function(test) {
					test.expect(1);
					var self = this;
					this.instance.on('connect', function() {
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
			}
		
		}

	}
};