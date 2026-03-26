

## Fix Parameter Mismatches Between Voice Client Tools and Backend Webhook

The voice flow completion failures are caused by **parameter name mismatches** between the frontend `clientTools` (in `VoiceAgentContext.tsx`) and the backend `george-webhook` case handlers. When the ElevenLabs agent calls a tool, the frontend sends parameters with one naming convention, but the backend destructures with different names — so the values arrive as `undefined`, causing lookups to fail or data to be created incorrectly.

### Identified Mismatches

| Tool | Frontend sends | Backend expects |
|------|---------------|-----------------|
| `create_job` | `customer_name` | `client_name` |
| `create_quote` | `customer_name` | `client_name` |
| `create_invoice` | `customer_name` | `client_name` |
| `update_quote_status` | `display_number` | `quote_number` |
| `delete_quote` | `display_number` | `quote_number` |
| `update_invoice_status` | `display_number` | `invoice_number` |
| `delete_invoice` | `display_number` | `invoice_number` |
| `send_invoice_reminder` | `display_number` | `invoice_number` |
| `record_payment` | `display_number` | `invoice_number` |
| `log_expense` | `vendor` | `vendor_name` |

### The Fix

Update the **backend webhook** to accept both naming conventions. In each affected `case` block, destructure both the old and new parameter names and use a fallback pattern (e.g., `const name = client_name || customer_name`). This ensures compatibility with both the ElevenLabs agent tool definitions (which may use either convention) and the frontend client tools.

### Files to Change

| File | Change |
|------|--------|
| `supabase/functions/george-webhook/index.ts` | Add fallback destructuring for all 10 mismatched parameter names across affected case blocks |

### Also: Clean up Q-0NaN record

A migration to delete any corrupted `Q-0NaN` quote records that were created before the `getNextDisplayNumber` fix, preventing unique constraint violations.

| File | Change |
|------|--------|
| New migration | `DELETE FROM quotes WHERE display_number = 'Q-0NaN'` |

