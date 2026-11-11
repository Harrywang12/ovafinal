# Learn infographic plan

## Audit and design rules

The Learn library has 49 lessons in 12 modules. Replace its existing diagram selector with a complete lesson-specific infographic registry. Existing diagrams incorrectly share illustrations across different rules, squeeze labels into fixed-height canvases, and draw an 18 × 9 m court with the net along its long axis. Module cards also lack inner padding and use an inset hover border.

Generate deterministic SVG assets before integrating them. Use the existing warm-white, charcoal, and OVA-red visual language, blue court surfaces, green for permitted actions, and red for faults. Keep captions and explanations in responsive HTML. Diagrams have a natural aspect ratio, generous label margins, accessible descriptions, and an enlargement control. Never substitute a generic court for an unmapped lesson.

Court geometry: full indoor court 18 × 9 m, net across the 9 m width, two 9 × 9 m halves, attack lines 3 m from the net. A half court facing the net has front positions **4–3–2**, back positions **5–6–1**. Rotate **1 → 6 → 5 → 4 → 3 → 2 → 1**. Opposing teams' positions rotate 180 degrees. Position markers represent rotational order, not fixed tactical roles or compulsory locations within the 3 m front zone.

Source baseline: the repository's Volleyball Canada 2025–2026 rulebook and existing OVA lessons. Check core court/position/net/sanction geometry against [FIVB rules, diagrams 1–4 and 9–12](https://www.fivb.com/wp-content/uploads/2025/01/FIVB-Volleyball_Rules2025_2028-EN-v05.pdf). OVA seasonal rules remain scoped to this curriculum; this task does not update the course to a different season. Scoresheet examples are labelled teaching extracts, not replicas of an official completed form.

## Per-module production list

| Module | Lesson | Infographic |
| --- | --- | --- |
| Facilities & Equipment | Playing Area | Proportional full court; 18 m length, 9 m width, 3 m attack-line offsets; correct opposing position numbers; free-zone callout |
| Facilities & Equipment | Zones & Areas | Full court with front/back, end-line service areas, scorer-side substitution zone and libero replacement zones |
| Facilities & Equipment | Net & Posts | Front elevation; net heights, 1 m depth, antenna extension and posts outside sidelines |
| Facilities & Equipment | Balls | Ball specification dial; circumference, weight and pressure |
| Participants | Teams | Uniform, captain stripe, contrasting libero and registered roster |
| Participants | Team Leaders | Distinct captain–referee and coach–lineup/request communication paths |
| Playing Format | Scoring System | Rally point decision flow; 25/15 point targets and two-point margin |
| Playing Format | Positions & Rotation | Square half court with 4–3–2 / 5–6–1 and clockwise arrows |
| Playing Format | Positional & Rotational Faults | Correct relative foot order versus overlap; wrong server distinguished from overlap |
| Playing Actions | States of Play | Boundary close-up with touching-line IN versus fully-outside OUT |
| Playing Actions | Playing the Ball | Numbered pass → set → attack path; indoor block excluded from three hits |
| Playing Actions | Ball at the Net | Net elevation with antennas; legal crossing and external/under-net spaces |
| Playing Actions | Player at the Net | Foot on centre line versus fully over; separate net-action contact reminder |
| Playing Actions | Service | Service-zone top view with end-line contact fault and eight-second sequence |
| Playing Actions | Attack Hit | Back-row takeoff behind attack line and legal forward landing; front-zone restriction |
| Playing Actions | Block | Block at net + three remaining indoor contacts; front-row eligibility |
| Interruptions & Delays | Regular Interruptions | Dead ball → request → authorization flow; timeout/substitution limits |
| Interruptions & Delays | Substitution Rules | Starter #7 ↔ substitute #12 with same-slot return; scorer-side entry zone |
| Interruptions & Delays | Game Delays | Yellow card at wrist → red card at wrist; team warning versus team penalty |
| Interruptions & Delays | Exceptional Interruptions & Intervals | Injury/interference replay; interval and deciding-set change milestones |
| The Libero Player | Complete Libero Rules | Back-row eligibility and bench-side replacement path; overhand front-zone set restriction |
| The Libero Player | Libero Re-designation | Unavailable libero → eligible off-court player → R2/scorer record |
| Participants’ Conduct | Requirements of Conduct | Player → game captain → referee clarification path |
| Participants’ Conduct | Misconduct & Sanctions | Yellow, red, joint red/yellow, separated red/yellow and corresponding consequences |
| Referees & Signals | Refereeing Corps | R1 and R2 opposite net posts; scorer behind R2; diagonal line judges |
| Referees & Signals | Scorers | Scorer versus assistant scorer duties linked to score/service/libero records |
| Referees & Signals | Line Judges | Drawn flag-down, flag-up, touched, waving and unable-to-judge signals |
| Referees & Signals | Official Hand Signals | Drawn common official gestures; each with untruncated action description and official reference |
| Scorekeeping | Before the Match | Annotated teaching extract: match identity, roster, captain and approvals |
| Scorekeeping | After the Toss | Teaching extract: team A/B, serve/receive and I–VI lineup |
| Scorekeeping | Recording Points & Service | Sequential point slashes, service tick and exit score example |
| Scorekeeping | The Deciding Set | Eight-point court-change marker; change box and 15-point target |
| Scorekeeping | Substitutions & Timeouts | Starter/substitute stack and score-at-request timeout boxes |
| Scorekeeping | Recording Sanctions | W/P/E/D teaching table with player/team, set and score fields |
| Scorekeeping | After the Match | Result totals → verification → signatures closeout flow |
| 4v4 Rallyball | Court & Equipment | Proportional 14 × 7 m court, 4 players per side and youth net-height callouts |
| 4v4 Rallyball | Teams & Formations | Diamond versus square half-court formations; front/back roles, not invented numbered positions |
| 4v4 Rallyball | The Tripleball System | Serve rally → receiving-team free ball → serving-team free ball; rotation after sequence |
| 4v4 Rallyball | Playing Regulations | Forearm serve reception versus overhand reception fault; tossed-ball re-toss distinction |
| 6v6 Rallyball | Court & Equipment | Full 18 × 9 m court, six players per side, youth net heights and no libero |
| 6v6 Rallyball | Tripleball & Service | Three-rally sequence plus designated-setter position and next-service handover |
| 6v6 Rallyball | Serving & Reception Rules | Correct six-player reception layout with setter identified separately from position numbers |
| 6v6 Rallyball | Free Ball & Tosser Guidelines | Underhand toss arc toward position 5 or 6; front row ready and consistent target |
| Beach Volleyball | Court & Equipment | Proportional 16 × 8 m sand court; net across width, no centre/attack lines |
| Beach Volleyball | Teams & Uniforms | Two players numbered 1 and 2; no substitutions; captain marked |
| Beach Volleyball | Scoring & Format | 21/21/15 targets and combined-score switches every 7/5 points |
| Beach Volleyball | Ball Handling & Playing Actions | Block = contact 1, two remaining contacts; open-hand tip fault |
| Beach Volleyball | Service & Attack | End-line service position; partner clear of sight line; free attacking positions |
| Beach Volleyball | Interruptions & Conduct | One timeout, no substitutions, 7/5 combined-score switches; misconduct card reference |

