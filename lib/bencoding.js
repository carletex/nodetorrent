'use strict';

// Constants
var i_CHAR = 105;
var l_CHAR = 108;
var d_CHAR = 100;
var e_CHAR = 101;
var colon_CHAR = 58;

var Bencoding = module.exports = function Bencoding () {

	this.cursor = 0;

};

Bencoding.prototype = {

	/**
	 * Data decoder
	 */
	decode : function(data) {
		if(!Buffer.isBuffer(data)) {
			data = new Buffer(data);
		}

		var first_char = data[this.cursor++];

		switch(first_char) {
			case i_CHAR:
				// Integers
				var end = this._findIndex(data, e_CHAR);
				var value = data.slice(this.cursor, end);
				this.cursor = end + 1;

				return parseInt(value.toString());

			case l_CHAR:
				// List
				var value = [];
				while (data[this.cursor] != e_CHAR) {
					value.push(this.decode(data));
				}
				// Skip the e
				this.cursor++;

				return value;

			case d_CHAR:
				var value = {};
				while (data[this.cursor] != e_CHAR) {
					value[this.decode(data)] = this.decode(data);
				}
				// Skip the e
				this.cursor++;

				return value;

			default:
				// Strings
				var colon_position = this._findIndex(data, colon_CHAR);
				var length_value = parseInt(data.slice(this.cursor - 1, colon_position).toString());
				var value = data.slice(colon_position + 1, colon_position + length_value + 1);
				this.cursor = colon_position + length_value + 1;

				return value;
		}
	},

	_findIndex: function (data, value) {
 		for (var i = this.cursor; i < data.length; i++){
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