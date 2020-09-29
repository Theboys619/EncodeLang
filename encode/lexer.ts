// xh: do you notice how much of this is just duplicated code?

import { Token, LexerGrammar } from "./types.ts";
import { ENCInvalidCharacter } from "./errors.ts";

import { isOfAny } from "./modules/reduce.ts";

export default class Lexer {
	input!: string;
	filepath!: string;
	grammar!: LexerGrammar;

	tokens: Token[] = [];
	char!: string;
	
	pos = 0;
	index = 0;
	line = 1;

	constructor(input: string, filepath: string, grammar: LexerGrammar) {
		Object.assign(
			this, {
				input,
				filepath,
				grammar,

				char: input[0]
			}
		);
	}

  skip(num = 1): string {
    return this.char = this.input[this.pos += num];
  }

	advance(num = 1) {
		this.index += num;
		return this.char = this.input[this.pos += num];
	}

	peek(num = 1) {
		return this.input[this.pos + num];
	}

	isWhitespace(char = this.char) {
		return this.grammar.Whitespace.includes(char);
	}

	isLinebreak(char = this.char) {
		return char === '\n';
	}

	isLetter(char = this.char): boolean {
		return /[a-z]/i.test(char);
	}

	isNumber(char = this.char) {
		return char === "-"
			&& this.grammar.Digits.includes(this.peek())
			|| this.grammar.Digits.includes(char);
	}

	isString(char = this.char) {
		return this.grammar.Strings.includes(char);
	}

	isOperator(char = this.char) {
		return (
			this.grammar.Operators.includes(char)
			|| this.grammar.Operators.includes(char + this.peek())
			|| this.grammar.Operators.includes(char + this.peek() + this.peek())
		);
	}

	isBinOperator(char = this.char) {
		return this.grammar.BinOperators.includes(char);
	}

	isDelimiter(char = this.char) {
		return this.grammar.Delimiters.includes(char);
	}

	isSpecial(char = this.char) {
		return this.grammar.Special.includes(char);
	}

	isIdentifier(char = this.char) {
		/*return this.isLetter(char)
			|| this.isNumber(char)
			|| this.isSpecial(char);*/
		return isOfAny(
			this,
			<const>[
				"isLetter",
				"isNumber",
				"isSpecial"
			], char
		);
	}

	isSnippet(char = this.char) {
		return char === '`'
			&& this.peek() === '`'
			&& this.peek(2) === '`';
	}

	isInlineComment(char = this.char) {
		let i = 0;
		let str = "";
		const { InlineComment } = this.grammar;
		for ( const letter of InlineComment ) {
			if ( letter === this.peek(i) ) {
				str += letter;
				++i;
			}
		}

		return {
			match: str === InlineComment,
			length: InlineComment.length
		};
		/*
			return {
				match: [...InlineComment]
				.filter(
					letter => letter === this.peek(i) && ++i
				).join("") === InlineComment,
				length: InlineComment.length
			};
		*/
	}

	isBlockComment(index = 0) {
		let i = 0;
		let str = "";
		for ( const letter of this.grammar.BlockComment[index] ) {
			if (letter === this.peek(i)) {
				str += letter;
				++i;
			}
		}

		const temp = this.grammar.BlockComment[index];

		return {
			match: str === temp,
			length: temp.length
		};
	}

  tokenize(): Token[] {
    while ( this.char != null ) {
      const lastPos = this.pos;

      if ( this.isLinebreak() ) {
        if ( !this.isWhitespace() ) {
          this.tokens.push({
            type: "Linebreak",
            value: "\n",
            index: this.index,
            line: this.line
          });
        }

        this.advance();

        ++this.line;
        this.index = 0;
      }

      if ( this.isWhitespace() ) {
        this.advance();
      }

      if ( this.isSnippet() ) {
        this.advance(3);
        let code = "";

        while ( this.char != null && !this.isSnippet() ) {
          code += this.char;
          this.advance();
        }

        this.tokens.push({
          type: "JSSnippet",
          value: code,
          index: this.index,
          line: this.line
        });
        this.advance(3);
      }

      if (this.isInlineComment().match) {
        const { length } = this.isInlineComment();

        this.skip(length);

        while (this.char != null && !this.isLinebreak()) {
          this.skip();
        }
      }

      if ( this.isBlockComment().match ) {
        const lengthStart = this.isBlockComment().length;

        const lengthEnd = this.isBlockComment(1).length;

        this.advance(lengthStart);

        while (this.char != null && !this.isBlockComment(1).match) {
          this.advance();
        }

        this.advance(lengthEnd);
      }

      if (this.isOperator()) {
        const {
          index,
          line
        } = this;


		    let op = this.char;

        while ( this.isOperator(op + this.peek()) && this.char != null ) {
          this.advance();
          op += this.char;
        }

        this.tokens.push({
          type: "Operator",
          value: op,
          index,
          line
        });

        this.advance();
      } else if (this.isBinOperator()) {
        this.tokens.push({
          type: "BinOperator",
          value: this.char,
          index: this.index,
          line: this.line
        });

        this.advance();
      }

      if ( this.isNumber() ) {
        let str = this.char;
        const {
          index,
          line
        } = this;

        this.advance();

        while ( this.char != null && this.isNumber() ) {
          str += this.char;
          this.advance();
        }

        if ( this.char == "." && this.isNumber(this.peek()) ) {
          str += this.char;
          this.advance();
          while (this.char != null && this.isNumber()) {
            str += this.char;
            this.advance();
          }
        }

        this.tokens.push({
          type: "Number",
          value: Number.parseFloat(str),
          index,
          line
        });
      }

      if (this.isString()) {
        let value = "";
        let {
          index,
          line
        } = this;

        this.advance();

        while (this.char != null && !this.isString()) {
          value += this.char;
          this.advance();
        }

        this.tokens.push({
          type: "String",
          value,
          index,
          line
        });

        this.advance();
      }

      if (this.isDelimiter()) {
        this.tokens.push({
          type: "Delimiter",
          value: this.char,
          index: this.index,
          line: this.line
        });

        this.advance();
      }
      
      if (this.isLetter()) {
        let value = "";
        let type = "Identifier";
        const {
          index,
          line
        } = this;

        while (this.char != null && (this.isIdentifier())) {
          value += this.char;
          this.advance();
        }

        if (this.grammar.Datatypes.includes(value)) type = "Datatype";
        if (this.grammar.Keywords.includes(value)) type = "Keyword";
        if (this.isOperator(value)) type = "Operator";
        if (this.isBinOperator(value)) type = "Operator";

        this.tokens.push({
          type,
          value,
          index,
          line
        });
      }

      if (lastPos == this.pos) {
        new ENCInvalidCharacter(`Invalid character '${this.char}' at line ${this.line}, index ${this.index}`);
      }
    }

    this.tokens.push({
      type: "EOF",
      value: "EOF",
      index: 0,
      line: this.line + 1
    });

    return this.tokens;
  }
}