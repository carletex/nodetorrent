// Required modules
var fs = require('fs');

var filename = process.argv[2];

try {
	var file_content = fs.readFileSync(filename, 'utf-8');
}
catch(err) {
    console.log('Something went wrong: ' + err);
    return;
}

bdecode(file_content, 0);

/*
* Decode function
*/

function bdecode (data, cursor) {
	var first_char = data.charAt(cursor)
	cursor++;

	switch(first_char) {
		case 'i':
			// Integers
			var integer = '';
			for (character = ''; character != 'e'; cursor++) {
				integer += character;
				character = data.charAt(cursor);
			}
			console.log(parseInt(integer));
			return cursor;
			break;

		case 'l':
			// List
			while (data.charAt(cursor) != 'e') {
				cursor = bdecode(data, cursor);
			}
			// Skip the e
			cursor++;
			return cursor;
			break;

		case 'd':
			while (data.charAt(cursor) != 'e') {
				cursor = bdecode(data, cursor);
			}
			// Skip the e
			cursor++;
			return cursor;
			break;
		default:
			// Strings
			var str = '';
			var str_len = first_char;
			while (data.charAt(cursor) != ':') {
				str_len += data.charAt(cursor);
				cursor++;
			}
			// Skip the colon
			cursor++;
			for (i = 0; i < str_len; i++) {
				str += data.charAt(cursor);
				cursor++;
			}
			console.log(str);
			return cursor;
	}
}

