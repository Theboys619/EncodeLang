type decode_t = (x: Uint8Array) => string;

const f = Object.freeze;

const decode: decode_t =
	f(
		TextDecoder
		.prototype
		.decode
		.bind(
			f(new TextDecoder)
		)
	);

type encode_t = (x: string) => Uint8Array;

const encode: encode_t =
	f(
		TextEncoder
		.prototype
		.encode
		.bind(
			f(new TextEncoder)
		)
	);

export const readFile = async (
	fileLocation: Parameters<typeof Deno.readFile>[0]
): Promise<string> =>
	decode(
		await Deno.readFile(fileLocation)
	);

type write_t = typeof Deno.writeFile;

export const writeFile = async (
	fileLocation: Parameters<write_t>[0],
	data: string
): ReturnType<write_t> => 
	await Deno.writeFile(
		fileLocation,
		encode(data)
	);