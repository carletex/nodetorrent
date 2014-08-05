'use strict';

var net = require('net');
var RSVP = require('rsvp');

RSVP.on('error', function(reason) {
  console.assert(false, reason);
});

var TCPclient = module.exports = function TCPclient (data, port) {

	this._data = data;
	this._port = port;

	this.server = net.createServer();

	var self = this;
	this.server.on('connection', function(socket){
		self.createPeer(socket);
	});
}

TCPclient.prototype = {

	start: function(){
		return new RSVP.Promise(function(resolve, reject){
			this.server.listen(this._port, function() { //'listening' listener
  				console.log('TCP server listening');
  				resolve();
			})
		}.bind(this));
	},

	createPeer: function(socket){
		console.log('Data received', data);
	},

	handshake: function(peer_id){
		var msg = [
			new Buffer([19]),
			new Buffer('BitTorrent protocol'),
			new Buffer([0,0,0,0,0,0,0,0]),
			this._data.info._encodecdict,
			peer_id,
		];


	}
}


// Test
var fs = require('fs');
var Bencoding = require("./Bencoding.js");
var UDPtracker = require("./UDPtracker.js");

var filename = process.argv[2];

try {
	var fileContent = fs.readFileSync(filename);
}
catch(err) {
    console.log('Something went wrong: ' + err);
    return;
}

var port = 6881;

var decoder = new Bencoding();
var torrentData = decoder.decode(fileContent);
var udpTracker = new UDPtracker(torrentData, port);



udpTracker.start().then(function(){
	return udpTracker.connect();
}).then(function(){
	return udpTracker.announce(2); // started event
}).then(function(){
	var tcpPeers = new TCPclient(torrentData, port);
	return tcpPeers.start();
}).catch(function(err){

	console.log('Error', err);
});

