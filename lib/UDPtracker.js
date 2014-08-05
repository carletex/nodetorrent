'use strict';

var crypto = require('crypto');
var dgram = require('dgram');
var url = require('url');
var socket = dgram.createSocket("udp4");


var UDPtracker = module.exports = function UDPtracker (data) {

	this._data = data;
	this._url = url.parse(this._data.announce.toString());
	this._trackerUrl = this._url.hostname;
	this._trackerPort = this._url.port || 80;

	this._transactionIdConnection;
	this._transactionIdAnnounce;
	this._transactionIdScrape;
	this._connectionId;


};

UDPtracker.prototype = {
	getPeers: function() {
		this._listen();
		this._requestConnection();
	},

	_listen: function() {
		var self = this;
		socket.on("error", function (err) {
		  console.log("Server error:\n" + err.stack);
		  socket.close();
		});

		socket.on("message", function (response, rinfo) {
		  	// console.log("Server got: " + msg.toString('hex') + " from " +
		    // rinfo.address + ":" + rinfo.port);
		    // var response = new Buffer(msg);
		    var action = response.slice(0, 4).readInt32BE(0);

		    switch(action) {
		    	case 0:
		    		// connection
		    		var transactionIdResponse = response.slice(4, 8);

		    		console.log('<- Received connection response packet from tracker.'
		    					    , 'Transaction ID =', transactionIdResponse);
		    		if (self._transactionIdConnection.toString('hex') == transactionIdResponse.toString('hex')) {
		    			console.log("Transaction ID's match");
		    			self._connectionId = response.slice(8, 16);
		    			self._requestAnnounce();
		    		} else {
		    			console.log("Transaction ID's dont match. Exit...");
		    			process.exit();
		    		}
		    		break;

		    	case 1:
		    		// Announce

		    		var transactionIdResponse = response.slice(4, 8);

		    		console.log('<- Received announce response packet from tracker.'
		    					    , 'Transaction ID =', transactionIdResponse);
		    		if (self._transactionIdAnnounce.toString('hex') == transactionIdResponse.toString('hex')) {
		    			console.log("Transaction ID's match");
		    			console.log('peer1 ip', response.slice(20, 24));
		    			console.log('peer1 port', response.slice(24, 26));
		    			self._requestScrape();
		    		} else {
		    			console.log("Transaction ID's dont match. Exit...");
		    			process.exit();
		    		}

		    		break;

		    	case 2:
		    		var transactionIdResponse = response.slice(4, 8);

		    		console.log('<- Received scrape response packet from tracker.'
		    					    , 'Transaction ID =', response);
		    		if (self._transactionIdScrape.toString('hex') == transactionIdResponse.toString('hex')) {
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
		    		break;

		    	default:
		    		// we shoud never enter here
		    		console.log('Drunk tracker. Exit..');
		    		process.exit();
		    }
		});

		socket.on("listening", function () {
		  var address = socket.address();
		  console.log("UDP Server listening " +
		      address.address + ":" + address.port);
		});

		socket.bind(6881);
	},

	_requestConnection: function() {
		this._transactionIdConnection = crypto.randomBytes(4);
		var msg = [
			new Buffer('0000041727101980', 'hex'),
			new Buffer([0,0,0,0]),
			this._transactionIdConnection
		]

		msg = Buffer.concat(msg);
		socket.send(msg, 0, msg.length, this._trackerPort, this._trackerUrl, function(err, bytes){
			if (err) console.log(err);
			console.log('-> Connection packet was sended sended to the tracker', msg);
		})
	},

	_requestAnnounce: function() {
		this._transactionIdAnnounce = crypto.randomBytes(4);
		var msg = [this._connectionId];

		var action = new Buffer([0,0,0,1]);
		msg.push(action);

		msg.push(this._transactionIdAnnounce);

		// info_hash
		msg.push(this._data.info._encodedict);

		var peerId = crypto.randomBytes(20);
		msg.push(peerId);

		var downloaded = new Buffer([0,0,0,0,0,0,0,0]);
		msg.push(downloaded);

		var left = new Buffer([0,0,0,0,0,0,0,0]);
		msg.push(left);

		var uploaded = new Buffer([0,0,0,0,0,0,0,0]);
		msg.push(uploaded);

		var event = new Buffer([0,0,0,0]);
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

		socket.send(msg, 0, msg.length, this._trackerPort, this._trackerUrl, function(err, bytes){
			if (err) console.log(err);
			console.log('-> Announce packet was sended sended to the tracker', msg);
		})
	},

	_requestScrape: function() {
		this._transactionIdScrape = crypto.randomBytes(4);
		var msg = [
			this._connectionId,
			new Buffer([0,0,0,2]),
			this._transactionIdScrape
		]

		msg = Buffer.concat(msg);
		socket.send(msg, 0, msg.length, this._trackerPort, this._trackerUrl, function(err, bytes){
			if (err) console.log(err);
			console.log('-> Scrape packet was sended sended to the tracker', msg);
		})
	},
}

// Test
var fs = require('fs');
var Bencoding = require("./Bencoding.js");

var filename = process.argv[2];

try {
	var fileContent = fs.readFileSync(filename);
}
catch(err) {
    console.log('Something went wrong: ' + err);
    return;
}

var decoder = new Bencoding();
var udpTracker = new UDPtracker(decoder.decode(fileContent));
udpTracker.getPeers();
