#!/usr/bin/env deno
// Dependencies //

import * as Path from "https://deno.land/std@0.69.0/path/mod.ts";

import { writeFile, readFile } from "./modules/fs.ts";

// Custom Modules //

import { LexerGrammar } from "./types.ts";

import Lexer from "./lexer.ts";
import Parser from "./parser.ts";
import Transpiler from "./transpiler.ts";

// Main Functions //

const decode =
	TextDecoder
	.prototype
	.decode
	.bind(new TextDecoder);

const encode =
	TextEncoder
	.prototype
	.encode
	.bind(new TextEncoder);

function main(): number | void {
	const argv = [...Deno.args];
	const argc = argv.length;

	switch ( argv[0] ) {
		default: {
			console.error("No arguments were passed to the compiler");

			return 1;
		} case "run": {
			if (argc < 2)  {
				console.error("Less than 2 command line arguments were provided, for the \"run\" command, missing input file.");

				return 1;
			}

			run(Path.resolve(argv[1]), argv);
		};
	} 
}

if (import.meta.main)
  main();

// Run File //

async function run(
	fullpath: string,
	argv: string[]
) {
	const grammar: LexerGrammar = {
		Ignore: [
			";",
			".",
			"\n"
		], // Mainly used when parsing scopes
		Whitespace: [
			" ",
			"\t",
			"\r",
			"\n"
		],

		InlineComment: "//",
		BlockComment: [
			"/*",
			"*/"
		],

		Keywords: [
			"add",
			"set",
			"change",
			"go",
			"param",
			"function",
			"call",
			"return",
			"with",
			"constant",
			"import",
			"create",
			"if",
			"else",
			"than",
			"is",
		],
		Datatypes: [],

		Operators: [
			"not",
			"&",
			"^",
			"exclusive",
			"and",
			"or",
			"to",
			"equal",
			"greater",
			"less",
			"&&",
			"||",
			">",
			"<",
			">=",
			"<=",
			"=="
		],
		BinOperators: [
			"*",
			"/",
			"%",
			"+",
			"-"
		],

		// Digits ought to be an array [..."0123456789"]
		Digits: "0123456789",
		Strings: [
			'"',
			"'"
		],
		Delimiters: [
			";",
			".",
			",",
			"{",
			"}"
		],

		Special: [
			"_",
			"$",
			"@",
			"#"
		]
	};

	const fileName = new URL(
		fullpath,
		import.meta.url
	).pathname
	.replace(/\.\w+/g, "");

	const outFile = Path.resolve(`${fileName}.js`);

	const input = await readFile(fullpath);

	const lexer = new Lexer(input, fullpath, grammar);

	const parser = new Parser; // or you can pass the lexer directly into the constructor

	lexer.tokenize();

	const ast = parser.parse(lexer);

	// console.log(ast.block); // Enable for debugging

	const transpiler = new Transpiler(parser);

	transpiler.transpile();

	const code = encode(transpiler.code);

	if ( argv.includes( "-S" ) ) {
		await writeFile(outFile, transpiler.code);
	} else {
		// probably newlines causing undefineds to pop up
		const process = Deno.run({
      stdout: "piped",
			cmd: ["deno", "eval", transpiler.code]
		}); // Idk if this is ok

		process
		.output()
		.then(decode)
		.then(console.log);
	}
};