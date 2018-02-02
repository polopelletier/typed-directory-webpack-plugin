const TypedDirectoryWebpackPlugin = requireSrc("index");

const fs = require("fs");
const path = require("path");

const webpack = require("webpack");

const FIXTURES_DIR = path.resolve(__dirname, "fixtures");

const BUILD_PATH = path.resolve(__dirname, "build");
const BUILD_FILE = "build.js";
const BUILD_FULL_PATH = path.resolve(BUILD_PATH, BUILD_FILE);

const CONFIG = [
	{
		dir: path.resolve(FIXTURES_DIR, "animals/content"),
		type: path.resolve(FIXTURES_DIR, "animals/Animal.ts"),
		output: path.resolve(FIXTURES_DIR, "animals/output.ts"),
		instance: true
	},
	{
		dir: path.resolve(FIXTURES_DIR, "classes/content"),
		type: path.resolve(FIXTURES_DIR, "classes/BaseClass.ts"),
		output: path.resolve(FIXTURES_DIR, "classes/output.ts")
	}
];

const OUTPUTS = [];
for(var i = 0; i < CONFIG.length; i++){
	OUTPUTS.push(CONFIG[i].output);
}

const NEW_FILE_PATH = path.resolve(FIXTURES_DIR, "animals/content/zoo/elephant.ts");
const NEW_FILE_CONTENT = 	'import Animal from "../../Animal";' + '\n' +
							'' + '\n' +
							'export default new Animal("Elephant", "Pawoo!");';

const WATCH_DELAY = 500;
const WATCH_OPTIONS = {

	aggregateTimeout: WATCH_DELAY
};

var watcher = null;

describe("TypedDirectoryWebpackPlugin", function() {

	function reset(){
		for(var i = 0; i < OUTPUTS.length; i++){
			try {
				fs.unlinkSync(OUTPUTS[i]);
			}catch(e){

			}			
		}

		try {
			fs.unlinkSync(BUILD_FULL_PATH);
		}catch(e){

		}

		try {
			fs.unlinkSync(NEW_FILE_PATH);
		}catch(e){

		}
	}

	beforeEach(reset);
	afterEach(function(done){
		unwatch(function(err){
			reset();
			done(err);
		});
	});

	it("Can be instanciated", function(){
		assert.isFunction(TypedDirectoryWebpackPlugin);

		const instance = new TypedDirectoryWebpackPlugin(CONFIG);
		assert.isObject(instance);

		assert.isArray(instance.config);
	});

	it("Can compile", function(done){
		this.timeout(30 * 1000);

		const compiler = createCompiler();

		compiler.run(function(err, stats) {
			if (err) {
				return done(err);
			}else if(stats.hasErrors()){
				const info = stats.toJson();
				return done(info.errors);
			}

			compareOutput(CONFIG[0].output, "1/animals.ts");
			compareOutput(CONFIG[1].output, "1/classes.ts");

			compareBuild(1);

			done();
		});
	});

	it("Can watch", function(done) {
		this.timeout(30 * 1000);

		var complete = false;
		var isWatchRun = false;

		function onComplete(err){
			if(!complete){
				complete = true;
				unwatch(done, err);
			}
		}

		function onCompilationDone(){
			const i = isWatchRun ? 2 : 1;

			try {
				compareOutput(CONFIG[0].output, i + "/animals.ts");
				compareOutput(CONFIG[1].output, i + "/classes.ts");

				compareBuild(i);
			}catch(e){
				onComplete(e);
			}

			if(isWatchRun){
				onComplete();					
			}
		}

		const compiler = createCompiler(new CompilationDoneCallbackPlugin(onCompilationDone));

		watcher = compiler.watch(WATCH_OPTIONS, function(err){
			if(err) return onComplete(err);

			try {
				isWatchRun = true;
				fs.writeFileSync(NEW_FILE_PATH, NEW_FILE_CONTENT);
			}catch(e){
				onComplete(e);
			}
		});
	});
});

function createCompiler(){
	const extraPlugins = Array.prototype.slice.apply(arguments);

	return webpack({
		context: path.resolve(__dirname, "fixtures"),
		entry: "./entry.ts",
		output: {
			path: BUILD_PATH,
			filename: BUILD_FILE,
			pathinfo: true
		},
		module: {
			rules: [{
				test: /\.ts$/,
				loader: "awesome-typescript-loader"
			}]
		},
		resolve: {
			extensions: [ ".ts", ".js" ]
		},
		plugins: [
			new TypedDirectoryWebpackPlugin(CONFIG)
		].concat(extraPlugins)
	});
}

function trimHeader(file){
	return file
		.split("\n")
		.slice(1)
		.join("\n");
}

function compareOutput(providedFilename, expectedId){
	const provided = fs.readFileSync(providedFilename).toString();

	const expectedFilename = path.resolve(__dirname, "expected", expectedId);
	const expected = fs.readFileSync(expectedFilename).toString();

	assert.equal(trimHeader(provided), trimHeader(expected));
}


const CHUNK_NAME_FORMAT = "  \\!\\*\\*\\* \\./([a-zA-Z\\/]+\\.[a-z]+) \\*\\*\\*\\!";
const CHUNK_NAME_ALL = new RegExp(CHUNK_NAME_FORMAT, "g");
const CHUNK_NAME_SINGLE = new RegExp(CHUNK_NAME_FORMAT);

function trimBuildComment(str){
	return str.match(CHUNK_NAME_SINGLE)[1];
}

function compareBuild(expectedId){
	const providedContent = fs.readFileSync(BUILD_FULL_PATH).toString();
	const provided = providedContent.match(CHUNK_NAME_ALL)
		.map(trimBuildComment);

	const expectedFilename = path.resolve(__dirname, "expected", expectedId.toString(), BUILD_FILE);
	const expectedContent = fs.readFileSync(expectedFilename).toString();
	const expected = expectedContent.match(CHUNK_NAME_ALL)
		.map(trimBuildComment);

	assert.deepEqual(provided.sort(), expected.sort());
}

function unwatch(done, err){
	if(watcher){
		watcher.invalidate();
		watcher.close(function(){
			console.log("Watcher closed");
			watcher = null;
			done(err);
		});

	}else{
		setTimeout(function(){
			done(err);
		}, 10);
	}
}

function CompilationDoneCallbackPlugin(done){
	this.done = done;
}

CompilationDoneCallbackPlugin.prototype.apply = function(compiler){
	const self = this;

	compiler.plugin("done", function(){
		self.done();
	});
};