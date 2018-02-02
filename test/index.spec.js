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

describe("TypedDirectoryWebpackPlugin", function() {

	var compiler, watcher = null;

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

	beforeEach(reset)
	afterEach(function(done){
		this.timeout(10 * 1000);

		reset();

		if(watcher){
			watcher.invalidate();
			watcher.close(function(){
				console.log("Reset: watcher closed");
				watcher = null;
				done();
			});

		}else{
			setTimeout(done, 10);
		}
	});

	it("Can be instanciated", function(){
		assert.isFunction(TypedDirectoryWebpackPlugin);

		const instance = new TypedDirectoryWebpackPlugin(CONFIG);
		assert.isObject(instance);

		assert.isArray(instance.config);
		assert.isObject(instance.watchIgnorePlugin);
		assert.isArray(instance.watchIgnorePlugin.paths);
	});

	it("Exclude the output files", function(){
		const instance = new TypedDirectoryWebpackPlugin(CONFIG);
		assert.deepEqual(instance.watchIgnorePlugin.paths, OUTPUTS);
	});

	it("Can compile", function(done){
		this.timeout(10 * 1000);

		compiler = createCompiler();

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
		this.timeout(10 * 1000);

		var hasWatch = false;

		compiler = createCompiler(new WatchCallbackPlugin(
			function(){
				hasWatch = true
			}, 
			function(){
				if(hasWatch){
					// TODO: Assert it is expected #2

					done();
				}else{
					done("Watch callback wasn't called");
				}
			}));

		watcher = compiler.watch(WATCH_DELAY, function (err) {
			if (err) return done(err);
			
			// Adding a new file should trigger watch-run
			fs.writeFileSync(NEW_FILE_PATH, NEW_FILE_CONTENT);
		});
	});

	it("Does not trigger a new compilation if watch ignored file is modified", function(done){
		this.timeout(30 * 1000);

		var hasWatch, complete = false;
		var isWatchRun = false;

		compiler = createCompiler(new WatchCallbackPlugin(
			function(){
				if(isWatchRun){
					hasWatch = true;					
				}
			},
			function(){
				if(isWatchRun && !complete){
					complete = true;
					done("Should not have trigerred a new compilation");
				}
			}));

		compiler.run(function(err, stats){
			if (err) {
				return done(err);
			}else if(stats.hasErrors()){
				const info = stats.toJson();
				return done(info.errors);
			}

			watcher = compiler.watch(WATCH_DELAY, function (err) {
				if (err) return done(err);
				
				// Adding a new file should trigger watch-run
				const previous = fs.readFileSync(OUTPUTS[0]).toString();
				const next = previous.split("\n")
					.splice(0, 0, "// Some new comment")
					.join("\n");

				isWatchRun = true;
				fs.writeFileSync(OUTPUTS[0], next);
			});

			setTimeout(function(){
				if(!hasWatch){
					complete = true;
					done();
				}
			}, WATCH_DELAY * 2);
		});

	});
});

function createCompiler(){
	const extraPlugins = Array.prototype.slice.apply(arguments);

	return webpack({
		entry: "./test/fixtures/entry.ts",
		output: {
			path: BUILD_PATH,
			filename: BUILD_FILE,
			pathinfo: true
		},
		module: {
			rules: [{
				test: /\.ts$/,
				loader: "awesome-typescript-loader",
				exclude: /expected/,
				include: /fixtures/
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

	const expectedFilename = path.resolve(__dirname, "expected", expectedId + ".out");
	const expected = fs.readFileSync(expectedFilename).toString();

	assert.equal(trimHeader(provided), trimHeader(expected));
}


const CHUNK_NAME_FORMAT = "  \\!\\*\\*\\* \\.\\/test\\/fixtures\\/([a-zA-Z\\/]+\\.[a-z]+) \\*\\*\\*\\!";
const CHUNK_NAME_ALL = new RegExp(CHUNK_NAME_FORMAT, "g");
const CHUNK_NAME_SINGLE = new RegExp(CHUNK_NAME_FORMAT);

function trimBuildComment(str){
	return str.match(CHUNK_NAME_SINGLE)[1];
}

function compareBuild(expectedId){
	const providedFilename = path.resolve(BUILD_PATH, BUILD_FILE);
	const providedContent = fs.readFileSync(providedFilename).toString();
	const provided = providedContent.match(CHUNK_NAME_ALL)
		.map(trimBuildComment);

	const expectedFilename = path.resolve(__dirname, 
			"expected", expectedId.toString(), BUILD_FILE);
	const expectedContent = fs.readFileSync(expectedFilename).toString();
	const expected = expectedContent.match(CHUNK_NAME_ALL)
		.map(trimBuildComment);

	assert.deepEqual(provided.sort(), expected.sort());
}

function WatchCallbackPlugin(watchRun, done){
	this.watchRun = watchRun;
	this.done = done;
}

WatchCallbackPlugin.prototype.apply = function(compiler){
	const self = this;
	compiler.plugin("watch-run", function(compiler, callback){
		self.watchRun();
		callback();
	});

	compiler.plugin("done", function(){
		self.done();
	});
}