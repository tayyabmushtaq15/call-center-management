// Pretends to be a dialer: for each call it asks the portal for a DID, "talks" for a random
// time, then releases it, the way the Asterisk dial plan does. Prints what happened.
//
//   npm run simulate
//   npm run simulate -- --calls 200 --concurrency 40 --hold 800
//   npm run simulate -- --base https://did-portal.vercel.app --key lpd_... --prefix 7084
//
// Options (all optional):
//   --base         portal address                    (default http://localhost:3100)
//   --key          API key                           (default: the local test key)
//   --prefix       dial prefix put before the number (default 7084; use "" for none)
//   --codes        area codes to dial, comma list    (default 212,305,904,415)
//   --calls        total calls                       (default 60)
//   --concurrency  calls in flight at once           (default 15)
//   --hold         max call length in ms             (default 400)
//   --no-release   never send the release (shows the lease/fallback behaviour)
//   --ip           send this as X-Real-IP (only for a server behind a proxy you control)

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : def;
};
const base = opt("base", "http://localhost:3100").replace(/\/$/, "");
const key = opt("key", "lpd_localtest_key_0123456789");
const prefix = opt("prefix", "7084");
const codes = opt("codes", "212,305,904,415").split(",").map((c) => c.trim()).filter(Boolean);
const calls = Number(opt("calls", 60));
const concurrency = Number(opt("concurrency", 15));
const hold = Number(opt("hold", 400));
const noRelease = args.includes("--no-release");
const ip = opt("ip", "");

const headers = ip ? { "x-real-ip": ip } : {};
const held = new Map(); // DID -> call number currently holding it
const stats = { handedOut: 0, fallback: 0, duplicates: 0, releases: 0, errors: 0 };
const byDid = new Map();
const latencies = [];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randDigits = (n) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("");

async function oneCall(n) {
  const dialed = `${pick(codes)}${randDigits(7)}`;
  const agentCid = `10${String(n % 90 + 10)}`;
  const url = `${base}/api/v1/did?apikey=${encodeURIComponent(key)}&number=${prefix}${dialed}&callerId=${agentCid}`;
  const t0 = Date.now();
  let body;
  try {
    const res = await fetch(url, { headers });
    body = (await res.text()).trim();
  } catch (e) {
    stats.errors++;
    return;
  }
  latencies.push(Date.now() - t0);
  if (body === agentCid || !/^\+?\d{10,}$/.test(body)) {
    stats.fallback++;
    return;
  }
  stats.handedOut++;
  byDid.set(body, (byDid.get(body) ?? 0) + 1);
  if (held.has(body)) stats.duplicates++;
  held.set(body, n);
  await new Promise((r) => setTimeout(r, Math.random() * hold));
  held.delete(body);
  if (noRelease) return;
  try {
    const rel = await fetch(
      `${base}/api/v1/did/release?apikey=${encodeURIComponent(key)}&did=${body}&duration=${Math.round(hold / 1000)}`,
      { headers }
    );
    if (rel.ok) stats.releases++;
    else stats.errors++;
  } catch {
    stats.errors++;
  }
}

let next = 0;
const t0 = Date.now();
await Promise.all(
  Array.from({ length: concurrency }, async () => {
    while (next < calls) await oneCall(next++);
  })
);
const secs = (Date.now() - t0) / 1000;
latencies.sort((a, b) => a - b);
const p = (q) => latencies[Math.floor(q * (latencies.length - 1))] ?? 0;

console.log(`
Simulated ${calls} calls, ${concurrency} at a time, against ${base}  (${secs.toFixed(1)}s)
  DIDs handed out:        ${stats.handedOut}
  Fallback (own caller ID): ${stats.fallback}   <- no free DID for that state, wrong key/IP, etc.
  Releases sent OK:       ${stats.releases}${noRelease ? "   (release disabled)" : ""}
  DUPLICATE allocations:  ${stats.duplicates}   <- must be 0
  Errors:                 ${stats.errors}
  Latency:                p50 ${p(0.5)} ms, p95 ${p(0.95)} ms, max ${latencies.at(-1) ?? 0} ms
  Distinct DIDs used:     ${byDid.size}
`);
process.exit(stats.duplicates > 0 || stats.errors > 0 ? 1 : 0);
