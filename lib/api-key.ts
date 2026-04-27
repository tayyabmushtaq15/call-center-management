import { randomBytes } from "crypto";

export function generateApiKey() {
  return `lpd_${randomBytes(24).toString("base64url")}`;
}
