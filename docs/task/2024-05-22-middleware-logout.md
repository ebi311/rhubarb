# Middleware and Logout Implementation

## Status

- [x] Implement Middleware for route protection
- [x] Implement Logout functionality
- [x] Fix Vitest configuration for alias resolution
- [x] Verify with unit tests

## Details

### Middleware

- Created `src/middleware.ts` and `src/utils/supabase/middleware.ts`.
- Protects all routes except `/login` and `/auth/*`.
- Redirects authenticated users away from `/login`.

### Logout

- Created `src/app/auth/actions.ts` with `signOut` server action.
- Created `src/app/_components/Header` component with a logout button.
- Added `Header` to `src/app/page.tsx`.

### Testing

- Fixed `vitest.config.mts` to correctly resolve `@/*` aliases using `process.cwd()`.
- Added `cleanup()` to `vitest.setup.ts` to prevent DOM pollution between tests.
- All unit tests passed.