## Build and verification sequence

1. Save this plan, then author the complete registry and SVG generator.
2. Generate all 49 assets; check every lesson resolves to one existing, unique asset.
3. Integrate responsive figures, text captions and keyboard-accessible enlargement.
4. Repair card padding, equal-height layout, wrapping and hover/focus border placement.
5. Validate court measurements, position order, rotation paths and diagram coverage with targeted checks.
6. Render every infographic and review a contact sheet. Check actual Learn cards and lesson layouts at desktop, tablet and mobile sizes; verify no text clipping/overflow, image failures or console errors.
7. Run TypeScript, lint, the relevant tests, and a production build. Record any unrelated failures explicitly.

## Completed verification — 10 November 2026

- Generated and installed 49 SVG assets. Each lesson has an explicit title, description, caption and notes; there is no generic-diagram fallback.
- Reviewed contact sheets covering every asset. A browser bounding-box scan found zero overlapping text pairs and zero text labels outside the SVG canvas.
- Loaded every one of the 49 lesson tabs in the actual Learn routes using an isolated local authentication/progress fixture. All images decoded successfully; no browser page errors occurred. This did not exercise the live Supabase backend or write learner progress.
- Checked highlighted cards at widths 320, 390, 768, 1024 and 1440 px. Confirmed 20–24 px padding, content clear of the border, and no page-level horizontal overflow.
- Inspected desktop and mobile lesson figures. Verified opening the enlarged view, closing it with its button, and dismissing it with Escape. Mobile enlargement supports horizontal scrolling without overflowing the page.
- `npm test`: 17 files / 87 tests passed, including six new infographic coverage and court-geometry checks.
- `npm run lint`: passed. TypeScript validation: passed.
- Production build: compiled and generated all routes successfully with temporary test Supabase public variables. An ordinary build first exposed the workspace's empty `.env.local`; real Supabase configuration is still required to run the authenticated app. No environment file or authentication code was changed.

Regenerate assets after editing the registry or generator with `npm run learn:infographics`.
