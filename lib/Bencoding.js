/*jslint node: true */
'use strict';

// Constants
var i_CHAR = 105;
var l_CHAR = 108;
var d_CHAR = 100;
var e_CHAR = 101;
var colon_CHAR = 58;

var Bencoding = module.exports = function Bencoding () {

	this._cursor = 0;

};

Bencoding.prototype = {

	/**
	 * Data decoder
	 */
	decode: function(data) {
		if(!Buffer.isBuffer(data)) {
			data = new Buffer(data);
		}

		var first_char = data[this._cursor++];
		var value;

		switch(first_char) {
			case i_CHAR:
				// Integers
				var end = this._findIndex(data, e_CHAR);
				value = data.slice(this._cursor, end);
				this._cursor = end + 1;

				return parseInt(value.toString());

			case l_CHAR:
				// List
				value = [];
				while (data[this._cursor] !== e_CHAR) {
					value.push(this.decode(data));
				}
				// Skip the e
				this._cursor++;

				return value;

			case d_CHAR:
				value = {};
				var cursorIni = this._cursor - 1;
				while (data[this._cursor] !== e_CHAR) {
					value[this.decode(data)] = this.decode(data);
				}
				// Skip the e
				this._cursor++;

				// Store a copy of the encoded dictionary
				var encodedDict = data.slice(cursorIni, this._cursor);
				// Hide the value from printing
				Object.defineProperty(value, '_encodedict', {
					value: encodedDict
				});

				return value;

			default:
				// Strings
				var colon_position = this._findIndex(data, colon_CHAR);
				var length_value = parseInt(data.slice(this._cursor - 1, colon_position).toString());
				value = data.slice(colon_position + 1, colon_position + length_value + 1);
				this._cursor = colon_position + length_value + 1;

				return value;
		}
	},

	_findIndex: function (data, value) {
 		for (var i = this._cursor; i < data.length; i++){
	 		if (data[i] === value) {
	 			return i;
	 		}
 		}
 		return false;
 	}

	/**
	 * Data decoder: ToDo
	 */
};