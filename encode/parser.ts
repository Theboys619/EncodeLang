import { LexerGrammar, Token, Precedence } from "./types.ts";
import { ENCError, ENCSyntaxError } from "./errors.ts";
import Lexer from "./lexer.ts";

import * as fs from "https://deno.land/std@0.69.0/fs/mod.ts";
import * as Path from "https://deno.land/std@0.63.0/path/mod.ts";

import { isOfAny } from "./modules/reduce.ts";

const { os } = Deno.build;

const resolve = (relativeURL: string) => {
	const url = new URL(
		relativeURL,
		import.meta.url
	).href;

	return url.replace(
		"file://" + 
		(os === "windows"
			? "/"
			: ""),
		""
	);
};

const PREC: Precedence = {
  "to": 1,

  "&": 2,
  "^": 3, "exclusive or": 3,
  
  "and": 4, "&&": 4,
  "or": 5, "||": 5,
  
  "not equal": 7, "equal": 7, "greater": 7, "less": 7, "<": 7, ">": 7, "<=": 7, ">=": 7, "==": 7, "!=": 7,

  "+": 10, "-": 10,
  "*": 20, "/": 20, "%": 20,
};

export class Expression {
  type!: string;

  left!: any;
  op!: string;
  right?: any;

  constructor(
	  type: string,
	  left: any,
	  op: string = "none",
	  right?: any
	) {
		Object.assign(
			this, {
				type,
				left,
				op,
				right
			}
		);
	}
}

export class Statement {
  type: string;
  value: any;

  constructor(type: string, value: any = {}) {
    this.type = type;
    this.value = value;
  }
};

export class Scope {
  type: string;
  name: string;
  block: any[];

  constructor(name: string = "Scope", block: any[] = []) {
    this.type = "Scope";
    this.name = name;
    this.block = block;
  }
}

// the 'p' before methods stands for parse
// the '$' before methods stands for parse if matches and return the parsed data or return the token back

export default class Parser { // Modify the parser as you please
  lexer?: Lexer;
  tokens!: Token[];
  grammar!: LexerGrammar;
  filepath!: string;

  curTok!: Token;
  pos!: number;

  ast!: Scope;
  libs!: Record<string, {
	  filepath: string,
	  filename: string
	}>;

  constructor(lexer?: Lexer) {
    Object.assign(
      this, {
        lexer,
        tokens: lexer?.tokens ?? [],
        grammar: lexer?.grammar ?? {},
        filepath: lexer?.filepath ?? "Unknown",

        curTok: lexer?.tokens[0] ?? {},
        pos: 0,

        ast: new Scope("main"),
        libs: {}
      }
    );
  }

  addNewToken(type: string, value: any) {
    this.tokens.splice(this.pos, 0, {
      type,
      value,
      index: 0,
      line: 0
    });
    ++this.pos;

    this.advance(-1);
  }

  advance(num: number = 1): Token { // Get the next token 
    this.pos += num;
    this.curTok = this.tokens[this.pos];

    return this.curTok;
  }

  peek(num: number = 1): Token { // Peek the next token or previous
    return this.tokens[this.pos + num];
  }

  defineModule(filepath: string, filename: string) {
    this.libs[filename] = {
      filename,
      filepath
    }
  }

  // Helping hand methods //

  constructNull(): Token {
	  const {
		  index,
		  line
	  } = this.peek(-1);
    return {
		type: "Null",
		value: null,
		index,
		line
	};
  }

  isKeyword(
	  value?: string,
	  peek?: Token
	): boolean {
    if ( peek ) {
      return peek.type == "Keyword"
	  	&& (!value || peek.value == value);
    }

    return this.curTok.type == "Keyword"
		&& (!value || this.curTok.value == value);
  }

  isDatatype(
	  value?: string,
	  peek?: Token
	): boolean {
    if (peek) {
      return peek.type == "Datatype" && (!value || peek.value == value);
    }

    return this.curTok.type == "Datatype" && (!value || this.curTok.value == value);
  }

  isIdentifier(
	  value?: string,
	  peek?: Token
	): boolean {
    if (peek) {
      return peek.type == "Identifier" && (!value || peek.value == value);
    }

    return this.curTok.type == "Identifier" && (!value || this.curTok.value == value);
  }

  isDelimiter(
	  value?: string,
	  peek?: Token
	): boolean {
    if (peek) {
      return peek.type == "Delimiter" && (!value || peek.value == value);
    }

    return this.curTok.type == "Delimiter" && (!value || this.curTok.value == value);
  }

