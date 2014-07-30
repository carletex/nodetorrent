'use strict';

// Required modules
var fs = require('fs');
var Bencoding = require("./lib/Bencoding.js");

var filename = process.argv[2];

try {
	var fileContent = fs.readFileSync(filename);
}
catch(err) {
    console.log('Something went wrong: ' + err);
    return;
}

var decoder = new Bencoding();
console.log(decoder.decode(fileContent));
