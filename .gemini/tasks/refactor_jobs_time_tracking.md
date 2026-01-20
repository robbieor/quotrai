# Implementation Plan - Refactor Jobs & Time Tracking

This plan outlines the steps to refactor the Jobs and Time Tracking functionality, ensuring alignment with the updated schema and improving the user experience for tradesmen.

## Status Summary

- [x] **Backend Schema Alignment**: Removed `job_sites` table, updated `jobs` table with `title`, `date`, `startTime`, and `estimatedDuration`.
- [x] **Job Management UI**: Updated `JobsPage.tsx` to handle the new schema, including client selection and address display.
- [x] **Time Tracking Page Overhaul**: Implemented a modern, real-time clock-in/out UI with GPS capture and break management.
- [ ] **Simplify Client Form**: Remove redundant fields (mobile/phone separation if needed, combine address lines) and ensure lat/lng are stored from Loqate lookups.
- [ ] **Remove "Job Sites" UI**: Scan for and remove any remaining UI elements or routes dedicated specifically to "Job Sites" management.
- [ ] **Update Time Entries Integration**: Ensure `time_entries` link correctly with the new `jobs` model in the frontend (e.g., when viewing history).
- [ ] **Verification & Testing**: Verify the full flow from client creation to job assignment and time tracking.

## Detailed Tasks

### 1. Simplify Client Form
- [ ] Modify `ClientsPage.tsx` to simplify the address input (use a single field for Google Places/Loqate results).
- [ ] Ensure `latitude` and `longitude` are correctly captured and saved during client creation/update.
- [ ] Remove any redundant contact fields as per user request.

### 2. Remove "Job Sites" UI
- [ ] Remove `JobSitesPage.tsx` if it exists.
- [ ] Remove "Job Sites" link from the sidebar (`Sidebar.tsx`).
- [ ] Remove any "Job Site" specific navigation in the app.

### 3. Update Time Entries Integration
- [ ] Update the `TimeEntries` list/history to show the Job Title instead of the old Job Site Name.
- [ ] Ensure manual time entry creation also links to the new `jobs` table.

### 4. Verification
- [ ] Run the dev server and verify:
    - [ ] Client creation with Loqate lookup works.
    - [ ] New Job modal correctly links to the client and shows their address.
    - [ ] Clock-in/out captures GPS and associates with the job.