  isOperator(value?: string, peek?: Token): boolean {
    if ( peek ) {
      return peek.type == "Operator" && (!value || peek.value == value);
    }

    return this.curTok.type == "Operator" && (!value || this.curTok.value == value);
  }

  isBinOperator(value?: string, peek?: Token): boolean {
    if (peek) {
      return peek.type == "BinOperator" && (!value || peek.value == value);
    }

    return this.curTok.type == "BinOperator" && (!value || this.curTok.value == value);
  }

  isNumber(value?: string, peek?: Token): boolean {
    if (peek) {
      return peek.type == "Number" && (!value || peek.value == value);
    }

    return this.curTok.type == "Number" && (!value || this.curTok.value == value);
  }

  isString(value?: string, peek?: Token): boolean {
    if (peek) {
      return peek.type == "String" && (!value || peek.value == value);
    }

    return this.curTok.type == "String" && (!value || this.curTok.value == value);
  }

  isLinebreak(value?: string, peek?: Token): boolean {
    if (peek) {
      return peek.type == "Linebreak" && (!value || peek.value == value);
    }

    return this.curTok.type == "Linebreak" && (!value || this.curTok.value == value);
  }

  isCustom(type: string, value?: string, peek?: Token): boolean {
    if (peek) {
      return peek.type == type && (!value || peek.value == value);
    }

    return this.curTok.type == type && (!value || this.curTok.value == value);
  }

  isIgnore(peek?: Token): boolean {
    if (peek) {
      return this.grammar.Ignore.includes(peek.value);
    }

    return this.grammar.Ignore.includes(this.curTok.value);
  }

  isEOF(): boolean {
    return this.curTok.type == "EOF";
  }

  // Pretty much like expecting something, EX: skipOver("if")
  // If the curTok is not an if Statement throw an error
  skipOver(
	  value?: string[] | string,
	  type?: string, // = ""
    required?: boolean
	): void {
    let currentValue = "";
    let index = 0;
    
    const nextInput = (): any => {
      
      if (typeof value === "undefined") {
        if ( type && this.isCustom(type, currentValue) ) {
          this.advance();
        }

        return nextInput();
      }

		currentValue = Array.isArray(value)
			? value[index++]
			: value ?? "";

      if (
		  index < value.length
		  && this.isKeyword(currentValue) ||
		  isOfAny(
			this,
			<const>[
				"isIdentifier",
				"isDatatype",
				"isString",
				"isNumber",
				"isBinOperator",
				"isOperator",
				"isDelimiter",
				"isLinebreak"
			],
			currentValue
		  )
		) {
        return this.advance();
      } else {
        if ( required
			&& Array.isArray(value)
			&& index > value.length
		) {
          new ENCSyntaxError(`Invalid token '${this.curTok.value}' expected '${value.join("', '")}'`)
        } else if (required && typeof value == "string") {
          new ENCSyntaxError(`Invalid token '${this.curTok.value}' expected '${currentValue}'`);
        }

        nextInput();
      }
    }

    nextInput();
  }

  pDelimiters(
	  start: string[] | string,
  	end: string,
		separator: string[] | string,
		parser: Function
  ): any[] {
    const values = [];  
    let isFirst = true;

    this.skipOver(start);
    while (!this.isEOF()) {

      if (this.isDelimiter(end)) {
        break;
      } else if (isFirst) {
        isFirst = false;
      } else {
        this.skipOver(separator);
      }

      if (this.isDelimiter(end)) {
        break;
      }

      const value = parser.call(this, []);

      if ( value ) {
        values.push(value);
      }

    }
    this.skipOver(end);

    return values;
  }

  skipOverExtra() {
    if (this.isKeyword("is")) this.skipOver("is");
    else if (this.isOperator("to")) this.skipOver("to");
    else if (this.isKeyword("than")) this.skipOver("than");
  }

  $isCall(exprCb: Function): Statement | Token {
    const expression: Token | Statement = exprCb(); // Possibly function name / identifier token

    // TODO

    if (this.isKeyword("call", this.peek(-1))) {
      this.pCall((expression) as Token);
    }

    return this.isKeyword("call")
		? this.pCall((this.advance()) as Token)
		: expression;
  }

  pOperator(operator: string): boolean {
    const words = operator.split(" ");
    const wordCount = words.length;

    let isTrue = (
    wordCount > 0
    && this.isBinOperator(words[0])
    || this.isOperator(words[0])
    );

    for (let i = 1; i < wordCount; i++) {
      const word = words[i];
      isTrue = this.isBinOperator(word, this.peek(i)) || this.isOperator(word, this.peek(i))
    }

    return isTrue;
  }

