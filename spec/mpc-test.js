var vows = require('vows'),
    assert = require('assert');

var net = require('net');
	MPC = require('../lib/mpc').MPC;

// The typical MPD port. Change to whatever you need to test.
var TCP_PORT = 6600;

var mpdServer = net.createServer();
mpdServer.listen(TCP_PORT);


vows.describe('mpc.js').addBatch({
	'When using mpc': {
		topic: new MPC(),
		
		'should create an MPC instance': function(instance) {
			assert.instanceOf(instance, MPC);
		},
	
		'the connect() method': {
			topic: function(instance) {
				var that = this;
				mpdServer.on(
					'connection', 
					// bind this.callback to a scope of null, 
					// with the first two args set to null
					// and instance respectively. Further arguments
					// specified when calling the callback will be 
					// appended the argument list so further tests
					// in this batch will get called with the args
					// null, instance, socket (where socket is the 
					// argument that this event passes to it's 
					// callback)
					//
					//                 scope, arg1, arg2
					this.callback.bind(null, null, instance)
				);
				instance.connect(TCP_PORT);
			},
			'should actually connect': function(err, instance, socket) {
				assert.instanceOf(instance, MPC);
				assert.instanceOf(socket, net.Socket);
			}
		}
	}
}).export(module);
