# SYMBO DID Portal: Dialer API (Asterisk / Vicidial)

Two requests per call. One before the call asks the portal for a DID. One at hangup gives it back.

## 1. Get a DID (before dialing)

```
GET /api/v1/did?apikey=KEY&number=<dialed number>&callerId=<current caller ID>
```

The reply is **only the DID, 11 digits** (`1` + 10 digits, e.g. `19374760278`): plain text, no JSON, no newline. The dial plan puts it in `CALLERID(num)`.

How a DID is chosen:
1. The dialed number's area code is looked up (the call center's dial prefix, e.g. `7084`, and a leading `1` are ignored).
2. A **free** DID with the **same area code** is returned, e.g. dialing 937 gets a 937 number.
3. If none is free, a free DID from the **same state** is returned.
4. The least-used DID goes first, so numbers rotate.

**A DID is reserved for the call.** Nobody else gets it, from any call center, until it is freed. The reservation is atomic, so simultaneous calls can never receive the same DID.

If the portal can't serve the request (bad key, IP not whitelisted, call center inactive, unknown area code, **no free DID** for that area/state, server error), the reply is the `callerId` the dialer sent, so the call still goes out. The reason is in the call center's **Recent dialer API requests** table.

## 2. Free the DID (at hangup)

```
GET /api/v1/did/release?apikey=KEY&did=<the DID>&status=<DIALSTATUS>&duration=<seconds>
```

Reply: `OK`. Call it from the dial plan's existing `h` (hangup) extension. `h` runs however the call ends: hung up, busy, no answer, cancelled, congestion, failed. **The DID is freed whatever the status.** `status` (Asterisk `DIALSTATUS`: ANSWER, BUSY, NOANSWER, CANCEL, CONGESTION, CHANUNAVAIL, ...) and `duration` only describe how the call went, for the call log.

Only the call center that was given the DID can free it. Freeing twice, or an unknown DID, does nothing.

## 3. Safety net: automatic recovery

If the end of a call is never reported (the dialer crashed, the request was lost, the call was never completed), the reservation frees itself after the call center's **safety timeout** (set on its page, default 3600 s). Set it longer than your longest call. A DID is therefore never stuck for good.

## Dial plan

The call center page shows both parts ready to copy, with the active key and this site's address. With the `7084` prefix:

```
exten => _7084X.,1,AGI(agi://127.0.0.1:4577/call_log)
exten => _7084X.,n,Set(RESPONSECALLERID=${CURL(https://PORTAL_HOST/api/v1/did?apikey=KEY&number=${EXTEN:4}&callerId=${CALLERID(num)})})
exten => _7084X.,n,Set(CALLERID(num)=${RESPONSECALLERID})
exten => _7084X.,n,Dial(SIP/${EXTEN:4}@SIPTRUNK,,To)
exten => _7084X.,n,Hangup()
```

and one line added to the existing `h` extension, after its `call_log` line:

```
exten => h,n,Set(X=${CURL(https://PORTAL_HOST/api/v1/did/release?apikey=KEY&did=${CALLERID(num)}&status=${DIALSTATUS}&duration=${ANSWEREDTIME})})
```

Without a prefix, use `_X.` and `${EXTEN}`.

## Access
- Each call center has an **API key** and a list of **whitelisted dialer IPs**. A request must have the key and come from one of those IPs.
- Use `https://`. Hosts such as Vercel redirect `http://`, and Asterisk's `CURL()` does not follow redirects.

## How many DIDs are needed
Because a DID serves one call at a time, the pool must be larger than the number of simultaneous calls, with enough numbers in each area code you dial. When none is free, the dialer gets its own caller ID back. The dashboard shows how many DIDs are free and on a call, and warns when a state runs low.

## Server settings
- `DID_OUTPUT_PREFIX`: default `1` (11 digits). Set it to an empty value for 10 digits, or `+1` for E.164.
- `CLIENT_IP_HEADER`: header carrying the client IP. Default `X-Real-IP`, then the rightmost `X-Forwarded-For` entry. The app must sit behind a proxy that sets it.
- `REQUEST_LOG_RETENTION_DAYS`: how long request logs are kept (default 30).

## Testing locally
```
npm run dev:local     # throwaway Postgres in Docker + the portal on http://localhost:3100
npm run simulate      # a fake dialer: reserves and frees DIDs, checks none is ever on two calls
```
