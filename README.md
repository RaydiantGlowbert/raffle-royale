# Raffle Royale

Raffle Royale is live. Mentors enter their name, allocate 20 chips across active prize categories, and submit their entry for organizers to draw winners from.

## Pilot Mode on or off

Pilot Mode is controlled in one place:

- scripts/data.js
- Set PILOT_MODE to true for pilot testing
- Set PILOT_MODE to false for the live event (current setting)

Derived app mode value:

- APP_MODE is automatically set to pilot when PILOT_MODE is true, otherwise live

When PILOT_MODE is false, the pilot banner, "Pilot Testing Tools" panel, and "Reset This Browser for Testing" action are hidden so live participants cannot bypass the one-entry-per-browser lock. The admin "Clear All Pilot Data" action is relabeled "Clear All Local Data".

## What Pilot Mode adds (when enabled for testing)

- Visible Pilot Test label and test-only message in participant and admin screens
- Mode field saved with every submission
- Browser-level participant ID persistence
- Browser-level repeat-submission lock after successful submit
- Reset This Browser for Testing action with two-step confirmation
- Admin dashboard totals and participant/prize metrics
- Standard CSV and Ticket Pool CSV exports
- Strong two-step Clear All Pilot Data confirmation

## Run locally

1. Open index.html in a browser.
2. Enter participant name as First Name + Last Initial (example: Jamie T), or First Name + Last Name if you share initials with another participant (example: Jamie Torres).
3. Allocate all 20 tickets across the active prize cards.
4. Review and submit.

## Participant IDs and duplicate prevention

Participant ID behavior:

- A participantId is generated per browser and stored in localStorage.
- It remains stable after refresh until browser reset is used.

Duplicate prevention behavior:

- Final submit button uses a submit lock to prevent rapid double-click duplicates.
- After success, browser stores submission-completed status.
- Returning to the site on the same browser shows the existing confirmation state.

Reset one browser for pilot testing (only available when PILOT_MODE is true):

- On the locked confirmation screen, click Reset This Browser for Testing.
- Two confirmation warnings are required.
- This clears only this browser's completion lock and rotates participant ID.
- It does not remove admin submission records.

## Open the admin dashboard

1. Click Admin Export from participant screens.
2. If session is missing or expired, enter the organizer code when prompted.
3. Organizer access is verified server-side and uses a signed httpOnly session cookie.

Dashboard includes:

- Current app mode (pilot or live)
- Total submissions
- Total tickets entered
- Total tickets by prize
- Participant count per prize
- Submission detail list with participant ID, submission ID, participant name, and submitted timestamp

Admin data source behavior:

- Shared Neon submissions are the default and authoritative source.
- If organizer session is missing/expired, admin retrieval returns 401 and requires sign-in again.
- If shared retrieval is unavailable, admin screen shows an error and offers Use Local Data for troubleshooting only.
- Local data is browser-specific and may be incomplete.

## CSV exports

### Download Standard CSV

- One row per participant/prize combination where ticketsAllocated is greater than 0
- Includes mode, participantId, submissionId, submittedAt, participantName, firstName, lastInitial, prizeId, prizeName, ticketsAllocated

### Download Ticket Pool CSV

- Expands every allocated ticket to one row
- Columns:
  - ticketNumber
  - prizeId
  - prizeName
  - participantId
  - participantName
  - submissionId
  - submittedAt
- ticketNumber restarts at 1 for each prize
- Rows are ordered by prize and then ticket number

## Manual weighted winner drawing using Ticket Pool CSV

For each prize:

1. Filter Ticket Pool CSV to a single prizeId.
2. Count rows N for that prize.
3. Generate one random integer from 1 to N.
4. Select the row matching that ticketNumber.
5. That row's participant is the winner for that prize.

This gives each ticket equal chance and naturally weights participants by ticket count.

## Clear all local data

Admin dashboard action: Clear All Pilot Data (pilot mode) / Clear All Local Data (live mode)

Behavior:

- Requires two confirmations
- Deletes all locally stored submissions and logs for this browser (troubleshooting fallback only; does not touch the shared Neon database)
- Resets browser participant identity and completion lock

## Local storage details

Local storage keys used:

- raffleRoyaleSubmissions
- raffleRoyaleApiHealthLog
- raffleRoyaleParticipantId
- raffleRoyaleParticipantCompletion

## Limitations

- The "Use Local Data" admin fallback is local to one browser profile on one device and is for troubleshooting only
- Clearing browser storage removes that browser's local fallback data (not the shared Neon database)

## Phase 1 Database Setup (Neon + Vercel)

Phase 1 adds only infrastructure validation and does not change participant or admin behavior.

Files added in this phase:

- package.json
- api/db-health.js
- sql/001_create_submissions.sql

Manual setup required:

1. Provision Neon Postgres through the Vercel Marketplace and attach it to this project.
2. In Vercel project settings, verify a database connection variable exists.
3. Ensure DATABASE_URL is configured in the target environment (Production/Preview/Development).
4. Run sql/001_create_submissions.sql in Neon SQL Editor.

