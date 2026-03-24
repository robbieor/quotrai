
Fix preview email reliability and remove the misleading UX around it.

What I found
- The latest preview email was not blocked by the email system. It was queued and later marked sent in the backend log for `robbieorourke@gmail.com`.
- The real runtime problem is separate: the preview function tries to upload the generated PDF to a storage bucket named `document-emails`, but that bucket does not exist. That is why the email falls back to “could not be attached”.
- The screenshot you uploaded confirms that at least one preview email did arrive, but without the PDF download link.
- So there are two different inconsistencies:
  1. delivery status messaging is too optimistic / unclear
  2. PDF-link generation is broken because storage is misconfigured

Plan
1. Stabilize the preview email backend
- Update `send-preview-email` so missing PDF storage does not look like a full success.
- Add explicit status handling:
  - `queued_with_pdf`
  - `queued_without_pdf`
  - `failed`
- Keep the hard safety rule: only send to the logged-in user email.

2. Fix the PDF storage path
- Compare `send-preview-email` with the existing document email flow and either:
  - create/use the correct storage bucket for preview PDFs, or
  - reuse the existing document storage pattern already expected elsewhere in the app.
- Ensure signed URL generation works before claiming the preview includes a downloadable PDF.

3. Make the UI truthful
- In `BrandingSettings.tsx`, stop showing a generic “Preview queued” success if the backend had to fall back.
- Show one of these outcomes clearly:
  - “Preview emailed to you with PDF link”
  - “Preview emailed to you, but PDF link could not be generated”
  - “Preview failed to send”
- Add a retry action and a short note that preview emails go only to the signed-in user.

4. Add delivery diagnostics
- Log whether the preview email was:
  - queued,
  - sent,
  - sent without PDF link,
  - dead-lettered.
- Include the message id in the internal audit metadata so support/debugging is straightforward.

5. Clean up related inconsistencies
- Review the older `send-document-email` function too, because it uses the same `document-emails` bucket pattern and may have the same hidden PDF-link failure.
- Align both flows so preview emails and customer document emails use the same reliable storage/email setup.

Files to update
- `supabase/functions/send-preview-email/index.ts`
- `src/components/settings/BrandingSettings.tsx`
- likely `supabase/functions/send-document-email/index.ts` for consistency

Expected result
- Users will either receive a proper preview email with a working PDF link, or see an accurate partial-failure message instead of being told everything succeeded.
- The preview flow will no longer feel random or dishonest because the UI will match the real backend outcome.
