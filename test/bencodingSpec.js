var expect = require("chai").expect;
var bencoding = require("../lib/bencoding.js");

describe("#decode()", function(){
	it("should decode an integer", function(){
	   var result = bencoding.bdecode('i1e');
	   expect(result).to.eq(1);
	});
	it("should decode an string", function(){
		var result2 = bencoding.bdecode('4:test');
		expect(result2).to.eq(new Buffer('test'));
	});
});
