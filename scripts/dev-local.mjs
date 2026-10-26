// One command to run the portal locally against a throwaway Postgres in Docker,
// separate from the live database in .env:   npm run dev:local
//
// - starts (or reuses) a Postgres container "did-local-pg" on port 54330
// - applies the migrations and seeds states, area codes and the admin user
// - adds a test call center with a known API key, a whitelisted local IP and some DIDs
// - runs `next dev` on http://localhost:3100 with its own build folder (.next-local),
//   so it can run next to your normal dev server on :3000
import { spawn, spawnSync } from "node:child_process";

const CONTAINER = "did-local-pg";
const PG_PORT = 54330;
const APP_PORT = 3100;
const DB_URL = `postgresql://postgres:postgres@localhost:${PG_PORT}/localpresence?schema=callcenter`;

export const TEST_KEY = "lpd_localtest_key_0123456789";

const env = {
  ...process.env,
  DATABASE_URL: DB_URL,
  DIRECT_URL: DB_URL,
  JWT_SECRET: "local-test-secret-local-test-secret-0123456789",
  NEXT_DIST_DIR: ".next-local",
  // Local requests carry no proxy headers; pretend they come from this whitelisted address.
  DEV_CLIENT_IP: "127.0.0.1",
};

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { encoding: "utf8", shell: process.platform === "win32", env, ...opts });
}

function fail(msg) {
  console.error(`\n${msg}\n`);
  process.exit(1);
}

// 1. Docker + Postgres
if (run("docker", ["info", "--format", "{{.ServerVersion}}"]).status !== 0) {
  fail("Docker is not running. Start Docker Desktop, then run this again.");
}
const exists = run("docker", ["ps", "-a", "--filter", `name=^${CONTAINER}$`, "--format", "{{.Names}}"]).stdout.trim();
if (!exists) {
  console.log(`Creating Postgres container ${CONTAINER} on port ${PG_PORT}...`);
  const r = run("docker", [
    "run", "-d", "--name", CONTAINER, "-p", `${PG_PORT}:5432`,
    "-e", "POSTGRES_PASSWORD=postgres", "-e", "POSTGRES_DB=localpresence",
    "-v", "did_local_pgdata:/var/lib/postgresql/data", "postgres:16-alpine",
  ]);
  if (r.status !== 0) fail(`Could not start Postgres:\n${r.stderr}`);
} else if (!run("docker", ["ps", "--filter", `name=^${CONTAINER}$`, "--format", "{{.Names}}"]).stdout.trim()) {
  run("docker", ["start", CONTAINER]);
}
let ready = false;
for (let i = 0; i < 40 && !ready; i++) {
  ready = run("docker", ["exec", CONTAINER, "pg_isready", "-U", "postgres", "-d", "localpresence"]).status === 0;
  if (!ready) spawnSync(process.execPath, ["-e", "setTimeout(()=>{},1000)"]);
}
if (!ready) fail("Postgres did not become ready.");

// 2. Schema + seed
console.log("Applying migrations...");
let r = run("npx", ["prisma", "migrate", "deploy"], { stdio: "inherit" });
if (r.status !== 0) fail("Migrations failed.");
console.log("Seeding states, area codes and admin user...");
r = run("npx", ["prisma", "db", "seed"], { stdio: "inherit" });
if (r.status !== 0) fail("Seed failed.");

// 3. Test call center, whitelisted IP and DIDs (safe to re-run)
const sql = `
SET search_path = callcenter;
INSERT INTO users (name, email, password, dial_prefix)
  VALUES ('Local Test', 'local@test.dev', 'x', '7084') ON CONFLICT (email) DO NOTHING;
INSERT INTO api_keys (user_id, key, status)
  SELECT id, '${TEST_KEY}', 'active' FROM users WHERE email = 'local@test.dev'
  ON CONFLICT (key) DO NOTHING;
INSERT INTO allowed_ips (user_id, ip, label)
  SELECT id, '127.0.0.1', 'Local dev' FROM users WHERE email = 'local@test.dev'
  ON CONFLICT (user_id, ip) DO NOTHING;
INSERT INTO dids (number, area_code, state_id)
  SELECT p.ac || lpad(g::text, 7, '5'), p.ac, (SELECT id FROM states WHERE code = p.st)
  FROM (VALUES ('212','NY',20), ('305','FL',10), ('904','FL',10), ('415','CA',5)) AS p(ac, st, n),
       LATERAL generate_series(1, p.n) g
  ON CONFLICT (number) DO NOTHING;
`;
r = run("docker", ["exec", "-i", CONTAINER, "psql", "-U", "postgres", "-d", "localpresence", "-q", "-v", "ON_ERROR_STOP=1"], { input: sql });
if (r.status !== 0) fail(`Could not add test data:\n${r.stderr}`);

console.log(`
Local portal ready -> http://localhost:${APP_PORT}
  Admin login:   admin@callcenter.com / Admin@123   (local database only)
  Test key:      ${TEST_KEY}   (call center "Local Test", prefix 7084, IP 127.0.0.1)
  Try it:        curl "http://localhost:${APP_PORT}/api/v1/did?apikey=${TEST_KEY}&number=70842125550000&callerId=5551111"
  Simulate:      npm run simulate
`);

// 4. App
const child = spawn("npx", ["next", "dev", "-p", String(APP_PORT)], {
  stdio: "inherit",
  env,
  shell: process.platform === "win32",
});
child.on("exit", (code) => process.exit(code ?? 0));
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