  pBinary(left: any, prec: number): any {
    let isBinary = this.isKeyword("is");
    if (isBinary) this.advance();

    const op = this.curTok;
    let wordCount = op.value.split(" ").length;

    if (this.pOperator("exclusive or")) { // prob could use .join and maybe a ternary
      op.value = "exclusive or";
      wordCount = op.value.split(" ").length;
    } else if (this.pOperator("not equal")) {
      op.value = "not equal";
      wordCount = op.value.split(" ").length;
    }

    if (this.isBinOperator() || this.isOperator()) {
      const newPrec = PREC[op.value];
      if (newPrec > prec) {
        this.advance(wordCount || 1);

        if (isBinary)
          this.skipOverExtra();

        const type = op.value == "to"
			  ? "Assign"
			  : "Binary";


        return this.pBinary(new Expression(type, left, op.value, this.pBinary(this.pAll(), newPrec)), prec);
      }
    }

    return left;
  }

  pCall(functionName: Token): Statement {
    this.advance(); // advance over the identifier
    // if (this.curTok.value !== "with") {
    //   this.advance();
    // }

    // console.log(functionName, this.curTok);

    const func = new Statement("FunctionCall");
    const args = this.isKeyword("with")
		? this.pDelimiters("with", ".", ",", this.pExpression)
		: [];

    func.value = {
      name: functionName,
      args: args,
      line: functionName.line,
      index: functionName.index
    };

    if (this.isDelimiter(".", this.peek(-1))) this.advance(-1)
    
    return func;
  }

  pVariable(): Statement {
    this.skipOver("set");
    let value = {
      ...this.curTok,
      isConst: false
    };

    if (this.isKeyword("constant")) {
      this.advance();
      value = {
        ...this.curTok,
        isConst: true
      };
    }

    const variable = new Statement("Variable", value);

    this.advance();
    
    return variable;
  }

  pRedefine(): Statement {
    this.skipOver("change");

    const redefine = new Statement("Redefine", this.curTok);

    this.advance();

    return redefine;
  }

  pImport() {
    this.skipOver("import");

    let importpath = Path.join(this.filepath, "../", this.curTok.value); // Path relative to the current file
    const fileName = this.curTok.value; // Relative Path

    if (!fs.existsSync(importpath)&& !this.libs.hasOwnProperty(fileName))
      new ENCError(`Cannot import a file that does not exist! File ${importpath} does not exist!`);

    if (this.libs.hasOwnProperty(fileName)) importpath = this.libs[fileName].filepath;

    const filedata = new TextDecoder("utf8").decode(Deno.readFileSync(importpath));
    const lexer = new Lexer(filedata, importpath, this.grammar);
    const newtokens = lexer.tokenize();
    newtokens.splice(newtokens.length-1, 1); // Splice off EOF token

    this.tokens.splice(this.pos, 1); // Take of the string token
    this.tokens.splice(this.pos, 0, ...newtokens); // Insert the new tokens
    this.curTok = this.tokens[this.pos]; // Set current token to the first Imported Token


    this.tokens.splice(this.pos-1, 1); // Splice off Import Token
    this.advance(-1); // Advance the position -1 to keep position sync with token

    return this.pAll();
  }

  pSnippet(): Statement {
    let snippetType = "JSSnippet";

    const JSSnippet = new Statement(snippetType, this.curTok);
    this.advance();

    return JSSnippet;
  }

  pFunction(): Statement {
    this.skipOver("create");
    this.skipOver("function");

    const isAnonymous = (
      this.curTok.value == "with"
      || this.curTok.value == "{"
    );

    const funcName = (!isAnonymous)
    ? this.curTok
    : { value: "Anonymous", type: "String", index: this.curTok.index, line: this.curTok.line };

    if (!isAnonymous) this.advance();

    const parameters = (this.curTok.value == "with")
    ? this.pDelimiters("with", ".", ",", this.pExpression)
    : [];
    
    const scope = new Scope(funcName.value, this.pDelimiters("{", "}", this.grammar.Ignore, this.pExpression));

    if (!this.isDelimiter(".")) {
      this.addNewToken("Delimiter", ".")
    }

    return new Statement("Function", {
      name: funcName,
      isAnonymous,
      parameters,
      scope
    });
  }

