(module
	(type $floatingPointOperator (func (param f64 f64) (result f64)))

	(type $floatingPointComparison (func (param f64 f64) (result i32)))

	(type $booleanComparison (func (param i32 i32) (result i32)))

	(func $+ (export "+") (type 0)
		local.get 0
		local.get 1
		f64.add
	)
	(func $- (export "-") (type 0)
		local.get 0
		local.get 1
		f64.sub
	)
	(func $* (export "*") (type 0)
		local.get 0
		local.get 1
		f64.mul
	)
	(func $/ (export "/") (type 0)
		local.get 0
		local.get 1
		f64.div
	)
	(func $% (export "%") (type 0)
	;; x - y * |_ x / y _|
		local.get 0

		local.get 0
		local.get 1
		f64.div
		f64.floor
		local.get 1
		f64.mul

		f64.sub
	)

	(func $> (export ">") (type 1)
		local.get 0
		local.get 1
		f64.gt
	)
	(func $< (export "<") (type 1)
		local.get 0
		local.get 1
		f64.lt
	)
	(; "close enough" operator, for comparisons between numbers ;)
	(func $~ (export "~") (type 1)
		local.get 0
		local.get 1
		f64.eq
	)
	(; "roughly inequal" operator, close enough to not being equal ;)
	(func $~= (export "~=") (type 1)
		local.get 0
		local.get 1
		f64.ne
	)

	;; "inequality" for booleans
	(func $!= (export "!=") (type 2)
		local.get 0
		local.get 1
		i32.ne
	)
	;; "equality" operator, for booleans to booleans
	(func $= (export "=") (type 2)
		local.get 0
		local.get 1
		i32.eq
	)
	(func $^ (export "^") (type 2)
		local.get 0
		local.get 1
		i32.xor
		i32.const 0
		i32.ne
	)
	(func $| (export "|") (type 2)
		local.get 0
		local.get 1
		i32.or
		i32.const 0
		i32.ne
	)
	(func $& (export "&") (type 2)
		local.get 0
		local.get 1
		i32.and
		i32.const 0
		i32.ne
	)
)