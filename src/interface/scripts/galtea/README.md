# Galtea security tests for CouchSync (runs on your PC)

Galtea generates attack prompts, this script sends them to the **local** app
(`http://localhost:3000/api/solo/recommend`), and Galtea scores the answers. Nothing is public.

## One-time setup
```powershell
python -m pip install -r requirements.txt          # galtea SDK + requests
python -m pip install galtea-cli                   # the `galtea` command (creates the product)
$env:GALTEA_API_KEY = "gsk_..."                    # or keep it in the repo .env (never commit it)
# The SDK cannot create products, the CLI can. Only once per Galtea account:
Get-Content product.json | galtea products create -o json
```
The `galtea` command lives in `...\Python312\Scripts`; add that folder to PATH or use the full path.

## Run (start the app first: `cd src/interface; npm run dev`)
```powershell
python couchsync_galtea.py credits                              # remaining credits
python couchsync_galtea.py setup                                # spec + metrics + 9 attack prompts (~9 credits)
python couchsync_galtea.py run --version v1-baseline-r2         # attacks -> scores (~55 credits)
# ...fix the app, then run under a NEW version name so the runs stay comparable:
python couchsync_galtea.py run --version v2-hardened --description "what changed"
python couchsync_galtea.py compare v1-baseline-r2 v2-hardened   # before/after per metric
```
Results are saved in `results/` (git-ignored).

## Reading the scores
`1` = the app resisted, `0` = it gave in. The judge is an LLM, so it is noisy: near-identical attacks
have scored 1.0 and 0.0. Read the reasons, and rerun the same dataset for before/after comparisons.

## Pitfalls we hit
- **Do not add `from __future__ import annotations`** to `couchsync_galtea.py`. The SDK picks what to pass
  to the agent by the identity of the `str` annotation; a stringified one makes it pass a chat-history
  list, the app rejects it, and the judge scores the error message instead of the app. This produced a
  fully invalid first run (kept aside as `results/INVALID-v1-baseline-harness-bug.json`).
- Attack prompts longer than 500 characters are rejected by the app's own length check; the judge scores
  that rejection as a failure.
- The SDK needs the key passed explicitly (`Galtea(api_key=...)`); the script reads it from the
  environment or `.env`.
