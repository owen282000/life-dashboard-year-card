// Serves the repository over a throwaway local port and drives headless Chrome:
// runs the in-browser checks, then writes screenshots. Usage: node test/render.mjs <outdir>
import { execFile } from "node:child_process";
import { createReadStream, existsSync, mkdirSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(process.argv[2] || join(root, "test/out"));
const chrome =
  process.env.CHROME_BIN || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
mkdirSync(outDir, { recursive: true });

const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png" };
const server = createServer((request, response) => {
  const path = normalize(decodeURIComponent(new URL(request.url, "http://x").pathname)).replace(/^\/+/, "");
  const file = join(root, path);
  if (!file.startsWith(root) || !existsSync(file)) {
    response.writeHead(404);
    response.end();
    return;
  }
  response.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream" });
  createReadStream(file).pipe(response);
});

await new Promise((done) => server.listen(0, "127.0.0.1", done));
const base = `http://127.0.0.1:${server.address().port}/test/harness.html`;

const shots = [
  ["gallery-light", "?theme=light", 1100, 3400],
  ["gallery-dark", "?theme=dark", 1100, 3400],
  ["gallery-ha-dark", "?theme=ha-dark", 1100, 3400],
  ["wide-steps-dark", "?theme=dark&one=app&width=1000&period=rolling&hover=258", 1048, 400],
  ["wide-steps-light", "?theme=light&one=app&width=1000&period=rolling&hover=258", 1048, 400],
  ["wide-sleep-dark", "?theme=dark&one=app&width=1000&tab=1", 1048, 400],
  ["wide-screen-time-light", "?theme=light&one=app&width=1000&tab=2", 1048, 430],
  ["wide-workouts-dark", "?theme=dark&one=app&width=1000&tab=3", 1048, 400],
  ["rows-dark", "?theme=dark&one=rows&width=1000&period=rolling", 1048, 900],
  ["rows-light", "?theme=light&one=rows&width=1000&period=rolling", 1048, 900],
  ["plain-dark", "?theme=dark&one=plain&width=700&period=rolling", 748, 360],
  ["plain-light", "?theme=light&one=plain&width=700&period=rolling", 748, 360],
  ["section-500-dark", "?theme=dark&one=app&width=500", 548, 360],
  ["phone-dark", "?theme=dark&one=app&width=360&hover=300", 400, 400],
  ["phone-light", "?theme=light&one=app&width=360", 400, 400],
  ["dutch-dark", "?theme=dark&one=app&width=1000&lang=nl", 1048, 400],
  ["arabic-rtl", "?theme=dark&one=app&width=700&lang=ar&dir=rtl", 748, 400],
  ["weight-light", "?theme=light&one=weight&width=700", 748, 360],
];

const flags = ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--virtual-time-budget=6000"];
let failed = 0;
try {
  for (const theme of ["light", "dark"]) {
    const { stdout } = await run(chrome, [...flags, "--dump-dom", `${base}?theme=${theme}&check=1`], {
      maxBuffer: 64 * 1024 * 1024,
    });
    const text = /<pre id="results">([\s\S]*?)<\/pre>/.exec(stdout)?.[1] ?? "NO RESULTS";
    const decoded = text.replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
    console.log(`--- browser checks, ${theme} theme ---`);
    console.log(decoded);
    failed += decoded === "NO RESULTS" ? 1 : (decoded.match(/^FAIL/gm) || []).length;
  }
  for (const [name, query, width, height] of shots) {
    const path = join(outDir, `${name}.png`);
    await run(chrome, [
      ...flags,
      "--force-device-scale-factor=2",
      `--screenshot=${path}`,
      `--window-size=${width},${height}`,
      `${base}${query}`,
    ]);
    console.log("wrote", path);
  }
} finally {
  server.close();
}
process.exit(failed ? 1 : 0);
