

## Informed Consent Flow

### What will happen

After signing in or signing up, users who haven't given consent will see a dedicated consent page. Once they agree and click "Continue to the app", their consent is recorded and they never see it again.

### Changes Overview

**1. Database: Update `consent_records` table**

Add missing columns to the existing table:
- `email` (text, not null)
- `consent_given` (boolean, default false)
- `consent_text_version` (text, default 'v1')

Rename `consented_at` to `created_at` (or keep and add alias -- we'll keep `consented_at` as-is since it serves the same purpose as `created_at`).

**2. New file: `src/pages/Consent.tsx`**

A full-page consent screen with:
- The full informed consent text (provided in the request)
- A checkbox: "I agree to participate and provide my informed consent"
- A "Continue to the app" button (disabled until checkbox is checked)
- On click: inserts a record into `consent_records` with user_id, username, email, consent_given=true, consent_text_version='v1', then redirects to `/` via full page reload

**3. Update: `src/components/ProtectedRoute.tsx`**

Add a consent check:
- After confirming user is logged in, query `consent_records` for the user
- If no record found, redirect to `/consent`
- If record exists, render children as normal
- Re-check on every navigation (use `location.pathname` as dependency)

**4. Update: `src/App.tsx`**

Add a new route: `<Route path="/consent" element={<Consent />} />`
This route sits outside `ProtectedRoute` but requires authentication (handled inside the Consent component itself).

**5. Update: `src/pages/Auth.tsx`**

No changes needed -- after sign-in/sign-up, user navigates to `/` which hits `ProtectedRoute`, which checks consent and redirects if needed.

### Technical Details

**Migration SQL:**
```sql
ALTER TABLE public.consent_records
  ADD COLUMN IF NOT EXISTS email text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS consent_given boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_text_version text NOT NULL DEFAULT 'v1';
```

**ProtectedRoute consent check flow:**
```text
User authenticated?
  No  --> redirect /auth
  Yes --> Check consent_records for user_id
    No record --> redirect /consent
    Has record --> render children
```

**Consent page insert:**
```typescript
await supabase.from('consent_records').insert({
  user_id: user.id,
  username: username,
  email: user.email,
  consent_given: true,
  consent_text_version: 'v1'
});
window.location.href = '/'; // full reload to re-check
```

### Files touched

| File | Action |
|------|--------|
| Migration SQL | Add columns to `consent_records` |
| `src/pages/Consent.tsx` | **New** -- consent page component |
| `src/components/ProtectedRoute.tsx` | Add consent check logic |
| `src/App.tsx` | Add `/consent` route |

### What is NOT touched

All existing timers, counters, tracking hooks, exercise pages, settings, daily reset logic, and database queries remain completely unchanged.

