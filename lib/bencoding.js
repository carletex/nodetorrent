'use strict';

// Constants
var i_CHAR = 105;
var l_CHAR = 108;
var d_CHAR = 100;
var e_CHAR = 101;
var colon_CHAR = 58;

function Bdecoder () {

	this.cursor = 0;
	this.stringData;

	/**
	 * Data decoder
	 */

	this.decode = function(data) {
		if(!Buffer.isBuffer(data)) {
			data = new Buffer(data);
		}
		var first_char = data[this.cursor++];
		this.stringData = this.stringData || data.toString();
		switch(first_char) {
			case i_CHAR:
				// Integers
				var end = this.stringData.indexOf('e', this.cursor);
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
				var colon_position = this.stringData.indexOf(':', this.cursor);
				var length_value = parseInt(data.slice(this.cursor - 1, colon_position).toString());
				var value = data.slice(colon_position + 1, colon_position + length_value + 1);
				this.cursor = colon_position + length_value + 1;

				return value;
		}
	};

}

module.exports = Bdecoder;