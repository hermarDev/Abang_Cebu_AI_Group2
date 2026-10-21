# SCRUM-164 run results

Source: `2b29eca0a9b30bfa9376c61195d168c962cf3f23`; local DEV-4 preview `http://127.0.0.1:3324/`.

| Check | Result | Evidence |
|---|---|---|
| Chromium map at 1280×577 | PASS (smoke only) | Map rendered; controls measured 48.5px high; document width 1280, no horizontal overflow |
| Location denial fallback | PASS (manual) | Browser showed denial fallback, retained Metro Cebu center |
| Auth/search routes | FAIL / absent | `/login`, `/register`, `/search` returned 404 on isolated commit snapshot; root route has no search input |
| Mobile viewport | NOT RUN | Browser helper exposed no viewport emulation setting; physical device not available in this run |
| Firefox/Safari/Edge/physical devices | NOT RUN | No such runs |
| Auth-to-listing, input validation, listing detail | NOT RUN | No flow exercised; no staging used |
| Map regression suite | PASS | `node --test src/components/map/MapCanvas.test.cjs`: 5/5 |
| Landmark utility suite | NOT RUN | `pnpm exec vitest run src/lib/search/landmarks.test.ts` found no matching test file in this checkout |

Do not interpret this partial local smoke as completion of SCRUM-164.
