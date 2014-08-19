/*jslint node: true */
'use strict';

var net = require('net');
var crypto = require('crypto');
var shasum = crypto.createHash('sha1');
var RSVP = require('rsvp');
var peerface = require('peerface');
var PeerState = require('./PeerState.js')

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
};

TCPclient.prototype = {

	start: function(){
		return new RSVP.Promise(function(resolve, reject){
			this.server.listen(this._port, function() { //'listening' listener
  				console.log('TCP server listening');
  				resolve();
			});
		}.bind(this));
	},

	createPeer: function(socket){
		console.log('Data received', socket);
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
};


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
var client = peerface.listen(port);

client.on('peer-connected', function(e){
	console.log('server', e);
	e.on('handshake', function(e){
		console.log('handshake server', e);
	});
});
udpTracker.start().then(function(){
	return udpTracker.connect();
}).then(function(){
	return udpTracker.announce(2); // started event
}).then(function(){
	var peers = udpTracker.getPeers();
	return peerface.connect('96.126.104.219', 59961);
}).then(function(peerConnection){
	console.log('client', peerConnection);
	var peer = new PeerState(peerConnection, '0123456789', {
		infoHash: shasum.update(torrentData.info._encodedict).digest('base64'),
		pieceCount: torrentData.info['piece length']
	});
	peer.sendHandshake();
	peer.sendInterested();

	// peerConnection._socket.on('data', function(msg){
	// 	console.log(JSON.stringify(msg));
	// });
	// peerConnection.on('handshake', function(e) {
	// 	console.log('client', e);
	// 	peerConnection.unchoke();
	// 	peerConnection.interested();
	// });
	peerConnection.on('close', function(e) {
		peer.connect();
	});
	// peerConnection.on('error', function(e) {
	// 	console.log('Socket error', e);
	// });
	// peerConnection.on('choke', function(e) {
	// 	console.log('client choked', e);
	// });
	// peerConnection.on('bitfield', function(e) {
	// 	console.log('Client bitfield', JSON.stringify(e));
	// });
	peerConnection.on('have', function(e) {
		console.log('Pieces', peer._pieces);
	});
	// peerConnection.on('piece', function(e) {
	// 	console.log('Client has', JSON.stringify(e));
	// });
	// peerConnection.on('keep-alive', function(msg){ console.log(JSON.stringify(msg)); });
	// peerConnection.on('unchoke', function(msg){
	// 	console.log(JSON.stringify(msg));
	// 	peerConnection.request(0, 0, 16);
	// });
	// peerConnection.on('interested', function(msg){ console.log(JSON.stringify(msg)); });
	// peerConnection.on('not-interested', function(msg){ console.log(JSON.stringify(msg)); });
	// peerConnection.on('request', function(msg){ console.log(JSON.stringify(msg)); });
	// peerConnection.on('cancel', function(msg){ console.log(JSON.stringify(msg)); });
	// peerConnection.on('port', function(msg){ console.log(JSON.stringify(msg)); });

}).catch(function(err){
	console.log('Error', err);
});

