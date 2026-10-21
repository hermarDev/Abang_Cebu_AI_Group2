# SCRUM-164 browser compatibility matrix

Scope: commit `2b29eca0a9b30bfa9376c61195d168c962cf3f23` from the DEV-4 worktree, served from an isolated archive. Local browser evidence only; no staging or physical-device validation.

| Browser/device | Viewport | Map | Auth/search | Result |
|---|---:|---|---|---|
| Chromium (Browser Use) | 1280×577 | Map rendered; Locate me / Metro Cebu buttons; no horizontal overflow | Root page exposes no inputs/search. `/login`, `/register`, `/search` returned 404 | Partial smoke; user journeys NOT RUN |
| Chromium mobile emulation | — | NOT RUN | NOT RUN | NOT RUN |
| Firefox | — | NOT RUN | NOT RUN | NOT RUN |
| Safari / iOS | — | NOT RUN | NOT RUN | NOT RUN |
| Edge | — | NOT RUN | NOT RUN | NOT RUN |
| Physical Android/iOS | — | NOT RUN | NOT RUN | NOT RUN |

## Run evidence

- Preview URL: `http://127.0.0.1:3324/`; working directory checked out from exact commit above.
- Chromium title `AbangCebuAI`; visible controls `Locate me` and `Metro Cebu`; `document.documentElement.scrollWidth` = 1280 at viewport width 1280.
- Clicking `Locate me` produced the visible fallback `Location permission was denied. The map remains centered on Metro Cebu.`
- Routes `/login`, `/register`, `/search` rendered the app's 404 page.
- Source inspection: `src/app/page.tsx` only renders `MapCanvasLoader`; `src/components/map/MapCanvas.tsx` has map and geolocation controls, not search/listing behavior.

This does not meet the complete SCRUM-164 browser/device/auth usability matrix. No defects are attributed to browsers that were not run.
