

# How Text Requests Are Handled — No Internal Webhooks Needed

## Your Architecture Already Works

You do **not** need separate internal webhooks to mirror the ElevenLabs voice webhook. Here is how both paths currently work:

```text
┌─────────────────────────────────────────────────────┐
│                    USER INPUT                        │
├──────────────┬──────────────────────────────────────┤
│  VOICE       │  TEXT (typed or quick-action tile)    │
│              │                                      │
│  ElevenLabs  │  Frontend (useForemanChat)           │
│  Agent       │       │                              │
│     │        │       ▼                              │
│     ▼        │  george-chat (edge function)          │
│  george-     │       │                              │
│  webhook     │       ├─ Short-circuit? → webhook     │
│  (direct)    │       ├─ Slash command? → webhook     │
│              │       └─ AI reasoning → tool calls    │
│              │              │                        │
│              │              ▼                        │
│              │         george-webhook                │
│              │         (same function)               │
└──────────────┴──────────────────────────────────────┘
```

### Voice path
ElevenLabs agent detects intent → calls `george-webhook` directly with `{ function_name, parameters }`. No AI reasoning on your side — ElevenLabs handles that.

### Text path
`george-chat` receives the message → sends it to the Lovable AI gateway with OpenAI-format tool definitions (converted from the same `foreman-tool-definitions.ts`). When the AI returns tool calls, `george-chat` calls `george-webhook` internally with the exact same `{ function_name, parameters }` payload.

### Both paths hit the same backend
`george-webhook` is the single execution engine. It handles `create_quote`, `create_job`, `get_todays_jobs`, etc. — identical logic regardless of whether the request came from voice or text.

## What the tool definitions do

The 59 tool definitions in `_shared/foreman-tool-definitions.ts` serve dual purpose:
- **Voice**: Synced to ElevenLabs via `sync-agent-tools` edge function (PATCH to their agent API)
- **Text**: Converted to OpenAI function-calling format by `george-chat` line 25-38 and passed to the AI gateway

Both systems use the same schema. When either system returns a tool call, `george-webhook` executes it.

## The three text execution paths

| Path | Trigger | AI involved? | Latency |
|------|---------|-------------|---------|
| Direct webhook | Exact-match quick-action text (e.g. "What jobs do I have scheduled for today?") | No | ~200ms |
| Quick-action short-circuit | Guided prompts (e.g. "Help me create a new quote") | No | ~200ms |
| Full AI reasoning | Any freeform text | Yes (Gemini 3 Flash) | ~1-3s |

For the full AI path, the model returns tool calls in OpenAI format, `george-chat` parses them, and calls `george-webhook` — the same function voice uses.

## Confirmation gates

Write actions (`create_quote`, `create_invoice`, `create_job`, etc.) are **deferred** in the text path. `george-chat` does not execute the webhook immediately — it returns `pending_tool_calls` with a `confirmation_gate` to the frontend. The user confirms, then the frontend calls `george-webhook` directly.

Voice path: ElevenLabs handles confirmation via conversation flow, then calls `george-webhook` when the user says yes.

## Bottom line

**No additional webhooks needed.** The system is already unified:
- One tool definition source (`foreman-tool-definitions.ts`)
- One execution engine (`george-webhook`)
- Two entry points that both feed into it (`george-chat` for text, ElevenLabs for voice)

The architecture is correct. The issues you've been hitting are frontend rendering bugs (state wiping, missing response display), not missing backend infrastructure.

