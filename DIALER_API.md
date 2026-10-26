# SYMBO DID Portal: Dialer API (Asterisk / Vicidial)

One request per call. The dial plan asks the portal for a caller ID, and the reply becomes `CALLERID(num)`.

```
GET /api/v1/did?apikey=KEY&number=<dialed number>&callerId=<current caller ID>
```

The reply is **only the DID, as 11 digits** (`1` + 10 digits, e.g. `19374760278`): plain text, no JSON, no newline.

## How a DID is chosen
1. The dialed number's area code is looked up (the `7084` prefix, if the call center has one, and a leading `1` are ignored).
2. A DID with the **same area code** is returned, e.g. dialing 937 gets a 937 number.
3. If there is none, a DID from the **same state** is returned.
4. Within that group the least-used DID goes first, so numbers rotate.

A DID is not reserved: it can be on several calls at once, and nothing needs to be released when the call ends.

If the portal can't serve the request (bad key, IP not whitelisted, unknown area code, no DID for that state, server error), the reply is the `callerId` the dialer sent, so the call still goes out. The reason shows in the call center's **Recent dialer API requests** table.

## Access
- Each call center has an **API key** and a list of **whitelisted dialer IPs**. A request must have the key and come from one of those IPs.
- Use `https://`. Hosts such as Vercel redirect `http://`, and Asterisk's `CURL()` does not follow redirects.

## Dial plan
The call center page shows a ready-made copy with the active key and this site's address. With the `7084` prefix:

```
exten => _7084X.,1,AGI(agi://127.0.0.1:4577/call_log)
exten => _7084X.,n,Set(RESPONSECALLERID=${CURL(https://PORTAL_HOST/api/v1/did?apikey=KEY&number=${EXTEN:4}&callerId=${CALLERID(num)})})
exten => _7084X.,n,Set(CALLERID(num)=${RESPONSECALLERID})
exten => _7084X.,n,Dial(SIP/${EXTEN:4}@SIPTRUNK,,To)
exten => _7084X.,n,Hangup()
```

`number=${EXTEN}` (prefix still attached) works too if the prefix is saved on the call center. Without a prefix, use `_X.` and `${EXTEN}`.

## Server settings
- `DID_OUTPUT_PREFIX`: default `1` (11 digits). Set it to an empty value for 10 digits, or `+1` for E.164.
- `CLIENT_IP_HEADER`: header carrying the client IP. Default `X-Real-IP`, then the rightmost `X-Forwarded-For` entry. The app must sit behind a proxy that sets it.
- `REQUEST_LOG_RETENTION_DAYS`: how long request logs are kept (default 30).

## Testing locally
```
npm run dev:local     # throwaway Postgres in Docker + the portal on http://localhost:3100
npm run simulate      # pretends to be a dialer and checks the answers
```
