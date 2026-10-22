# SCRUM-164 browser rerun — 2026-10-22

Scope: reproducible local browser smoke against the clean `origin/main` source snapshot only. This is not a staging run and does not complete SCRUM-164 acceptance.

## Provenance

- Repository: `hermarDev/Abang_Cebu_AI_Group2`
- Source SHA: `be77fa4aedd8f352614c731de48f72288a603a75` (`origin/main` at run time)
- Local production preview: `http://127.0.0.1:3224`; Next.js 16.3.6, PID 750095, served from `/home/hrmr/Abang_Cebu_AI_Group2-S3-dev4`
- Browser: headless Chromium 145, Linux x86_64
- Viewports: 1280×577 desktop; 390×844 Chromium mobile emulation
- Build: `pnpm run build` passed on this source snapshot before preview. No staging environment was used.

## Executed checks

| Case | Result | Observation |
|---|---|---|
| Desktop root map, 1280×577 | PASS — smoke only | MapLibre canvas and Metro Cebu rendered; `Locate me` and `Metro Cebu` buttons visible; no form/input elements. |
| Mobile-emulated root, 390×844 | PASS — layout smoke only | Map rendered; document width 390px equals viewport width; buttons measured 111×49px and 121×49px. This is emulation, not physical-device validation. |
| `/login` | FAIL — route unavailable on this build | Next.js 404 page; zero inputs and forms. |
| `/register` | FAIL — route unavailable on this build | Next.js 404 page; zero inputs and forms. |
| `/search` | FAIL — route unavailable on this build | Next.js 404 page; zero inputs and forms. |
| Search/autosuggest, filters, results drawer, live listing cards/markers | NOT RUN | These controls/data flows are not present on the observed root page; do not substitute map rendering for acceptance. |
| Auth validation and auth-to-listing journey | NOT RUN | No auth forms are available on this source snapshot. |
| Firefox, Safari/iOS, Edge, physical Android/iOS, assistive technology | NOT RUN | No such executions were performed. |

## Reproduction

1. Build the checked-out source with `pnpm run build`.
2. Start with `pnpm run start --hostname 127.0.0.1 --port 3224`.
3. In Chromium, visit `/`, `/login`, `/register`, and `/search`; inspect rendered DOM and form counts.
4. At `/`, set Chromium device emulation to 390×844 and compare `document.documentElement.scrollWidth` with `document.documentElement.clientWidth`.

Observed result: `/` serves the map-only experience; the three tested named routes render 404. The current production build route table contains only `/` and `/_not-found`. Jira SCRUM-167 records that the team has not resolved whether the intended login route is `/login` or `/auth/login`; therefore this report records the exact observed routes without asserting an unresolved route-name decision.

## Remaining acceptance gates

SCRUM-164 remains incomplete. Required auth/search/listing flows, form validation and unexpected-input handling, desktop/mobile user journeys, Firefox, Safari/iOS, Edge, physical-device runs, accessibility/assistive-technology review, and a complete defect-linked matrix remain unverified. Local smoke results do not establish staging or production behavior. No defects are attributed to browsers or devices that were not tested.
