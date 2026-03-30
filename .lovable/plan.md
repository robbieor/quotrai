

# Foreman AI Mobile & Desktop UX Overhaul

## Problems Identified

### 1. Quick Action Tiles Do Nothing (Critical Bug)
The tiles fire a `foremanai-quick-action` custom event with `autoSend: true`. The listener in `GeorgeMobileInput` catches this and calls `sendChatMessage()`. However, the flow has a **silent failure path**: if the user isn't fully authenticated or the edge