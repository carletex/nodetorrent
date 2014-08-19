var Bitfield = require('bitfield');

var PeerState = module.exports = function PeerState(peer, peerId, torrent) {

	this._peer = peer;
	this._infoHash = torrent.infoHash;
	this._peerId = peerId;

	this._ip = peer._socket.remoteAddress;
	this._port = peer._socket.remotePort;

	this._connected = true;

	this._am_choking = true;
	this._am_interested = false;
	this._peer_choking = true;
	this._peer_interested = false;

	this._pieces = new Bitfield(torrent.pieceCount);

	Object.defineProperties(this, {
		_requiresHandshake: {
			get: function() {
				return !(this._handshakeReceived && this._handshakeSent);
			}
		}
	});
	this._handshakeReceived = false;
	this._handshakeSent = false;


	// listen for protocol messages from peer
	var self = this;
	peer.on('handshake', function(msg){
		self._handshakeReceived = true;
		console.log('handshake', JSON.stringify(msg));

	});
	peer.on('keep-alive', function(msg){ console.log(JSON.stringify(msg));});
	peer.on('choke', function(msg){
		self._am_choking = true;
		console.log(JSON.stringify(msg));
	});
	peer.on('unchoke', function(msg){
		self._am_choking = false;
		console.log(JSON.stringify(msg));
	});
	peer.on('interested', function(msg){
		self._am_interested = true;
		console.log(JSON.stringify(msg));
	});
	peer.on('not-interested', function(msg){
		self._am_interested = false;
		console.log(JSON.stringify(msg));
	});
	peer.on('have', function(msg){
		self._pieces.set(msg.pieceIndex);
		console.log('Have ->', JSON.stringify(msg));
	});
	peer.on('bitfield', function(msg){
		self.updateBitfield(msg.bitfield);
		console.log('Bitfield ->', JSON.stringify(msg));
	});
	peer.on('request', function(msg){ console.log(JSON.stringify(msg));});
	peer.on('piece', function(msg){ console.log(JSON.stringify(msg));});
	peer.on('cancel', function(msg){ console.log(JSON.stringify(msg));});
	peer.on('port', function(msg){ console.log(JSON.stringify(msg));});

	// listen for socket events
	peer.on('close', function(hadError) {
		this._connected = false;
		this._handshakeReceived = false;
		this._handshakeSent = false;
		console.log(JSON.stringify(hadError));
	});
	peer.on('error', function(err) { console.log(JSON.stringify(err));});
};

PeerState.prototype.sendHandshake = function() {
	if (this._handshakeSent)
		return;
	this._peer.handshake(this._peerId, this._infoHash);
	this._handshakeSent = true;
};

PeerState.prototype.connect = function() {
	if (this._connected)
		return;
	this._peer._socket.connect(this._ip, this._port, function(){
		console.log('Reconected');
	});
};

PeerState.prototype.sendChoke = function() {
	if (this._peer_choking)
		return
	this._peer.choke();
	this._peer_choking = true;
};

PeerState.prototype.sendUnchoke = function() {
	if (!this._peer_choking)
		return
	this._peer.unchoke();
	this._peer_choking = false;
};

PeerState.prototype.sendInterested = function() {
	if (this._peer_interested)
		return
	this._peer.interested();
	this._peer_interested = true;
};

PeerState.prototype.sendNotInterested = function() {
	if (!this._peer_interested)
		return
	this._peer.notInterested();
	this._peer_interested = false;
};

PeerState.prototype.updateBitfield = function(bitfield) {
	for (var i = 0; i < bitfield.buffer.length * 8; i++) {
		var original = this._pieces.get(i);
		var current = bitfield.get(i);
		this._pieces.set(i, original || current);
	};
};
