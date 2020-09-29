// We can do some stuff in wasm and other threads, right?
// yea prob

type f64 = number;
type i32 = 0 | 1; // boolean

// floatingPointOperator
// (number, number) => number
type $0 = (x: f64, y: f64) => f64;

// floatingPointComparison
// (number, number) => boolean
type $1 = (x: f64, y: f64) => i32;

// booleanComparison
// (boolean, boolean) => boolean
type $2 = (x: i32, y: i32) => i32;

// the actual names and types in the binary; do not change
type binaryOps_t = Readonly<{
	'+': $0,
	'-': $0,
	'*': $0,
	'/': $0,
	'%': $0,

	'>': $1,
	'<': $1,
	// "close enough" operator, for comparisons between numbers
	'~': $1,
	// "roughly inequal" operator, close enough to not being equal
	"~=": $1,

	// "inequality" for booleans
	"!=": $2,
	// "equality" operator, for booleans to booleans
	'=': $2,
	'^': $2,
	'|': $2,
	'&': $2
}>;

const { // value; destructured because it's a promise
	instance: {
		exports: ops
	}
} = await WebAssembly.instantiate(
	await Deno.readFile(
		// Path.resolve; epic fail
		new URL(
			"./binaryOps.wasm",
			import.meta.url
		)
	)
) as unknown as { // type
	instance: {
		exports: binaryOps_t
	}
};

export default Object.freeze(ops);

// rename as you please
export const {
	'+': add,
	'-': sub,
	'*': mul,
	'/': div,
	'%': mod,

	'>': gt,
	'<': lt,
	'~': f_eq,
	"~=": f_ne,

	"!=": ne,
	'=': eq,
	'^': xor,
	'|': or,
	'&': and
} = ops;