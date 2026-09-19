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

      expect(screen.getByRole('heading', { level: 1, name: /welcome back/i })).toBeInTheDocument();
      expect(
        screen.getByText(/enter your credentials to access your account/i)
      ).toBeInTheDocument();

      const homeLink = screen.getByRole('link', { name: /clipped/i });
      expect(homeLink).toHaveAttribute('href', '/');

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
        expect(router.push).toHaveBeenCalledWith('/dashboard');
        expect(router.refresh).toHaveBeenCalled();
      });
    });

    it('displays error message when signInWithPassword returns error', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { name: 'AuthApiError', message: 'Invalid login credentials', status: 400 },
      } as any);

      render(<LoginPage />);

      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'wrong@example.com' } });
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpass' } });
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('Invalid login credentials')).toBeInTheDocument();
      });
    });

    it('handles unexpected exceptions gracefully during submission', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockRejectedValueOnce(
        new Error('Network disconnected')
      );

      render(<LoginPage />);

      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'user@example.com' } });
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pass123' } });
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Suite 2: Register Page
  // ==========================================================================
  describe('Register Route (app/(auth)/register/page.tsx)', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('mounts cleanly without throwing exceptions', () => {
      expect(() => render(<RegisterPage />)).not.toThrow();
    });

    it('renders all core brand, heading, and navigation elements', () => {
      render(<RegisterPage />);

      expect(
        screen.getByRole('heading', { level: 1, name: /create an account/i })
      ).toBeInTheDocument();
      expect(screen.getByText(/enter your email to get started/i)).toBeInTheDocument();

      const homeLink = screen.getByRole('link', { name: /clipped/i });
      expect(homeLink).toHaveAttribute('href', '/');

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

      const submitBtn = screen.getByRole('button', { name: /sign up/i });
      expect(submitBtn).toBeInTheDocument();
      expect(submitBtn).not.toBeDisabled();
    });

    it('updates state when typing into email and password inputs', () => {
      render(<RegisterPage />);

      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
      const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;

      fireEvent.change(emailInput, { target: { value: 'newcreator@clipped.ai' } });
      expect(emailInput.value).toBe('newcreator@clipped.ai');

      fireEvent.change(passwordInput, { target: { value: 'SuperSecret123!' } });
      expect(passwordInput.value).toBe('SuperSecret123!');
    });

    it('submits form, shows success message, and redirects to login after 3s delay', async () => {
      vi.useFakeTimers();

      render(<RegisterPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitBtn = screen.getByRole('button', { name: /sign up/i });

      fireEvent.change(emailInput, { target: { value: 'newcreator@clipped.ai' } });
      fireEvent.change(passwordInput, { target: { value: 'SuperSecret123!' } });
      fireEvent.click(submitBtn);

      await vi.waitFor(() => {
        expect(supabase.auth.signUp).toHaveBeenCalledWith({
          email: 'newcreator@clipped.ai',
          password: 'SuperSecret123!',
        });
        expect(
          screen.getByText(/Success! Please check your email for a confirmation link/i)
        ).toBeInTheDocument();
      });

      // Fast-forward 3 seconds
      vi.advanceTimersByTime(3000);

      expect(router.push).toHaveBeenCalledWith('/login');
    });

    it('displays error message when signUp returns error', async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { name: 'AuthApiError', message: 'User already registered', status: 400 },
      } as any);

      render(<RegisterPage />);

      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'existing@example.com' } });
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pass123' } });
      fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

      await waitFor(() => {
        expect(screen.getByText('User already registered')).toBeInTheDocument();
      });
    });

    it('handles unexpected exceptions gracefully during submission', async () => {
      vi.mocked(supabase.auth.signUp).mockRejectedValueOnce(
        new Error('Network error')
      );

      render(<RegisterPage />);

      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'user@example.com' } });
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pass123' } });
      fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

      await waitFor(() => {
        expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Suite 3: Auth Layout
  // ==========================================================================
  describe('Auth Layout (app/(auth)/layout.tsx)', () => {
    it('mounts and renders child content with expected wrapper styling', () => {
      const { container } = render(
        <AuthLayout>
          <div data-testid="auth-child">Test Auth Content</div>
        </AuthLayout>
      );

      expect(screen.getByTestId('auth-child')).toBeInTheDocument();
      expect(container.firstChild).toHaveClass('min-h-screen bg-muted/20');
    });
  });
});
