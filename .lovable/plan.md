

## Replace tom-avatar.png with Lucide HardHat Icon (Emerald Green)

**Goal**: Replace every `tom-avatar.png` usage with a reusable `ForemanAvatar` component using the Lucide `HardHat` icon in **Emerald #059669** on a **dark navy #0F172A** circular background.

### Step 1 — Create `ForemanAvatar` component

New file: `src/components/shared/ForemanAvatar.tsx`

- Renders `HardHat` from `lucide-react` inside a dark circular container
- Size prop: `sm` (24-36px), `md` (48px), `lg` (80px), `xl` (128px)
- Icon: `#059669` emerald green
- Background: `#0F172A` dark navy, rounded-full

### Step 2 — Replace in 10 files

Remove `import tomAvatar` and swap `<img>` with `<ForemanAvatar />`:

| File | Size |
|------|------|
| `GeorgeMobileHeader.tsx` | sm |
| `GeorgeMessageList.tsx` | sm |
| `GeorgeWelcome.tsx` | md, lg |
| `MorningBriefingCard.tsx` | md |
| `ControlHeader.tsx` | sm |
| `ForemanAISection.tsx` | sm |
| `HeroSection.tsx` | sm |
| `ActiveCallBar.tsx` | sm |
| `LiveActionFeed.tsx` | sm |
| `TradeLanding.tsx` | xl |

### Step 3 — Delete old assets

Remove `src/assets/tom-avatar.png` and `src/assets/foreman-hardhat-preview.png`.

