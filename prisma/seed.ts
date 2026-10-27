/**
 * Seeds: the 50 US states, area codes from libphonenumber geocoding dump,
 * default Super Admin (change password in production), and default system settings.
 * Does NOT seed DIDs.
 */
import { readFileSync } from "fs";
import { join } from "path";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

/** The 50 states. District of Columbia and Puerto Rico are not served. */
const US_STATES: { code: string; name: string }[] = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
];

const ALLOWED_STATE_CODES = new Set(US_STATES.map((s) => s.code));

function buildNameToCode(): Map<string, string> {
  const m = new Map<string, string>();
  for (const s of US_STATES) {
    m.set(s.name.toLowerCase(), s.code);
  }
  return m;
}

const NAME_TO_CODE = buildNameToCode();

function resolveStateCode(description: string): string | null {
  const d = description.trim();
  const suffix = d.match(/,\s*([A-Z]{2})\s*$/);
  if (suffix) {
    const code = suffix[1];
    if (ALLOWED_STATE_CODES.has(code)) return code;
    return null;
  }
  const fromName = NAME_TO_CODE.get(d.toLowerCase());
  if (fromName && ALLOWED_STATE_CODES.has(fromName)) return fromName;
  return null;
}

function parseAreaCodesFromGeocoding(): Map<string, string> {
  const npaToState = new Map<string, string>();
  const path = join(process.cwd(), "prisma", "seed", "geocoding-1.txt");
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    console.warn("Missing prisma/seed/geocoding-1.txt — skipping area code auto-import.");
    return npaToState;
  }
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.startsWith("#")) continue;
    const pipe = line.indexOf("|");
    if (pipe <= 0) continue;
    const key = line.slice(0, pipe);
    const desc = line.slice(pipe + 1);
    if (!key.startsWith("1") || key.length < 4) continue;
    const npa = key.slice(1, 4);
    if (!/^\d{3}$/.test(npa)) continue;
    const st = resolveStateCode(desc);
    if (!st) continue;
    if (!npaToState.has(npa)) npaToState.set(npa, st);
  }
  return npaToState;
}

async function main() {
  console.log("Seeding states…");
  for (const s of US_STATES) {
    await prisma.state.upsert({
      where: { code: s.code },
      create: { code: s.code, name: s.name, status: "active" },
      update: { name: s.name },
    });
  }

  // DC and PR used to be seeded. Remove them (and their area codes, which cascade) unless a DID still uses them.
  await prisma.state.deleteMany({ where: { code: { in: ["DC", "PR"] }, dids: { none: {} } } });

  const states = await prisma.state.findMany();
  const codeToId = new Map(states.map((st) => [st.code, st.id]));

  console.log("Seeding area codes from geocoding file…");
  const npaToState = parseAreaCodesFromGeocoding();
  const rows: { areaCode: string; stateId: number }[] = [];
  for (const [npa, code] of npaToState) {
    const stateId = codeToId.get(code);
    if (!stateId) continue;
    rows.push({ areaCode: npa, stateId });
  }
  rows.sort((a, b) => a.areaCode.localeCompare(b.areaCode));
  // Clear existing map for idempotent re-seed
  await prisma.areaCodeMap.deleteMany();
  const batch = 500;
  for (let i = 0; i < rows.length; i += batch) {
    await prisma.areaCodeMap.createMany({ data: rows.slice(i, i + batch) });
  }
  console.log(`Inserted ${rows.length} area code rows.`);

  const hash = await bcrypt.hash("Admin@123", 12);
  await prisma.adminUser.upsert({
    where: { email: "admin@callcenter.com" },
    create: {
      email: "admin@callcenter.com",
      password: hash,
      name: "Super Admin",
    },
    update: { password: hash },
  });
  console.log("Super Admin upserted (admin@callcenter.com).");

  await prisma.systemSettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      systemName: "SYMBO DID Portal",
      lowPoolWarningThreshold: 5,
      apiRateLimitPerMinute: 6000,
    },
    update: {},
  });
  console.log("System settings OK.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
