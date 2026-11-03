# auth

## Overview
Authentication UI form supporting user login and registration with Supabase Auth integration.

## Interface
- [AuthForm.tsx:AuthForm] - Form component handling credentials input, submission states, and error messaging for authentication routes.
- [AuthForm.tsx:AuthMode] - Type alias restricting authentication mode to 'login' | 'register'.

## Invariants
- [AuthForm.tsx:COPY] - Mode must be strictly 'login' or 'register' to select corresponding header and submit button text.

## Side Effects
- [AuthForm.tsx:handleSubmit] - Invokes supabase.auth.signInWithPassword or supabase.auth.signUp to authenticate user session.
- [AuthForm.tsx:router.push] - Navigates to /dashboard upon successful login.

## Verification
- Run: `pnpm test`
