export interface Token {
  type: string;
  value: any;
  index: number;
  line: number;
};

export interface LexerGrammar {
  Ignore: string[];
  Whitespace: string[];
  
  InlineComment: string;
  BlockComment: string[];

  Keywords: string[];
  Operators: string[];
  BinOperators: string[];
  Datatypes: string[];

  Digits: string;
  Strings: string[];
  Delimiters: string[];

  Special: string[];
};

// export type Precedence = Record<string, number>;

export interface Precedence {
  [x: string]: number
};