Health test endpoint:

- GET /api/db-health

Expected JSON response:

- ok
- database
- timestamp

The endpoint intentionally does not return connection details, usernames, hostnames, or environment values.

## Organizer environment variables (Vercel)

Add these in Vercel Project Settings -> Environment Variables:

- ORGANIZER_ACCESS_CODE: Organizer-only sign-in code checked by POST /api/admin/session
- ORGANIZER_SESSION_SECRET: Long random secret used to sign organizer session cookie
- ORGANIZER_SESSION_TTL_SECONDS: Optional session lifetime in seconds (default is 7200)
- RAFFLE_EVENT_ID: Event filter for shared admin retrieval (defaults to raffle-royale-2026, matching scripts/data.js SUBMISSION_CONFIG.eventId)
- RAFFLE_PRIZE_IDS: Optional comma-separated allow-list override for server validation. If omitted, server defaults to active final-pilot prizes:
  royal-flush-retreat,vegas-main-character,high-roller-time-bank,mentor-mvp-pack,double-down-development,brew-crew-casey,good-fortune-giveaway,wise-mentor-collection,casino-royale-collection,purr-fect-companion-pack,top-dog-pack,royal-ride-along

Database variables remain required:

- DATABASE_URL (preferred) or POSTGRES_URL (fallback)

## Additive normalized allocation migration (pilot-safe)

This migration adds normalized allocation storage without dropping legacy p1..p5 columns.

Files:

- sql/002_normalize_submission_allocations.sql
- sql/003_relax_legacy_p1_p5_constraints.sql

What migration 002 does:

- Creates submission_allocations
- Backfills non-zero legacy p1..p5 allocations into one row per submission/prize
- Uses ON CONFLICT so the backfill can be rerun safely
- Keeps legacy columns unchanged for staged cutover safety

Run order:

1. Ensure 001 schema already exists.
2. Run 002 migration in Neon SQL Editor.
3. Verify backfill with the verification queries included in 002.
4. Run 003 migration in Neon SQL Editor to drop only legacy constraints that block final-pilot prize IDs:
  - submissions_allocations_sum_check
  - submissions_total_matches_allocations_check
5. Deploy API changes that write/read normalized allocations.

Verification checklist after 002:

1. Expected non-zero legacy allocation count equals submission_allocations row count.
2. Per-submission legacy total equals normalized total.
3. Sample rows exist in submission_allocations for recent submissions.

Rollback guidance for additive stage:

1. If new API behavior fails, redeploy the previous API build.
2. Keep legacy columns in place during rollback.
3. submission_allocations can remain populated; no data deletion is required for rollback.
4. Rerun 002 safely after fixes if needed.

## Final-prize pilot activation checklist

1. In Neon SQL Editor, run sql/003_relax_legacy_p1_p5_constraints.sql.
2. RAFFLE_EVENT_ID is optional; only set it if scripts/data.js SUBMISSION_CONFIG.eventId changes from the raffle-royale-2026 default.
3. Set RAFFLE_PRIZE_IDS to the active final-pilot IDs (comma-separated):
  royal-flush-retreat,vegas-main-character,high-roller-time-bank,mentor-mvp-pack,double-down-development,brew-crew-casey,good-fortune-giveaway,wise-mentor-collection,casino-royale-collection,purr-fect-companion-pack,top-dog-pack
4. Confirm presidents-pick is intentionally excluded from RAFFLE_PRIZE_IDS during pilot.
5. Redeploy and verify participant submission + admin retrieval + both CSV exports.

## Organizer retrieval testing notes

1. Deploy with organizer environment variables configured.
2. Open app and click Admin Export.
3. Enter organizer code and confirm shared submissions load.
4. Confirm CSV exports still generate expected Standard CSV and Ticket Pool CSV formats.
5. Delete organizer session by clicking Logout and confirm sign-in is required again.
6. Temporarily break organizer API or DB config and confirm admin screen shows shared retrieval error.
7. Confirm Use Local Pilot Data appears only as troubleshooting mode and warning text indicates local data may be incomplete.
8. Confirm Return to Shared Data reloads shared submissions.

## Pilot Test Checklist (Nontechnical)

1. Confirm Pilot Test label appears on participant and admin screens.
2. Submit one entry and confirm success shows participant ID, submission ID, and time.
3. Refresh page on same browser and confirm repeat submission is blocked.
4. Use Reset This Browser for Testing and confirm a new test entry can be submitted.
5. Submit entries from several testers and verify admin totals increase correctly.
6. Download Standard CSV and confirm rows match each participant/prize allocation with tickets greater than 0.
7. Download Ticket Pool CSV and confirm total rows match total tickets entered.
8. For each prize, confirm ticket numbering starts at 1.
9. Confirm Clear All Pilot Data requires two confirmations.
10. After clear, verify submissions and ticket totals return to zero.
