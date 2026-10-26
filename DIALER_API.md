# Dialer API (Asterisk / Vicidial)

Dial plans ask the portal which DID to show as caller ID. Every response is **bare text**: Asterisk's `CURL()` puts the body straight into a variable.

## Endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/v1/did?apikey=…&number=…&callerId=…` | Returns the DID digits for the dialed number's state. |
| `GET /api/v1/did/release?apikey=…&did=…[&status=answered\|not_answered][&duration=secs]` | Frees the DID when the call ends. Always returns `OK`. |

- `number`: dialed number (10 digits, or 11 starting with 1).
- `callerId`: the caller ID the dialer already has. It is returned unchanged whenever the portal cannot serve the request (bad key, IP not allowed, rate limit, unknown area code, no free DID, server error), so the call still goes out. The real reason is in the call center's "Recent dialer API requests" table.
- A request is accepted only if the source IP is on the call center's active allowed-IP list. A call center with no active IP is rejected.
- Every call center draws from the whole DID pool (no per-state assignment). A DID handed out is locked until `release` arrives or the call center's lease (default 180 s) runs out, whichever is first.

## Dial plan

```
exten => _7084X.,1,Set(RESPONSECALLERID=${CURL(http://PORTAL_HOST/api/v1/did?apikey=KEY&number=${EXTEN:4}&callerId=${CALLERID(num)})})
exten => _7084X.,n,Set(CALLERID(num)=${RESPONSECALLERID})
exten => _7084X.,n,Dial(SIP/${EXTEN:4}@SIPTRUNK,,To)
exten => _7084X.,n,Hangup()

exten => h,1,Set(X=${CURL(http://PORTAL_HOST/api/v1/did/release?apikey=KEY&did=${CALLERID(num)}&duration=${CDR(billsec)})})
```

If the `h` extension sits in the same context as the dial line, `${CALLERID(num)}` there is the DID that was set earlier.

## Configuration

- `DID_OUTPUT_PREFIX`: prepended to the returned DID (for example `1` or `+1`) if the trunk wants more than 10 digits. Default: none.
- `CLIENT_IP_HEADER`: header carrying the client IP. Default: `X-Real-IP`, then the **rightmost** `X-Forwarded-For` entry. The app must sit behind a reverse proxy that sets it, and the app port must not be reachable directly, otherwise the IP can be forged.

## Deploying the schema

`prisma/migrations/20261020000000_dialer_api` is additive only. Apply it with `npm run db:deploy` (never `db:migrate` against the shared Supabase database).

## Dial prefix (optional, per call center)

A call center can have a dial prefix (for example `7084`) that its dialer puts in front of the dialed number. Set it on the call center's page. The API accepts the number either way and strips the prefix when it is present:

```
exten => _7084X.,1,Set(RESPONSECALLERID=${CURL(https://PORTAL_HOST/api/v1/did?apikey=KEY&number=${EXTEN:4}&callerId=${CALLERID(num)})})
```

`number=${EXTEN}` (prefix still attached) works too. Leave the prefix empty for call centers that don't use one. The call center page shows a ready-made dial plan with the active key and this site's address.

## No release line

The `/release` call is optional. A dial plan with only the four lines above works: the DID is then freed when its lease (set per call center) runs out. For exact release at hangup without a dialplan line, the portal needs to listen to the dialer's call events (Asterisk AMI), which is not built yet.
