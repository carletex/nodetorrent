var expect = require("chai").expect;
var Bencoding = require("../lib/bencoding.js");

describe("#decode()", function(){
	it("should decode an integer", function(){
	   var decoder = new Bencoding();
	   var result = decoder.decode('i1e');
	   expect(result).to.eq(1);
	});
	it("should decode an string", function(){
		var decoder = new Bencoding();
		var result = decoder.decode('4:test');
		expect(result.toString()).to.eq('test');
	});
});
