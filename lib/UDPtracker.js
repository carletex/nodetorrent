/*jslint node: true */
/*global self*/
'use strict';

var crypto = require('crypto');
var dgram = require('dgram');
var url = require('url');
var RSVP = require('rsvp');
var ip = require('ip');

var UDPtracker = module.exports = function UDPtracker (data, port) {
    this.socket = dgram.createSocket("udp4");

	this._data = data;
	this._url = url.parse(this._data.announce.toString());
	this._trackerUrl = this._url.hostname;
	this._trackerPort = this._url.port || 80;
	this._peerId = crypto.randomBytes(20);
	this._port = port;

	this._transactions = {};
	this._transactionIdConnection;
	this._transactionIdAnnounce;
	this._transactionIdScrape;
	this._connectionId;

	this._peers = [];

	var self = this;
	this.socket.on('message', function(response, rinfo){
		self.routeMessage(response,rinfo);
	});

};

UDPtracker.prototype = {

	start: function() {
		return new RSVP.Promise(function(resolve, reject){
			// this._listen();
			this.socket.bind(this._port, function(){ resolve(); });
		}.bind(this));

	},

	connect: function(){
		var defered = RSVP.defer();

		var transactionId = crypto.randomBytes(4);

		this._transactions[transactionId.toString('hex')] = defered;

			var msg = [
				new Buffer('0000041727101980', 'hex'),
				new Buffer([0,0,0,0]),
				transactionId
			];
			msg = Buffer.concat(msg);
			this.socket.send(msg, 0, msg.length, this._trackerPort, this._trackerUrl, function(err, bytes){
				if (err) defered.reject(err);
				console.log('-> Connection packet was sended sended to the tracker', msg);
			});


		return defered.promise;
	},

	announce: function(intevent){

		var defered = RSVP.defer();
		var transactionId = crypto.randomBytes(4);

		this._transactions[transactionId.toString('hex')] = defered;

		var msg = [this._connectionId];

		var action = new Buffer([0,0,0,1]);
		msg.push(action);

		msg.push(transactionId);

		// info_hash
		msg.push(this._data.info._encodedict);

		msg.push(this._peerId);

		var downloaded = new Buffer([0,0,0,0,0,0,0,0]);
		msg.push(downloaded);

		var left = new Buffer([0,0,0,0,0,0,0,0]);
		msg.push(left);

		var uploaded = new Buffer([0,0,0,0,0,0,0,0]);
		msg.push(uploaded);

		var event = new Buffer(4);
		event.writeInt32BE(intevent, 0);
		msg.push(event);

		var ip = new Buffer([0,0,0,0]);
		msg.push(ip);

		var key = crypto.randomBytes(4);
		msg.push(key);

		var numWant = new Buffer(4);
		numWant.writeInt32BE(-1, 0);
		msg.push(numWant);

		var port = new Buffer(2);
		port.writeInt16BE(6881, 0);
		msg.push(port);

		msg = Buffer.concat(msg);


		this.socket.send(msg, 0, msg.length, this._trackerPort, this._trackerUrl, function(err, bytes){
			if (err) {defered.reject(err);}
			console.log('-> Announce packet was sended sended to the tracker', msg);
		});

		return defered.promise;

	},

	routeMessage: function(response, rinfo) {
		var action = response.slice(0, 4).readInt32BE(0);
		var transactionId = response.slice(4, 8).toString('hex');
		var defered = this._transactions[transactionId];

		    switch(action) {
		    	case 0:
		    		// connection
		    		console.log('<- Received connection response packet from tracker.',
		    		 'Transaction ID =', transactionId);
		    		if (defered) {
		    			console.log("Transaction ID's match");
		    			this._connectionId = response.slice(8, 16);
		    			defered.resolve();
		    		} else {
		    			console.log("Transaction ID's dont match. Exit...");
		    			process.exit();
		    		}
		    		break;

		    	case 1:
		    		// Announce
		    		console.log('<- Received announce response packet from tracker.',
		    		 			'Transaction ID =', transactionId);
		    		if (defered) {
		    			console.log('Tracker response', response);
		    			console.log("Transaction ID's match");
		    			for (var i = 20; i < response.length; i += 6) {
		    				var rawPeer = response.slice(i, i+6);
		    				this._peers.push({
		    					ip: rawPeer.slice(0,4),
		    					port: rawPeer.slice(4,6)
		    				});
		    			}
		    			console.log('peer1 ip', ip.toString(response.slice(20, 24)));
		    			console.log('peer1 port', response.slice(24, 26).readUInt16BE(0));
		    			defered.resolve();
		    		} else {
		    			console.log("Transaction ID's dont match. Exit...");
		    			process.exit();
		    		}

		    		break;

		    	case 2:
		    		var transactionIdResponse = response.slice(4, 8);

		    		console.log('<- Received scrape response packet from tracker.',
		    					 'Transaction ID =', response);
		    		if (self._transactionIdScrape.toString('hex') === transactionIdResponse.toString('hex')) {
		    			console.log("Transaction ID's match");
		    			console.log('completed', response.slice(8, 12));
		    			console.log('number donwload', response.slice(12, 16));
		    			console.log('incomplete', response.slice(16, 20));
						console.log('end');
			    	} else {
		    			console.log("Transaction ID's dont match. Exit...");
		    			process.exit();
		    		}
		    		break;

		    	case 3:
		    		// error
		    		console.log("<- ERROR from server", response);
		    		break;

		    	default:
		    		// we shoud never enter here
		    		console.log('Drunk tracker. Exit..');
		    		process.exit();
		    }
	},

	getPeers: function() {

		return this._peers.map(function(peer){
			return {
				ip: (function(){
					var segments = [];
					for(var i =0; i < peer.ip.length; i++) {
						segments.push(peer.ip[i]);
					}
					return segments.join('.');
				})(),
				port: peer.port.readUInt16BE(0)
			};
		});
	}

	// _requestScrape: function() {
	// 	this._transactionIdScrape = crypto.randomBytes(4);
	// 	var msg = [
	// 		this._connectionId,
	// 		new Buffer([0,0,0,2]),
	// 		this._transactionIdScrape
	// 	]

	// 	msg = Buffer.concat(msg);
	// 	socket.send(msg, 0, msg.length, this._trackerPort, this._trackerUrl, function(err, bytes){
	// 		if (err) console.log(err);
	// 		console.log('-> Scrape packet was sended sended to the tracker', msg);
	// 	})
	// },
};