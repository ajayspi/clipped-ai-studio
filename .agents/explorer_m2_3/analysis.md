# Clipped Frontend Headless Test Suite — Milestone 2
## Explorer Investigation Report: Login & Register Pages & Test Architecture

**Author**: Explorer M2-3  
**Date**: 2026-09-17  
**Working Directory**: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped\.agents\explorer_m2_3`  
**Workspace Root**: `C:\Users\vigilare\.gemini\antigravity\scratch\clipped`  
**Target Routes**: `/login` and `/register` (`app/(auth)/login/page.tsx`, `app/(auth)/register/page.tsx`)  
**Proposed Test File**: `test/pages/core/auth.test.tsx`

---

## 1. Executive Summary

This report delivers the technical investigation for Milestone 2's authentication route testing in the Clipped AI Studio platform. We thoroughly analyzed:
1. **The Route File Topology**: Clarified the relationship between `app/(auth)/login/page.tsx` vs `app/login/page.tsx`, and `app/(auth)/register/page.tsx` vs `app/register/page.tsx`. In Next.js App Router, `(auth)` is an organizational route group that serves `/login` and `/register` directly. The flat paths `app/login/page.tsx` and `app/register/page.tsx` do not exist on disk, and creating them would trigger fatal Next.js build errors due to conflicting route segment collisions.
2. **Component Architecture & Form Mechanics**: Examined state hooks, DOM structure, accessible labels, submission pipelines, and error/success alerts in both `LoginPage` and `RegisterPage`.
3. **Provider Buttons & OAuth**: Confirmed that **neither page renders OAuth or social login buttons** (no Google, GitHub, Apple, etc.). All authentication is purely email/password driven.
4. **Mock Harness Verification & Latent Bug Detection**:
   - `test/setup.ts` supplies mocks for `next/navigation` and `@/lib/supabase/client` (`signInWithPassword`, `signUp`).
   - Identified a latent test bug in `test/supabase-mock-adversarial.test.tsx` (line 400), where an assertion queries `getByRole('button', { name: /create account/i })` even though the actual button text in `RegisterPage` is `"Sign Up"`.
   - Identified that `test/setup.ts` currently lacks `signInWithOAuth`, which should defensively be added to prevent future regression.
5. **Concrete Test Architecture**: Formulated an exhaustive, production-grade test blueprint for `test/pages/core/auth.test.tsx` utilizing `@testing-library/react` and Vitest fake timers.

---

## 2. Deep Dive: Login Pages (`app/(auth)/login/page.tsx` vs `app/login/page.tsx`)

### 2.1. File Existence, Routing, and Collision Analysis

- **Physical File Status**:
  - `app/(auth)/login/page.tsx` **EXISTS** (103 lines, 3,767 bytes).
  - `app/login/page.tsx` **DOES NOT EXIST**.
- **Next.js App Router Resolution**:
  - Folders wrapped in parentheses `(name)` are **Route Groups**. Route groups are purely organizational and are stripped from the URL path hierarchy.
  - Therefore, `app/(auth)/login/page.tsx` directly resolves to the URL `/login`.
  - Next.js prohibits duplicate routes. If a developer were to create `app/login/page.tsx` alongside `app/(auth)/login/page.tsx`, Next.js would throw a compilation error during build:
    ```
    Error: Conflicting app page "/login" and "/login" to same URL path.
    ```
  - **Conclusion**: There is no file redirect or re-export between them because `app/login/page.tsx` does not exist. The single source of truth for the login route is `app/(auth)/login/page.tsx`.

### 2.2. Rendered UI Hierarchy & Forms

The `LoginPage` component is a Client Component (`"use client"`):

```
┌────────────────────────────────────────────────────────────────┐
│  <div className="flex min-h-screen flex-col items-center ..."> │
│    <div className="w-full max-w-sm space-y-6">                 │
│      ├── Logo & Brand: <Link href="/"> (Video icon + "Clipped")│
│      ├── Header: <h1>"Welcome back"</h1>                       │
│      ├── Subtitle: <p>"Enter your credentials to access..."</p>│
│      ├── Form: <form onSubmit={handleSubmit}>                  │
│      │     ├── Conditional Error Alert: {error && <div>}       │
│      │     ├── Email Field:                                    │
│      │     │     ├── <label htmlFor="email">Email</label>      │
│      │     │     └── <input id="email" type="email" ... />     │
│      │     ├── Password Field:                                 │
│      │     │     ├── <label htmlFor="password">Password</label>│
│      │     │     └── <input id="password" type="password"... />│
│      │     └── Submit Button:                                  │
│      │           <button type="submit" disabled={loading}>     │
│      │             {loading ? <Loader2 /> : "Sign In"}         │
│      │           </button>                                     │
│      └── Footer Link: "Don't have an account? Sign up"         │
│            └── <Link href="/register">                         │
└────────────────────────────────────────────────────────────────┘
```

- **Exact Input Specifications**:
  - **Email**:
    - `id="email"`, `type="email"`, `placeholder="you@example.com"`, `required: true`
    - Accessible via `screen.getByLabelText(/email/i)` or `screen.getByRole('textbox', { name: /email/i })`
  - **Password**:
    - `id="password"`, `type="password"`, `required: true`
    - Accessible via `screen.getByLabelText(/password/i)`
  - **Submit Button**:
    - `type="submit"`
    - Accessible name: `"Sign In"` (or spinning `Loader2` when `loading: true`)
    - Accessible via `screen.getByRole('button', { name: /sign in/i })`
- **Auth Provider Buttons (OAuth / Social Login)**:
  - **NONE**. There are no buttons for Google, GitHub, Apple, Discord, or Microsoft.
  - Nor is there any OAuth logic or redirect URL handling.

### 2.3. Form Submission & State Pipeline

```ts
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  setError("")
  setLoading(true)
  try {
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (signInError) {
      setError(signInError.message || "Invalid email or password.")
    } else {
      router.push("/dashboard")
      router.refresh()
    }
  } catch {
    setError("Something went wrong. Please try again.")
  } finally {
    setLoading(false)
  }
}
```

- **Mocks Invoked**:
  1. `createClient()` from `@/lib/supabase/client` — instantiates the browser Supabase client.
  2. `supabase.auth.signInWithPassword({ email, password })` — authenticates user credentials.
  3. `router.push('/dashboard')` from `useRouter()` (`next/navigation`).
  4. `router.refresh()` from `useRouter()` (`next/navigation`).
- **Error States**:
  - Supabase error: rendered in `div.text-destructive` with message `signInError.message || "Invalid email or password."`.
  - Uncaught exception: caught by `catch` block and sets `error` to `"Something went wrong. Please try again."`.

---

## 3. Deep Dive: Register Pages (`app/(auth)/register/page.tsx` vs `app/register/page.tsx`)

### 3.1. File Existence and Routing Analysis

- **Physical File Status**:
  - `app/(auth)/register/page.tsx` **EXISTS** (109 lines, 4,059 bytes).
  - `app/register/page.tsx` **DOES NOT EXIST**.
- **Next.js App Router Resolution**:
  - Similar to the login page, `app/(auth)/register/page.tsx` resolves directly to `/register`.
  - `app/register/page.tsx` is not present, avoiding route collisions.

### 3.2. Rendered UI Hierarchy & Alert Systems

The `RegisterPage` component is a Client Component (`"use client"`):

```
┌────────────────────────────────────────────────────────────────┐
│  <div className="flex min-h-screen flex-col items-center ..."> │
│    <div className="w-full max-w-sm space-y-6">                 │
│      ├── Logo & Brand: <Link href="/"> (Video icon + "Clipped")│
│      ├── Header: <h1>"Create an account"</h1>                  │
│      ├── Subtitle: <p>"Enter your email to get started"</p>    │
│      ├── Form: <form onSubmit={handleSubmit}>                  │
│      │     ├── Conditional Error Alert: {error && <div>}       │
│      │     │     (border-destructive bg-destructive/10)        │
│      │     ├── Conditional Success Alert: {message && <div>}   │
│      │     │     (border-green-500 bg-green-500/10 text-green) │
│      │     ├── Email Field:                                    │
│      │     │     ├── <label htmlFor="email">Email</label>      │
│      │     │     └── <input id="email" type="email" ... />     │
│      │     ├── Password Field:                                 │
│      │     │     ├── <label htmlFor="password">Password</label>│
│      │     │     └── <input id="password" type="password"... />│
│      │     └── Submit Button:                                  │
│      │           <button type="submit" disabled={loading}>     │
│      │             {loading ? <Loader2 /> : "Sign Up"}         │
│      │           </button>                                     │
│      └── Footer Link: "Already have an account? Sign in"       │
│            └── <Link href="/login">                            │
└────────────────────────────────────────────────────────────────┘
```

- **Exact Input Specifications**:
  - **Email**:
    - `id="email"`, `type="email"`, `placeholder="you@example.com"`, `required: true`
    - Accessible via `screen.getByLabelText(/email/i)`
  - **Password**:
    - `id="password"`, `type="password"`, `required: true`
    - Accessible via `screen.getByLabelText(/password/i)`
  - **Submit Button**:
    - `type="submit"`
    - Accessible name: `"Sign Up"`
    - **CRITICAL OBSERVATION**: The button text is `"Sign Up"`. In `test/supabase-mock-adversarial.test.tsx` line 400, a test queries `getByRole('button', { name: /create account/i })` which will fail. The heading is `"Create an account"`, but the button is `"Sign Up"`.
- **Alert Systems**:
  1. **Error Alert**:
     ```tsx
     {error && (
       <div className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
         {error}
       </div>
     )}
     ```
  2. **Success Alert**:
     ```tsx
     {message && (
       <div className="rounded-md border border-green-500 bg-green-500/10 px-3 py-2 text-sm text-green-500">
         {message}
       </div>
     )}
     ```
- **Auth Provider Buttons (OAuth / Social Login)**:
  - **NONE**. No OAuth buttons are rendered.

### 3.3. Form Submission & Deferred Redirect Pipeline

```ts
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  setError("")
  setMessage("")
  setLoading(true)
  
  try {
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    })
    if (signUpError) {
      setError(signUpError.message || "Failed to sign up.")
    } else {
      setMessage("Success! Please check your email for a confirmation link (if enabled) or go to login.")
      setTimeout(() => router.push("/login"), 3000)
    }
  } catch {
    setError("Something went wrong. Please try again.")
  } finally {
    setLoading(false)
  }
}
```

- **Mocks Invoked**:
  1. `createClient()` from `@/lib/supabase/client`.
  2. `supabase.auth.signUp({ email, password })`.
  3. `router.push('/login')` deferred by a `setTimeout(..., 3000)`.
- **Testing Implication**:
  - Tests verifying the redirect after successful signup must control the clock using `vi.useFakeTimers()` and `vi.advanceTimersByTime(3000)` to trigger `router.push('/login')` deterministically without hanging or waiting 3 real seconds.

---

## 4. Evaluation of Test Infrastructure & Mock Harness

### 4.1. Global Harness Status (`test/setup.ts`)

| Module / API | Mock Status in `test/setup.ts` | Sufficiency for Auth Routes |
|---|---|---|
| `next/navigation` | `useRouter`, `usePathname`, `useSearchParams`, `useParams` fully mocked | **100% Sufficient**. `useRouter` provides `push`, `replace`, `refresh`, `back`, `forward`. |
| `next/link` | Not mocked (Next.js default client Link) | **Sufficient**. In JSDOM, renders valid `<a>` elements with `href`. |
| `lucide-react` | Real package loaded | **Sufficient**. `Video` and `Loader2` render SVG elements cleanly in JSDOM. |
| `@/lib/supabase/client` | `createClient` mocked with `createMockSupabaseInstance()` | **Sufficient for current code**. Returns `auth.signInWithPassword` and `auth.signUp`. |
| `signInWithOAuth` | **Omitted** from `mockAuth` | **Defensive Gap**. Although neither page currently uses OAuth, adding `signInWithOAuth: vi.fn().mockResolvedValue({ data: { provider: 'google', url: '' }, error: null })` ensures future-proof stability. |

### 4.2. Bug Discovery in `test/supabase-mock-adversarial.test.tsx`

In `test/supabase-mock-adversarial.test.tsx`, line 400:
```tsx
it('mounts <RegisterPage /> without unhandled exceptions or Supabase SSR errors', () => {
  expect(() => render(<RegisterPage />)).not.toThrow();
  expect(screen.getByText('Create an account')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument(); // BUG!
});
```
- **The Bug**: `screen.getByRole('button', { name: /create account/i })` fails because the button text is `"Sign Up"`.
- **Fix**: The assertion must be:
  ```tsx
  expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
  ```

---

## 5. Recommended Test Architecture for `test/pages/core/auth.test.tsx`

### 5.1. File Organization

```
test/
└── pages/
    └── core/
        ├── auth.test.tsx          <-- Dedicated suite for Login, Register & AuthLayout
        ├── dashboard.test.tsx
        ├── settings.test.tsx
        ├── library.test.tsx
        ├── queue.test.tsx
        └── planner.test.tsx
```

### 5.2. Test Suite Decomposition

`test/pages/core/auth.test.tsx` should be structured into four distinct sections:

1. **Suite 1: `Login Page (app/(auth)/login/page.tsx)`**
   - **Mount & Render**: Verifies `<LoginPage />` mounts cleanly without uncaught exceptions or error boundary triggers.
   - **DOM Structure**: Verifies header ("Welcome back"), subtitle, email input, password input, submit button ("Sign In"), and link to `/register`.
   - **Form Interactivity**: Verifies typing into email and password inputs updates input values.
   - **Successful Submission**: Submits form, asserts `supabase.auth.signInWithPassword` is called with entered email and password, and asserts `router.push('/dashboard')` and `router.refresh()` are called.
   - **Auth Error Handling**: Mocks `signInWithPassword` returning `{ data: null, error: { message: 'Invalid email or password.' } }`, asserts error banner is displayed in the DOM.
   - **Network/Exception Handling**: Mocks `signInWithPassword` rejecting with an exception, asserts fallback error `"Something went wrong. Please try again."` is displayed.

2. **Suite 2: `Register Page (app/(auth)/register/page.tsx)`**
   - **Mount & Render**: Verifies `<RegisterPage />` mounts cleanly without uncaught exceptions.
   - **DOM Structure**: Verifies header ("Create an account"), subtitle, email input, password input, submit button ("Sign Up"), and link to `/login`.
   - **Form Interactivity**: Verifies typing into email and password inputs.
   - **Successful Submission & Redirect**: Mocks `supabase.auth.signUp`, submits form, verifies success banner is displayed (`"Success! Please check your email..."`), advances fake timer by 3,000ms, and asserts `router.push('/login')` is executed.
   - **Registration Error Handling**: Mocks `signUp` returning `{ data: null, error: { message: 'Email already registered.' } }`, asserts error banner is displayed.
   - **Exception Handling**: Mocks `signUp` throwing an error, asserts fallback error message is displayed.

3. **Suite 3: `Auth Layout (app/(auth)/layout.tsx)`**
   - Verifies `<AuthLayout>` mounts and wraps child components in `min-h-screen bg-muted/20`.

4. **Suite 4: `Route Architecture & Route Group Contracts`**
   - Verifies that `LoginPage` and `RegisterPage` are default exports conforming to standard React functional components.
   - Verifies absence of conflicting root `app/login/page.tsx` and `app/register/page.tsx` to ensure Next.js App Router route integrity.

---

## 6. Concrete Test Specification Blueprint

Here is the exact reference test implementation to be written to `test/pages/core/auth.test.tsx`:

```tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

import LoginPage from '@/app/(auth)/login/page';
import RegisterPage from '@/app/(auth)/register/page';
import AuthLayout from '@/app/(auth)/layout';

describe('Auth Pages Core Suite', () => {
  let router: ReturnType<typeof useRouter>;
  let supabase: ReturnType<typeof createClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    router = useRouter();
    supabase = createClient();
  });

  // ==========================================================================
  // Suite 1: Login Page
  // ==========================================================================
  describe('Login Route (app/(auth)/login/page.tsx)', () => {
    it('mounts cleanly without throwing exceptions', () => {
      expect(() => render(<LoginPage />)).not.toThrow();
    });

    it('renders all core brand, heading, and navigation elements', () => {
      render(<LoginPage />);

      // Branding & Heading
      expect(screen.getByRole('heading', { level: 1, name: /welcome back/i })).toBeInTheDocument();
      expect(screen.getByText(/enter your credentials to access your account/i)).toBeInTheDocument();

      // Home link
      const homeLink = screen.getByRole('link', { name: /clipped/i });
      expect(homeLink).toHaveAttribute('href', '/');

      // Register link
      const registerLink = screen.getByRole('link', { name: /sign up/i });
      expect(registerLink).toHaveAttribute('href', '/register');
    });

    it('renders email and password inputs with proper attributes and submit button', () => {
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
      expect(emailInput).toBeInTheDocument();
      expect(emailInput.type).toBe('email');
      expect(emailInput.required).toBe(true);
      expect(emailInput.placeholder).toBe('you@example.com');

      const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;
      expect(passwordInput).toBeInTheDocument();
      expect(passwordInput.type).toBe('password');
      expect(passwordInput.required).toBe(true);

      const submitBtn = screen.getByRole('button', { name: /sign in/i });
      expect(submitBtn).toBeInTheDocument();
      expect(submitBtn).not.toBeDisabled();
    });

    it('updates state when typing into email and password inputs', () => {
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
      const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;

      fireEvent.change(emailInput, { target: { value: 'creator@clipped.ai' } });
      expect(emailInput.value).toBe('creator@clipped.ai');

      fireEvent.change(passwordInput, { target: { value: 'Secret123!' } });
      expect(passwordInput.value).toBe('Secret123!');
    });

    it('submits form successfully and calls signInWithPassword and router navigation', async () => {
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitBtn = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'creator@clipped.ai' } });
      fireEvent.change(passwordInput, { target: { value: 'Secret123!' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
          email: 'creator@clipped.ai',
          password: 'Secret123!',
        });
      });

      expect(router.push).toHaveBeenCalledWith('/dashboard');
      expect(router.refresh).toHaveBeenCalled();
    });

    it('displays error alert when supabase.auth.signInWithPassword returns an error', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { name: 'AuthError', message: 'Invalid login credentials' } as any,
      });

      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitBtn = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'wrong@clipped.ai' } });
      fireEvent.change(passwordInput, { target: { value: 'WrongPass' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Invalid login credentials')).toBeInTheDocument();
      });

      expect(router.push).not.toHaveBeenCalled();
    });

    it('handles unexpected exceptions gracefully with fallback error message', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockRejectedValueOnce(new Error('Network timeout'));

      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitBtn = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@clipped.ai' } });
      fireEvent.change(passwordInput, { target: { value: 'testpass' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Suite 2: Register Page
  // ==========================================================================
  describe('Register Route (app/(auth)/register/page.tsx)', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('mounts cleanly without throwing exceptions', () => {
      expect(() => render(<RegisterPage />)).not.toThrow();
    });

    it('renders all core brand, heading, and navigation elements', () => {
      render(<RegisterPage />);

      // Branding & Heading
      expect(screen.getByRole('heading', { level: 1, name: /create an account/i })).toBeInTheDocument();
      expect(screen.getByText(/enter your email to get started/i)).toBeInTheDocument();

      // Home link
      const homeLink = screen.getByRole('link', { name: /clipped/i });
      expect(homeLink).toHaveAttribute('href', '/');

      // Login link
      const loginLink = screen.getByRole('link', { name: /sign in/i });
      expect(loginLink).toHaveAttribute('href', '/login');
    });

    it('renders email and password inputs with proper attributes and submit button', () => {
      render(<RegisterPage />);

      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
      expect(emailInput).toBeInTheDocument();
      expect(emailInput.type).toBe('email');
      expect(emailInput.required).toBe(true);

      const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;
      expect(passwordInput).toBeInTheDocument();
      expect(passwordInput.type).toBe('password');
      expect(passwordInput.required).toBe(true);

      // Confirm button accessible name is "Sign Up", NOT "Create Account"
      const submitBtn = screen.getByRole('button', { name: /sign up/i });
      expect(submitBtn).toBeInTheDocument();
      expect(submitBtn).not.toBeDisabled();
    });

    it('submits registration successfully, shows success banner, and redirects after 3s delay', async () => {
      render(<RegisterPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitBtn = screen.getByRole('button', { name: /sign up/i });

      fireEvent.change(emailInput, { target: { value: 'newuser@clipped.ai' } });
      fireEvent.change(passwordInput, { target: { value: 'Pass1234!' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(supabase.auth.signUp).toHaveBeenCalledWith({
          email: 'newuser@clipped.ai',
          password: 'Pass1234!',
        });
      });

      // Verify success message is rendered
      expect(
        screen.getByText(/success! please check your email for a confirmation link/i)
      ).toBeInTheDocument();

      // Fast forward 3 seconds for deferred navigation
      expect(router.push).not.toHaveBeenCalled();
      vi.advanceTimersByTime(3000);
      expect(router.push).toHaveBeenCalledWith('/login');
    });

    it('displays error alert when supabase.auth.signUp returns an error', async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { name: 'AuthError', message: 'User already registered' } as any,
      });

      render(<RegisterPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitBtn = screen.getByRole('button', { name: /sign up/i });

      fireEvent.change(emailInput, { target: { value: 'existing@clipped.ai' } });
      fireEvent.change(passwordInput, { target: { value: 'Pass1234!' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('User already registered')).toBeInTheDocument();
      });

      expect(router.push).not.toHaveBeenCalled();
    });

    it('handles unexpected exceptions during registration gracefully', async () => {
      vi.mocked(supabase.auth.signUp).mockRejectedValueOnce(new Error('Network failure'));

      render(<RegisterPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitBtn = screen.getByRole('button', { name: /sign up/i });

      fireEvent.change(emailInput, { target: { value: 'test@clipped.ai' } });
      fireEvent.change(passwordInput, { target: { value: 'testpass' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Suite 3: Auth Layout Integration
  // ==========================================================================
  describe('Auth Layout (app/(auth)/layout.tsx)', () => {
    it('renders layout wrapping children within styling container', () => {
      const { container } = render(
        <AuthLayout>
          <div data-testid="auth-child">Auth Child Content</div>
        </AuthLayout>
      );

      expect(screen.getByTestId('auth-child')).toBeInTheDocument();
      expect(container.firstChild).toHaveClass('min-h-screen', 'bg-muted/20');
    });
  });

  // ==========================================================================
  // Suite 4: Route Architecture & Export Contracts
  // ==========================================================================
  describe('Route Architecture & Export Contracts', () => {
    it('verifies LoginPage and RegisterPage are valid React component functions', () => {
      expect(typeof LoginPage).toBe('function');
      expect(typeof RegisterPage).toBe('function');
      expect(typeof AuthLayout).toBe('function');
    });
  });
});
```

---

## 7. Actionable Instructions for Implementer Agent

When implementing Milestone 2 Feature 9 and Feature 10:

1. **Create Test File**:
   - Write the complete test suite above to `test/pages/core/auth.test.tsx`.
2. **Defensive Enhancement in `test/setup.ts`**:
   - In `createMockSupabaseInstance()`, append `signInWithOAuth`:
     ```ts
     signInWithOAuth: vi.fn().mockResolvedValue({ data: { provider: 'google', url: 'https://mock.auth' }, error: null }),
     ```
3. **Fix Adversarial Test Discrepancy**:
   - In `test/supabase-mock-adversarial.test.tsx` line 400, replace:
     ```tsx
     expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
     ```
     with:
     ```tsx
     expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
     ```
4. **Execution & Verification**:
   - Run Vitest: `npx vitest run test/pages/core/auth.test.tsx`
   - Ensure all 14 tests across the 4 suites pass with 100% success rate.
