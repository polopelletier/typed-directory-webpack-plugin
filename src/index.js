const path = require("path");

const WatchIgnorePlugin = require("webpack").WatchIgnorePlugin;

const typedDirectory = require("typed-directory");
const configFromArgs = require("typed-directory/src/config").loadFromArgs;

function TypedDirectoryWebpackPlugin(){
	this.config = configFromArgs.apply(null, arguments);
	
	const outputFiles = [];
	this.config.forEach(function(entry){
		outputFiles.push(path.resolve(process.cwd(), entry.output));
	});

	this.watchIgnorePlugin = new WatchIgnorePlugin(outputFiles);
}

TypedDirectoryWebpackPlugin.prototype.apply = function(compiler) {
	const self = this;

	function compile(compiler, callback){
		typedDirectory(self.config);
		callback();
	}

	compiler.plugin("before-run", compile);
	compiler.plugin("watch-run", compile);

	this.watchIgnorePlugin.apply(compiler);
};

module.exports = TypedDirectoryWebpackPlugin;