  /* Old if Statement
  pIf(): Statement {
    this.skipOver("if");

    const ifStatement = new Statement("If");
    const condition = this.pExpression();

    this.skipOver("then");

    if (this.isDelimiter(".")) {
      this.skipOver(".");
    }

    const scope = new Scope("If", this.pDelimiters("{", "}", this.grammar.Ignore, this.pExpression));
    let elseScope = null;

    if (this.isKeyword("else")) {
      this.skipOver("else");
      
      elseScope = new Scope("Else", this.pDelimiters("{", "}", this.grammar.Ignore, this.pExpression));
    }

    if (!this.isDelimiter(".")) {
      this.addNewToken("Delimiter", ".");
    }

    ifStatement.value = {
      condition,
      scope,
      elseScope
    };

    return ifStatement;
  }*/

  pIf(): Statement | void {
    const oldPos = this.pos;
    const oldTok = this.curTok;
    const oldAst = this.ast;

    const ifStatement = new Statement("If");

    const scope = new Scope("If", this.pDelimiters("{", "}", this.grammar.Ignore, this.pExpression)); // thenScope

    if (!this.isKeyword("if")) {
      this.curTok = oldTok;
      this.pos = this.pos;
      this.ast = oldAst;

      return;
    } else {
      this.skipOver("if");
    }

    const condition = this.pExpression();
    let elseScope = null;

    if (this.isDelimiter(".")) {
      this.skipOver(".");
    }

    if (this.isKeyword("else")) {
      this.skipOver("else");
      
      elseScope = new Scope("Else", this.pDelimiters("{", "}", this.grammar.Ignore, this.pExpression));
    }

    if (!this.isDelimiter(".")) {
      this.addNewToken("Delimiter", ".");
    }

    ifStatement.value = {
      condition,
      scope,
      elseScope
    };

    return ifStatement;
  }

  pReturn(): Statement {
    this.skipOver("return");

    const returnStatement = new Statement("Return", this.pExpression());

    if (!this.isDelimiter(".")) {
      this.addNewToken("Delimiter", ".");
    }

    return returnStatement;
  }

  pAll(): Statement {
    return this.$isCall(() => {

      if (this.isDelimiter("(")) { // Expressions (2 + 2) * 5 or (thing == thing)
        this.skipOver("(");
        const expr = this.pExpression();
        this.skipOver(")");

        return expr;
      }

      if (this.isDelimiter("{")) {
        const ifStmt = this.pIf();
        if (ifStmt) return ifStmt;
      }

      if (this.isKeyword("import")) {
        return this.pImport();
      }

      if (this.curTok.type == "JSSnippet") {
        return this.pSnippet();
      }

      if (this.isKeyword("create")) {
        return this.pFunction();
      }

      if (this.isKeyword("set")) {
        return this.pVariable();
      }

      if (this.isKeyword("change")) {
        return this.pRedefine();
      }

      if (this.isKeyword("call")) {
        return this.pCall(this.advance());
      }

      // Old if statement
      // if (this.isKeyword("if")) {
      //   return this.pIf();
      // }

      if (this.isKeyword("return")) {
        return this.pReturn();
      }

      const oldTok = this.curTok;

      if (this.isNumber()) {
        this.advance();

        return oldTok;
      } else if (this.isIdentifier()) {
        if (!this.isKeyword("call", this.peek(-1))) {
          this.advance();
      }

        return oldTok;
      }
      
      if (this.isString()) {
        this.advance();
        return oldTok;
      }

      new SyntaxError(`Unexpected '${this.curTok.type}:${this.curTok.value}'`);

      // throw error if it reaches here TODO

    });
  }

  pExpression(): Statement | Expression | Scope | Token {
    return this.$isCall(() => {
      return this.pBinary(this.pAll(), 0);
    });
  }

  parse(lexer?: Lexer) {
    if (!this.lexer && !lexer) {
      throw new Error("To parse please provide a lexer!");
    }

    // isn't it already assumed that they have a lexer
    // If there isn't a lexer passed into the constructor then they have to pass it into the parse method.
    if ( lexer ) {
      Object.assign(
        this, {
          lexer,
          tokens: lexer.tokens,
          grammar: lexer.grammar,

          curTok: lexer.tokens[0],
          pos: 0,

          ast: new Scope("main"),
          libs: {}
        }
      );
    }

    this.defineModule(resolve("./main/stdio.enc"), "stdio.enc");

    while (this.curTok != null && !this.isEOF()) {
      const expr = this.pExpression();
      if (expr) {
        this.ast.block.push(expr);
      }

      if (!this.isEOF()) {
        this.skipOver(this.grammar.Ignore, undefined, false);
      }
    }

    return this.ast;
  }
}