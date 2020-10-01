// Start of Print Constants //
const {
	log: print,
	error: printerr
} = console;

const argv = [...Deno.args];

const readInput = async (cb) => {
  const buf = new Uint8Array(1024);

  const n = await Deno.stdin.read(buf);
  const data = new TextDecoder().decode(buf.subarray(0, n - 1));

  cb(data);

  return data;
}

// End of Print Constants //

function factorial(num) {
  if (num === 1) {
    return 1;
  } else {
    return num * factorial(num - 1);
  };
};
print(factorial(5));
print("What is your name?");
readInput(function (data) {
  print("Hello " + data + "!");
});
