var expect = require("chai").expect;
var Bencoding = require("../lib/bencoding.js");

describe("#decode()", function(){
	var decoder;

	beforeEach(function () {
    	decoder = new Bencoding();
  	});
	it("should return an empty buffer when passing an empty string", function(){
	   var result = decoder.decode('');
	   expect(result).to.deep.eq(new Buffer(''));
	});
	it("should return an empty buffer when passing an empty buffer", function(){
	   var result = decoder.decode('');
	   expect(result).to.deep.eq(new Buffer(''));
	});
	it("should decode an integer", function(){
	   var result = decoder.decode(new Buffer(''));
	   expect(result).to.deep.eq(new Buffer(''));
	});
	it("should decode a string", function(){
		var result = decoder.decode('4:test');
		expect(result).to.deep.equal(new Buffer('test'));
	});
	it("should decode a list", function(){
		var result = decoder.decode('l4:testi1ee');
		expect(result).to.deep.equal([new Buffer('test'), 1]);
	});
	it("should decode a dictionary", function(){
		var result = decoder.decode('d4:testi1ee');
		expect(result).to.deep.equal({test: 1});
	});
	it("should decode a dictionary with nested elements", function(){
		var result = decoder.decode('d4:testi1e5:test1d4:listli1ei2ei3eeee');
		expect(result).to.deep.equal(
		{
        	"test": 1,
        	"test1": {
          		"list": [1,2,3]
        	}
       	});
	});


});
