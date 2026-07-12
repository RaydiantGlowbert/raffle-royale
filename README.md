# Raffle Royale - Pilot Mode

Raffle Royale is currently configured for pilot testing.
The app keeps the same participant flow while adding stronger local safeguards and richer admin exports for manual winner drawing.

## Pilot Mode on or off

Pilot Mode is controlled in one place:

- scripts/data.js
- Set PILOT_MODE to true for pilot testing
- Set PILOT_MODE to false to remove pilot labeling

Derived app mode value:

- APP_MODE is automatically set to pilot when PILOT_MODE is true

## What Pilot Mode adds

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
2. Enter participant name as First Name + Last Initial (example: Jamie T).
3. Allocate all 20 tickets across the five prize cards.
4. Review and submit.

## Participant IDs and duplicate prevention

Participant ID behavior:

- A participantId is generated per browser and stored in localStorage.
- It remains stable after refresh until browser reset is used.

Duplicate prevention behavior:

- Final submit button uses a submit lock to prevent rapid double-click duplicates.
- After success, browser stores submission-completed status.
- Returning to the site on the same browser shows the existing confirmation state.

Reset one browser for pilot testing:

- On the locked confirmation screen, click Reset This Browser for Testing.
- Two confirmation warnings are required.
- This clears only this browser's completion lock and rotates participant ID.
- It does not remove admin submission records.

## Open the admin dashboard

1. Click Admin Export from participant screens.
2. If session is missing or expired, enter the organizer code when prompted.
3. Organizer access is verified server-side and uses a signed httpOnly session cookie.

Dashboard includes:

- Pilot Mode status
- Total submissions
- Total tickets entered
- Total tickets by prize
- Participant count per prize
- Submission detail list with participant ID, submission ID, participant name, and submitted timestamp

Admin data source behavior:

- Shared Neon submissions are the default and authoritative source.
- If organizer session is missing/expired, admin retrieval returns 401 and requires sign-in again.
- If shared retrieval is unavailable, admin screen shows an error and offers Use Local Pilot Data for troubleshooting only.
- Local pilot data is browser-specific and may be incomplete.

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

## Clear all pilot data

Admin dashboard action: Clear All Pilot Data

Behavior:

- Requires two confirmations
- Deletes all locally stored pilot submissions and pilot logs for this browser
- Resets browser participant identity and completion lock

## Local storage details

Local storage keys used:

- raffleRoyaleSubmissions
- raffleRoyaleApiHealthLog
- raffleRoyaleParticipantId
- raffleRoyaleParticipantCompletion

## Limitations in pilot mode

- Data is local to one browser profile on one device
- Different devices do not automatically combine entries
- Clearing browser storage removes local data
- No centralized live dashboard across multiple devices yet

## Recommended next phase after successful pilot

Add a small backend submission API that keeps the same submitEntry contract and writes to a shared data store (for example Microsoft Lists) using server-side credentials only.
Do not put credentials in frontend JavaScript.

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
- RAFFLE_EVENT_ID: Event filter for shared admin retrieval (defaults to raffle-royale-2026)

Database variables remain required:

- DATABASE_URL (preferred) or POSTGRES_URL (fallback)

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
