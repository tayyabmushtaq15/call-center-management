// Pretends to be a dialer: for each call it asks the portal for a DID, the way the Asterisk
// dial plan does, and checks the answer. Prints what happened.
//
//   npm run simulate
//   npm run simulate -- --calls 200 --concurrency 40
//   npm run simulate -- --base https://did-portal.vercel.app --key lpd_... --prefix 7084
//
// Options (all optional):
//   --base         portal address                    (default http://localhost:3100)
//   --key          API key                           (default: the local test key)
//   --prefix       dial prefix put before the number (default 7084; use "" for none)
//   --codes        area codes to dial, comma list    (default 212,305,904,415,937)
//   --calls        total calls                       (default 60)
//   --concurrency  calls in flight at once           (default 15)
//   --ip           send this as X-Real-IP (only for a server behind a proxy you control)

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : def;
};
const base = opt("base", "http://localhost:3100").replace(/\/$/, "");
const key = opt("key", "lpd_localtest_key_0123456789");
const prefix = opt("prefix", "7084");
const codes = opt("codes", "212,305,904,415,937").split(",").map((c) => c.trim()).filter(Boolean);
const calls = Number(opt("calls", 60));
const concurrency = Number(opt("concurrency", 15));
const ip = opt("ip", "");

const headers = ip ? { "x-real-ip": ip } : {};
const stats = { handedOut: 0, fallback: 0, sameAreaCode: 0, badFormat: 0, errors: 0 };
const latencies = [];
const perDid = new Map();

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randDigits = (n) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("");

async function oneCall(n) {
  // Vicidial dials prefix + 1 + 10 digits, e.g. 7084 1 9372058273
  const areaCode = pick(codes);
  const dialed = `1${areaCode}${randDigits(7)}`;
  const agentCid = `10${String((n % 90) + 10)}`;
  const url = `${base}/api/v1/did?apikey=${encodeURIComponent(key)}&number=${prefix}${dialed}&callerId=${agentCid}`;
  const t0 = Date.now();
  let body;
  try {
    body = (await (await fetch(url, { headers })).text()).trim();
  } catch {
    stats.errors++;
    return;
  }
  latencies.push(Date.now() - t0);
  if (body === agentCid) {
    stats.fallback++;
    return;
  }
  stats.handedOut++;
  if (!/^1\d{10}$/.test(body)) stats.badFormat++;
  if (body.slice(1, 4) === areaCode) stats.sameAreaCode++;
  perDid.set(body, (perDid.get(body) ?? 0) + 1);
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
const uses = [...perDid.values()];

console.log(`
Simulated ${calls} calls, ${concurrency} at a time, against ${base}  (${secs.toFixed(1)}s)
  DID returned:             ${stats.handedOut}
  Same area code as dialed: ${stats.sameAreaCode}   (the rest got a DID from the same state)
  Wrong format:             ${stats.badFormat}   <- every DID should be 1 + 10 digits; must be 0
  Fallback (own caller ID): ${stats.fallback}   <- unknown area code, wrong key/IP, no DID in that state
  Errors:                   ${stats.errors}
  Latency:                  p50 ${p(0.5)} ms, p95 ${p(0.95)} ms, max ${latencies.at(-1) ?? 0} ms
  Distinct DIDs used:       ${perDid.size}  (most used ${uses.length ? Math.max(...uses) : 0}x, least ${uses.length ? Math.min(...uses) : 0}x)
`);
process.exit(stats.badFormat > 0 || stats.errors > 0 ? 1 : 0);
