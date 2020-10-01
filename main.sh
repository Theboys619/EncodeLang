deno run \
	--unstable \
	--lock='./package.json' \
	--config='./tsconfig.json' \
	--lock-write \
	--allow-all \
	'./encode/main.ts' \
	run \
	'./encode/tests/test.enc' -S;

# xh: Should we do anything about the 2 seperate Repls?

# xh: Also, Rohil, I need a copy of the image or something, so the server can use it as the site icon

# T619: Send me discord invite link