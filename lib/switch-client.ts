/**
 * Pluggable switch dispatch. Default: HTTP POST to the switch base URL.
 * Replace implementation later (AMI/ARI/ESL) without changing get-did core logic.
 */
export type OriginatePayload = {
  receiverNumber: string;
  did: string;
  callLogId: number;
  userId: number;
};

export type SwitchRecord = {
  switchUrl: string;
  switchPort: number;
  authToken: string;
};

function buildBaseUrl(record: SwitchRecord): URL {
  let raw = record.switchUrl.trim();
  if (!raw.startsWith("http://") && !raw.startsWith("https://")) {
    raw = `http://${raw}`;
  }
  const u = new URL(raw);
  if (record.switchPort) u.port = String(record.switchPort);
  return u;
}

const ORIGINATE_PATH =
  process.env.SWITCH_ORIGINATE_PATH ?? "/api/local-presence/originate";

export async function dispatchOriginate(
  sw: SwitchRecord,
  payload: OriginatePayload
): Promise<{ ok: boolean; status?: number; body?: string }> {
  if (process.env.SWITCH_STUB === "1") {
    if (process.env.SWITCH_CLIENT_DEBUG === "true") {
      console.info("[SwitchClient stub] dispatch", payload);
    }
    return { ok: true };
  }

  const base = buildBaseUrl(sw);
  const target = new URL(ORIGINATE_PATH, `${base.origin}/`);

  const res = await fetch(target.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sw.authToken}`,
    },
    body: JSON.stringify({
      receiver: payload.receiverNumber,
      did: payload.did,
      call_log_id: payload.callLogId,
      user_id: payload.userId,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    return { ok: false, status: res.status, body: text };
  }
  return { ok: true, status: res.status, body: text };
}
