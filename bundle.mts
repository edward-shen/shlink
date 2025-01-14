const DISTRIBUTION_DIR = "./dist";

import { promises } from 'fs';


const compile = async () => {
  await Bun.build({
    entrypoints: [
      "./src/background.mts",
      "./src/options.js",
    ],
    outdir: DISTRIBUTION_DIR,
    sourcemap: "linked",
    target: "browser",
    minify: true,
  });

  await promises.cp("assets/", "dist/", { "recursive": true });
}

const watcher = promises.watch(import.meta.dir, { recursive: true });

process.on("SIGINT", () => {
  // close watcher when Ctrl-C is pressed
  console.log("Closing watcher...");

  process.exit(0);
});

await compile();

const WATCHED_FILE_PATHS = [
  "src/",
  "assets/",
];

for await (const event of watcher) {
  for (const prefix of WATCHED_FILE_PATHS) {
    if (event.filename?.startsWith(prefix)) {
      console.log(`${event.filename} changed`);
      await compile();
    }
  }
}