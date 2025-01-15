import { promises } from "fs";
import { parseArgs } from "util";

const DISTRIBUTION_DIR = "./dist";
const WATCHED_FILE_PATHS = ["src/", "assets/"];

const { values, positionals: _ } = parseArgs({
  args: Bun.argv,
  options: {
    watch: {
      type: "boolean",
    },
  },
  strict: true,
  allowPositionals: true,
});

async function compile() {
  await promises.rm(DISTRIBUTION_DIR, { recursive: true, force: true });

  const result = await Bun.build({
    entrypoints: [
      "./src/background/background.mts",
      "./src/options/options.html",
      "./src/offscreen/offscreen.html",
    ],
    naming: "[name].[ext]", // Keep all entrypoints at the root
    html: true,
    experimentalCss: true,
    outdir: DISTRIBUTION_DIR,
    sourcemap: "linked",
    target: "browser",
    minify: true,
  });

  if (!result.success) {
    console.error("Build failed");
    for (const message of result.logs) {
      console.error(message);
    }
  }

  await promises.cp("assets/", DISTRIBUTION_DIR, { recursive: true });
}

await compile();

if (values.watch) {
  const watcher = promises.watch(import.meta.dir, { recursive: true });

  process.on("SIGINT", () => {
    // close watcher when Ctrl-C is pressed
    console.log("Closing watcher...");
    process.exit(0);
  });

  for await (const event of watcher) {
    for (const prefix of WATCHED_FILE_PATHS) {
      if (event.filename?.startsWith(prefix)) {
        console.log(`${event.filename} changed`);
        await compile();
      }
    }
  }
}
