

## Fix: Restore broken build configuration

The previous edit accidentally overwrote `tsconfig.json` and created `bun.lock`, breaking the entire build. Two issues need fixing:

### Problem 1: Root `tsconfig.json` was corrupted
The original root `tsconfig.json` is for the **server only** and should NOT include `.tsx` files. The edit removed the proper config and replaced it with one that tries to compile React files without `--jsx` set, causing 100+ TypeScript errors.

**Fix**: Restore `tsconfig.json` to its original server-only config (the one currently shown is likely correct for the server — the issue is it now includes `**/*.tsx` in its `include` which pulls in client code without jsx support).

### Problem 2: Missing `"dev"` script
Lovable's preview needs a `"dev"` script in the root `package.json`. Currently there's only `"client:dev"` and `"server:dev"`.

**Fix**: Add `"dev": "cd client && npm run dev"` to the root `package.json` scripts so Lovable can start the preview.

### Recommended approach
**Revert to the version before the tsconfig/bun.lock edit** using the History tab, then re-apply only the GitHub Actions node version changes. This is the safest path since the tsconfig was working before that edit.

### If not reverting, the manual fixes are:

**1. `tsconfig.json`** — Remove `**/*.tsx` from includes, or restore original
```json
{
  "compilerOptions": {
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "node",
    "paths": { "@/*": ["./client/*"], "@shared/*": ["./shared/*"] },
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "strict": true,
    "target": "ES2022",
    "types": ["node"]
  },
  "exclude": ["node_modules", "build", "dist", "client"],
  "include": ["**/*.ts"]
}
```

**2. Root `package.json`** — Add dev script
```json
"dev": "cd client && npm run dev",
```

**3. Delete `bun.lock`** — This was erroneously created and conflicts with `package-lock.json`.

