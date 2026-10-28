# EquipCommons

**A trusted platform for sharing underused labs, equipment and spaces between institutions.**

Built for the Code Conqueror India 2026 hackathon, problem statement: *Unlock Underused Equipment and Spaces*.

**Live demo:** [(https://equipcommons.vercel.app/)]
**Repository:** [https://github.com/adityarajio/equipcommons]

---

## The problem

Colleges and labs own expensive equipment (electron microscopes, CNC machines, cleanrooms, high-speed cameras) that sits idle for long stretches, while students and early-stage teams nearby can't afford access. An ordinary booking calendar doesn't solve this, because sharing institutional property also needs trust: who is qualified, who approved it, what condition it was in before and after, who pays for damage, and who gets a turn when demand is high.

EquipCommons covers the whole sharing lifecycle, not just the booking slot.

## The journey a judge can complete

| Step | What happens | Where |
|---|---|---|
| 1. List | A custodian lists a resource with specs, rules, required qualification, deposit and caps | **List Resource** button |
| 2. Discover | Search and filter by name, institution, category, or "my verified qualifications only" | **Catalog** |
| 3. Request | The user picks a time window, purpose and grant code. The system checks qualification, quota, deposit and schedule conflicts | Resource detail modal |
| 4. Verify | Eligibility, quota and conflict checks run automatically and explain the result | Booking request |
| 5. Review | The custodian sees the request with the requester's fairness score | **Lab Custodian** |
| 6. Decide | Approve, reject (with a reason) or waitlist. The user sees why | **Lab Custodian** and **Reservations** |
| 7. Check in | A digital checklist records the baseline condition with a photo and signature | **Reservations**, Check-In modal |
| 8. Return | The borrower submits a return checklist. The custodian inspects and certifies it before the deposit is released | Return modal, then Custodian view |
| 9. Incidents | Damage, delay or protocol issues are reported with a proposed deposit deduction, can be contested, and are resolved or escalated by a person | Incident modal |
| 10. History | Both parties can open a full timeline of the transaction | **Full timeline** on any booking |

## Features

**Access and eligibility**
- Resource listings with specs, location, usage rules, rates, deposit and availability
- Qualification matching, with optional supervised access for unqualified users
- Qualification verification queue for institution admins
- Role-based views for researchers, lab custodians and institution admins

**Fair allocation**
- Transparent fairness score (0 to 100) with a written explanation:
  - base 50
  - +15 for a sponsored grant, or +10 for a capstone project
  - +15 or +5 for low or moderate weekly usage
  - +5 for a clean return history
  - -25 per no-show and -10 per late return
- Weekly hour quotas, and consecutive-hour caps per tool
- Waitlists ranked by fairness score, with automatic promotion when a slot frees up
- 15-minute no-show release: an uncollected slot is cancelled and offered to the next person
- Security deposits held in escrow to discourage speculative block bookings
- An interactive simulator on the **Fair Access** page shows exactly how scores are calculated

**Trust, safety and accountability**
- Before-and-after condition reports with checklists, photos and signatures
- Two-step return: the borrower submits, then the custodian certifies
- Incident reports with severity, deposit deduction proposals, contest and escalation
- Overdue detection and notifications for approvals, rejections, promotions, incidents and deposit releases
- Human review on every access, safety and penalty decision. Automation only suggests, ranks or explains

**Auditable history**
- Every important action is recorded: listings, requests, approvals, rejections, cancellations, extensions, check-ins, returns, incidents and deposit settlements
- Entries are linked in a SHA-256 hash chain. The **Audit Trail** page can verify the chain and export it as JSON
- Per-booking timeline view for both parties

## Try it in 3 minutes

No login is needed. Use the **persona switcher** (top right) to act as different users. All data is fictional.

1. Open the app. The banner at the top walks through the six steps, or you can follow the steps below.
2. As **Dr. Elena Rostova** (researcher), open **Catalog**, choose the FE-SEM, and submit a booking request.
3. Switch to **Prof. Arthur Pendelton** (custodian), open **Lab Custodian**, and approve the request.
4. Switch back to Elena, open **Reservations**, and check in. Turn on **Demo: Check-in Bypass** in the top bar so the strict check-in window doesn't block you.
5. Return the equipment, then switch to the custodian to inspect and certify the return.
6. Report an incident on a booking to see the deposit and review flow.
7. Open **Audit Trail**, click **Verify Hash Chain**, and open any booking's timeline.

Use **Reset** in the top bar to restore the demo data at any time.

## Tech stack

- React and TypeScript, built with Vite
- Tailwind CSS
- lucide-react for icons
- `@noble/hashes` for SHA-256 digests
- State kept in React context and persisted to the browser's localStorage

## Run locally

```bash
npm install
npm run dev
```

Then open the URL that Vite prints. To make a production build, run `npm run build`.

## Project structure

```
src/
  context/AppContext.tsx     # state and all workflow logic (booking, approval, return, incidents)
  components/                # views and modals (Catalog, MyBookings, OwnerManagement, AuditLog, ...)
  utils/fairness.ts          # fairness score calculation
  utils/cryptoUtils.ts       # SHA-256 audit hashing and chain verification
  utils/dateUtils.ts         # local time helpers
  utils/imageUtils.ts        # image downscaling and safe localStorage writes
  data/seedData.ts           # fictional demo users, resources and bookings
  types/index.ts             # shared types
```

## Privacy, security and fairness

- All demo data is fictional. No real personal or institutional records are used.
- Photos are downscaled in the browser before they are stored.
- Fairness rules are deterministic and explained to the user, so every approval, rejection or waitlist outcome comes with a reason.
- Automated actions (ranking, no-show release) are logged, and custodians can review every decision.

## Known limitations

- **No backend.** Data is stored in the browser's localStorage, so it is per-device and per-browser. The persona switcher lets one person play every role. A production version would use a database with real authentication and row-level permissions.
- **No real sign-in.** Personas stand in for verified accounts.
- **The audit chain is tamper-evident, not tamper-proof.** Because storage is local, someone with browser access could rewrite the log and recompute it. A server-side append-only store would fix this.
- **Grant codes are self-declared** in the demo and are not verified against a funder.
- **Notifications are in-app only.** There is no email or push delivery.
- **No payments.** Deposits and rates are tracked, but no money moves.

## Future development

Backend with real auth and per-institution permissions, email and SMS notifications, calendar sync, grant-code verification, an AI assistant to summarise incident reports and flag unusual usage patterns (always as a suggestion for a human reviewer), and multi-campus administration.

## Disclosures

- **Libraries and frameworks:** React, Vite, Tailwind CSS, lucide-react, @noble/hashes.
- **AI tools used:** [list any AI tools you used to write code, and how much]
- **Templates or pre-existing code:** [state whether any were used]

## Team

- rajjeeaditya: solo, responsible for design, development, testing and documentation.
