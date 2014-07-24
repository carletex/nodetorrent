'use strict';

// Required modules
var fs = require('fs');

// Contants
var i_CHAR = 105;
var l_CHAR = 108;
var d_CHAR = 100;
var e_CHAR = 101;
var colon_CHAR = 58;

var filename = process.argv[2];

try {
	var fileContent = fs.readFileSync(filename);
}
catch(err) {
    console.log('Something went wrong: ' + err);
    return;
}

var cursor = 0;
var stringData = fileContent.toString();
var decodedData = bdecode(fileContent);
console.log(decodedData);

/**
 * Data decoder
 */
function bdecode (data) {
	var first_char = data[cursor++];

	switch(first_char) {
		case i_CHAR:
			// Integers
			var end = stringData.indexOf('e', cursor);
			var value = data.slice(cursor, end);
			cursor = end + 1;

			return value;

		case l_CHAR:
			// List
			var value = [];
			while (data[cursor] != e_CHAR) {
				value.push(bdecode(data));
			}
			// Skip the e
			cursor++;

			return value;

		case d_CHAR:
			var value = {};
			while (data[cursor] != e_CHAR) {
				value[bdecode(data)] = bdecode(data);
			}
			// Skip the e
			cursor++;

			return value;

		default:
			// Strings
			var colon_position = stringData.indexOf(':', cursor);
			var length_value = parseInt(data.slice(cursor - 1, colon_position).toString());
			var value = data.slice(colon_position + 1, colon_position + length_value + 1);
			cursor = colon_position + length_value + 1;

			return value;
	}
}
