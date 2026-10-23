# Home Controls and Data Audit

Scope: home dashboard, home discovery dialog, and their navigation/data bindings. Changes are under minizalo only. No production business records, admin code or payment integration were changed.

## Corrected Issues

- Global loading ended after services and metadata while branches and courses were still pending. Home could display unknown counts as zero and enable refresh/discovery too early. Loading now completes after the public catalog reads finish; incomplete counts remain hidden and dependent controls stay disabled.
- Home carousel continued behind search and several other overlays, and while a finger was held on the banner. It now pauses in those states. A horizontal swipe consumes the following synthetic click instead of accidentally opening a service.
- The upcoming appointment card opened the generic list. It now opens the exact booking. Home time labels omit database seconds, and a clock/focus refresh removes appointments whose start time has passed.
- Discovery service search did not normalize Vietnamese accents. It now uses the same canonical text normalizer as other catalog searches. Category, sort and city controls have explicit accessible labels.
- The guest avatar opened an empty account profile. It now requests login while retaining the home screen. Notification and booking guest actions were also rechecked for this fallback.
- The fixed-height banner clipped its image/title on short landscape viewports. Short screens now use a scrollable natural-height home section with a stable image size. Home typography uses the platform sans-serif stack consistently.
- An all-inactive FAQ list could leave an empty section heading. The section now depends on the filtered active entries.

## Controls Checked

| Area | Verified behavior |
| --- | --- |
| Avatar | Opens the actual profile; guest gets login and can dismiss back to home |
| Greeting | Uses the API customer name; guest greeting does not invent one |
| Branch selector | Changes the branch details, phone, directions and booking selection; survives refresh |
| Search icon and field | Both open global search and return to home |
| Notification bell | Opens inbox for members and login for guests |
| Hero photo | Opens the matching service detail |
| Hero dots and touch | Select/change the actual service; no timer change during a held touch; swipe does not click through |
| Book now | Opens the current service with the branch selected on home |
| Upcoming appointment | Opens the exact booking and hides after its start time passes |
| Quick actions | Appointments, academy, branches and specialists open their intended views |
| Service/course previews | Detail buttons and view-all commands open the intended entity/list |
| Selected branch | Details, telephone URI and map destination match its API record |
| Counts | Show actual completed API counts; do not invent zeroes during incomplete loads |
| FAQs | Native disclosure opens the persisted answer; missing lists stay blank |
| Discovery service filters | Vietnamese search, category inclusion/exclusion, name/price/duration sorting |
| Discovery city filter | Excludes the branch from the other fixture city |
| Discovery entity buttons | Service details/booking, specialist, course, branch and directions all close the dialog and open the target |
| Discovery navigation | View-all, search, notifications and exact upcoming booking reach their target |
| Discovery close | Close button and native Escape dismiss the dialog |
| Refresh and retry | Backend price changes appear; failed reads remain errors and retry restores actual content |
| Empty catalog | Blank title/media, disabled booking/branch selector, no fabricated fallback records |

## Verification

Six browser suites completed during this audit: home controls, home loading/guest/empty states, booking/home, carousels/notifications, preload and navigation controls.

The dedicated home controls regression runs at 320x640, 390x844, 430x932, 844x390 touch landscape and 1366x900. Its fixture uses two service categories and two branch cities so filters must actually exclude nonmatching records. It checks persisted API prices, selected branch routing, exact booking details, touch/overlay pause, displayed images, overflow and offline retry. Discovery button paths receive additional coverage at 390x844.

The loading regression deliberately holds the branch response while other catalogs finish. It verifies hidden unknown counts, disabled dependent controls, guest login fallbacks without protected data reads, and blank content after real fixture records are deactivated.

Frontend TypeScript, production build and generated-asset verification passed. All write scenarios use disposable in-memory PostgreSQL fixtures. Screenshots are under ignored backend/.relay-local/home-controls-*.png; fixture names/photos are test-only.

## Deployed Public Data

A read-only check of the existing Render public API on 2026-10-23 returned 3 services, 3 branches, 2 courses and 4 FAQs. The check found no missing service IDs/names, nonnumeric service prices, invalid service durations, missing branch IDs/names/addresses, or missing course IDs/titles/nonnumeric tuition. This verifies the payload used by home, not whether every business record has been approved operationally.

The current source changes remain local until pushed/deployed. Browser checks do not replace acceptance testing inside the actual Zalo client on physical phones.
