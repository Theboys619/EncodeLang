import { LexerGrammar, Token } from "./types.ts";

import { Scope, Statement, Expression } from "./parser.ts";
import Parser from "./parser.ts";

import { ENCSyntaxError } from "./errors.ts";

import { readFile, writeFile } from "./modules/fs.ts";

const resolve = (relativeURL: string) => new URL(relativeURL, import.meta.url).href;

// This class is useful for indentation, and soon for errors/warnings.
export class Environment {
	variables!: Map<string, any>;
	parent?: Environment;

	spaces!: number;
	enviromentLevel!: number;

	constructor(parent?: Environment, spaces: number = 2) {
		Object.assign(
			this, {
			variables: parent
				? parent.variables
				: new Map,
			parent,

			enviromentLevel: 0,
			spaces
			}
		);
	}

	define(name: string, item: any) {
		this.variables.set(name, item);
	}

	set(name: string, value: any): any {
		const scope = this.lookup(name);

		return (scope || this)?.variables.set(name, value);
	}

	get(name: string): any {
		return this.variables.has(name) === true
			? this.variables.get(name)
			: false;
	}

	lookup(name: string) {
		let scope: Environment | undefined = this;

		while ( scope !== undefined && scope.variables.has(name) === false ) {
			scope = scope.parent;
		}

		return scope;
	}

	extend(level: number = this.enviromentLevel): Environment {
		const env = new Environment(this, this.spaces);

		env.enviromentLevel = level + 1;

		return env;
	}
};

export default class Transpiler {
	ast!: Scope;
	grammar!: LexerGrammar;
	filepath!: string;

	isTop!: boolean;
	topEnv!: Environment;

	mainIndex!: number;
	code!: string;

	spaces!: number;

	constructor(parser: Parser, spaces: number = 2) {
		const {
			ast, grammar,filepath
		} = parser;
		Object.assign(
			this, {
				ast,
				grammar,
				filepath,

				isTop: true,
				topEnv: new Environment(undefined, spaces),
				
				code: "",
				mainIndex: 0,

				spaces
			}
		);
	}

	getIndent(level: number | Environment): string {
		if ( level instanceof Environment ) {
			level = level.enviromentLevel;
		}

	// (level * this.spaces) number of spaces
		return new Array(level * this.spaces)
		.fill(' ')
		.join("");
	}

	async defineLib(filepath: string) {
		const fullpath = resolve(filepath);

		const data = await readFile(fullpath);

		this.code += data + "\n\n\n";
	}

	stringConcat(valueL: any, valueR: any, op: string) {
		switch ( op ) {
			// default: {}
			case "+": {
				return valueL + valueR;
			}
		}
	}

	binaryMap(op: string): string {
		const map: Record<string, string> = {
			"not equal": "!==",
			"equal": "===",
			"greater": ">",
			"less": "<",
			"or": "||",
			"exclusive or": "({L} || {R}) && ({L} !== {R})",
			"and": "&&"
		};

		return map[op] ?? op;
	}

	doBinary(left: Statement, right: Statement, op: string) {
		const typeL = left.type;
		const typeR = right.type;

		const valueL = left.value;
		const valueR = right.value;

		function num(x: number) {
			if (typeof x !== "number") {
				throw new ENCSyntaxError(`Cannot do operation on ${x}, ${x} is not a number!`);
			} else {
				return x;
			}
		}

		function string(x: string) {
			if ( typeof x !== "string" ) {
				new ENCSyntaxError(`Cannot do operation on ${x}, ${x} is not a string!`);
			} else {
				return x;
			}
		}

		if ( typeL == typeR ) {
			if (left.type == "String") {
				return `"${this.stringConcat(string(valueL), string(valueR), this.binaryMap(op))}"`;
			} else {

				// import ops from "./wasm/binaryOps.ts";

				// why do we evalutate right now, shouldn't we just output into a file
				/*
					'+': (x, y) => `${x} + ${y}`,
					'-': (x, y) => `{x} - {y}`,
					'*': (x, y) => `{x} * {y}`,
					'/': (x, y) => `{x} / {y}`,
					'%': (x, y) => `{x} % {y}`,
					'^': (x, y) => `{x} ^ {y}`,
					"exclusive or": (x, y) => `({x} !== 0 || {y} !== 0) && ({x} !== {y})`,
					"or": (x, y) => `{x} || {y}`,
					"and": (x, y) => `{x} && {y}`,
					'&': (x, y) => `{x} & {y}`,
					"greater": (x, y) => `{x} > {y}`,
					"less": (x, y) => `{x} < {y}`,
					"equal": (x, y) => `{x} === {y}`,
					"not equal": (x, y) => `{x} !== {y}`
				*/
				return (<Record<string, (x: number, y: number) => number | boolean>>{
					'+': (x, y) => x + y,
					'-': (x, y) => x - y,
					'*': (x, y) => x * y,
					'/': (x, y) => x / y,
					'%': (x, y) => x % y,
					'^': (x, y) => x ^ y,
					"exclusive or": (x, y) => (x ^ y) !== 0,
					"or": (x, y) => x || y,
					"and": (x, y) => x && y,
					'&': (x, y) => x & y,
					"greater": (x, y) => x > y,
					"less": (x, y) => x < y,
					"equal": (x, y) => x === y,
					"not equal": (x, y) => x !== y
				})[ this.binaryMap(op) ](
					num( valueL ),
					num( valueR )
				);
			}
		}

		return false;
	}

