const configFromArgs = require("typed-directory/src/config").loadFromArgs;

function TypedDirectoryWebpackPlugin(){
	this.config = configFromArgs.apply(null, arguments);
}

TypedDirectoryWebpackPlugin.prototype.apply = function(compiler) {
	const self = this;

	var unwatch = null;

	compiler.plugin("before-run", function(compiler, callback){
		const typedDirectory = require("typed-directory");
		typedDirectory(self.config);
		callback();
	});

	compiler.plugin("watch-run", function(compiler, callback){
		if(unwatch == null){
			const watch = require("typed-directory/watch");
			unwatch = watch(self.config);
		}
		callback();
	});

	compiler.plugin("watch-close", function(){
		if(unwatch != null){
			unwatch();
			unwatch = null;
		}
	});
};

module.exports = TypedDirectoryWebpackPlugin;