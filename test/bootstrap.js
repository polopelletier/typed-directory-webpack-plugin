const path = require("path");

global.assert = require("chai").assert;

global.requireSrc = function(filename) {
	return require(path.resolve(process.cwd(), "src", filename));
}