	createBinary(exp: Expression, env: Environment, indentation: boolean = true, addition: boolean | string = "") {
		const binary = this.binaryMap(exp.op);

		this.code += binary.replace(/\{[LR]\}/g, (match: string, ...args: any[]): string =>	{
			const oldLength = this.code.length;

		if ( match === "{L}" || match === "{R}") {
		if ( match === "{L}" ) {
			this.transpile(exp.left, env, indentation);
		} else if ( match === "{R}" ) {
			this.transpile(exp.right, env, false, addition);
		}

		const newCode = this.code.slice(oldLength, this.code.length);
		this.code = this.code.slice(0, oldLength);

		return newCode;
	}

			return match;
		});
	}

	createFunction(exp: Statement, env: Environment, indentation: boolean = true, addition: boolean | string = "") {
		const {
      isAnonymous,
      parameters,
      scope,
      name: {
        value: funcName
      }
    } = exp.value;

		const indent = indentation
		? this.getIndent(env)
		: "";

		this.code += `${indent}function ${
      (isAnonymous)
      ? ""
      : funcName
    }(`;
		
		let first = true;

	// this.code += parameters.map(expr => this.transpile(expr, env, false)).join(", ");

		parameters.forEach((expr: any) => {
			if (first) {
				first = false;
			} else {
				this.code += ", ";
			}
			this.transpile(expr, env, false);
		});

		this.code += ") ";

		this.transpile(scope, env, indentation, addition);
	}

	createVar(exp: Statement, env: Environment, indentation: boolean = true, addition: boolean | string = "") {
		const {
      isConst,
      value: varName
    } = exp.value;

    const spaces = indentation
    ? this.getIndent(env)
    : "";

    this.code += spaces + (
      isConst
        ? "const"
        : "let"
    ) + ' ';

		this.code += `${varName}`;
	}

	createIf(exp: Statement, env: Environment, indentation: boolean = true, addition: boolean | string = "") {
		const { elseScope } = exp.value;

		const spaces = indentation
		? this.getIndent(env)
		: "";

		this.code += spaces + "if (";

		this.transpile(exp.value.condition, env, false);

		this.code += ") ";

		this.transpile(exp.value.scope, env, true, "NoEnd");

		this.code += spaces + '}' + (
		elseScope
			? ""
			: ";\n"
	);

		if (elseScope) {
			this.code += " else ";

			this.transpile(elseScope, env, indentation);
		}
	}

	transpile(exp: any = this.ast, env: Environment = this.topEnv, indentation: boolean = true, addition: boolean | string = "") {
		(<Record<string, () => void>>{
			String: () => {
				this.code += `"${exp.value}"${
					addition || ""}`;
			},

			Number: () => {
				this.code += `${exp.value}${addition || ""}`;
			},

			Boolean: () => {
				const indent = indentation
					? this.getIndent(env)
					: "";
				this.code += `${exp.value}${addition || ""}`;
			},

			Scope: () => {
				const indent = indentation
					? this.getIndent(env)
					: "";
				if ( exp.name !== "main" ) {
					this.code += "{\n";
				}

				const newEnv = exp.name === "main"
					? env
					: env.extend();

				exp.block.forEach((expr: Scope | Statement) => {
					this.transpile(expr, newEnv, true);
				});

				if (addition !== "NoEnd" && exp.name !== "main") {
					this.code += `${indent}}${
						addition === false
							? ""
							: ";\n"
						}`;
				}
			},

			Function: () => {
				this.createFunction(exp, env, indentation, addition);
			},

			FunctionCall: () => {
				const indent = indentation
					? this.getIndent(env)
					: "";

				this.code += `${indent}${exp.value.name.value}(`;

				let first = true;
				exp.value.args.forEach(
					(arg: any) => {
						if ( first === true ) {
							first = false;
						} else {
							this.code += ", ";
						}

						this.transpile(arg, env, false, false);
					}
				);

				this.code += `)${
					addition
						? addition
						: typeof addition === "boolean"
							? ""
							: ";\n"
				}`;
			},

			Assign: () => {
				this.transpile(exp.left, env, indentation);

				this.code += " = ";

				this.transpile(exp.right, env, false, addition || ";\n");
			},

			Variable: () => {
				this.createVar(exp, env);
			},

			Redefine: () => {
				const indent = indentation
					? this.getIndent(env)
					: "";

				this.code += indent + exp.value.value;
			},

			Identifier: () => {
				const indent = indentation
					? this.getIndent(env)
					: "";

				this.code += `${indent}${exp.value}${addition || ""}`;
			},

			If: () => {
				this.createIf(exp, env, true, addition);
			},

			Return: () => {
				const indent = indentation
					? this.getIndent(env)
					: "";
				this.code += indent + "return ";
				this.transpile(exp.value, env, false, ";\n");
			},

			Binary: () => {
				const value = this.doBinary(exp.left, exp.right, exp.op);
				const binary = this.binaryMap(exp.op);

				if ( !value && binary.includes("L") && binary.includes("R") ) {
					this.createBinary(exp, env, indentation, addition);
				} else if ( !value ) {
					this.transpile(exp.left, env, indentation);
					this.code += ` ${this.binaryMap(exp.op)} `;
					this.transpile(exp.right, env, false, addition);
				} else {
					this.code += `${value}${addition ? addition : ""}`;
				}
			},

			JSSnippet: () => {
				this.code += exp.value.value.trim() + "\n\n";
			}
		})[exp.type]();
	}
}