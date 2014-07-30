'use strict';

var crypto = require('crypto');
var dgram = require('dgram');
var socket = dgram.createSocket("udp4");


var UDPtracker = module.exports = function UDPtracker (data) {

	this.data = data;

};

UDPtracker.prototype = {
	getPeers: function() {
		this._bind();
		this._connect();
	},

	_bind: function() {
		socket.on("error", function (err) {
		  console.log("server error:\n" + err.stack);
		  socket.close();
		});

		socket.on("message", function (msg, rinfo) {
		  console.log("server got: " + msg.toString('hex') + " from " +
		    rinfo.address + ":" + rinfo.port);
		});

		socket.on("listening", function () {
		  var address = socket.address();
		  console.log("server listening " +
		      address.address + ":" + address.port);
		});

		socket.bind(6881);
	},

	_connect: function() {
		var transactionId = crypto.randomBytes(4);
		var msg = [
			new Buffer('0000041727101980', 'hex'),
			new Buffer([0,0,0,0]),
			transactionId
		]

		msg = Buffer.concat(msg);
		socket.send(msg, 0, msg.length, 80, 'tracker.openbittorrent.com', function(err, bytes){
			if (err) console.log(err);
			console.log('send', bytes);
		})
	}
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
