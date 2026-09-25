import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import SettingsPage from '@/app/(app)/settings/page';
import { SupabaseProvider } from '@/lib/supabase/context';

function renderSettings() {
  return render(
    <SupabaseProvider>
      <SettingsPage />
    </SupabaseProvider>
  );
}

describe('Settings Route Headless Test (app/(app)/settings/page.tsx)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders Settings header and navigation tabs after loading completes', async () => {
    renderSettings();

    // Resolves loading state
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /^settings$/i })).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Configure your unified OmniRoute AI Gateway, brand kits, workspaces, and database/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Gateway Using Defaults/i)).toBeInTheDocument();

    // All 7 category tabs (current CATEGORIES in app/(app)/settings/page.tsx)
    expect(screen.getByRole('button', { name: /omniroute ai/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /voice catalog/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /brand kits/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /workspaces & team/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /usage & quotas/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /database & supabase/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /api health hub/i })).toBeInTheDocument();
  });

  it('renders OmniRoute AI tab content by default', async () => {
    renderSettings();

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 2, name: /OmniRoute Configuration/i })
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Configure your single OmniRoute or OpenRouter AI gateway/i)
    ).toBeInTheDocument();
  });

  it('switches to Voice Catalog tab and renders voice catalog and controls', async () => {
    renderSettings();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /voice catalog/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /voice catalog/i }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 3, name: /Voice Model Catalog/i })
      ).toBeInTheDocument();
    });

    expect(screen.getByText(/Audition, test, and preview neural voice/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search voices or language/i)).toBeInTheDocument();

    // Voice filter pills
    expect(screen.getByRole('button', { name: /^all$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^neural$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^expressive$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^keyless$/i })).toBeInTheDocument();

    // Voice grid renders catalog entries
    expect(screen.getAllByText('Alloy').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Echo').length).toBeGreaterThan(0);
  });

  it('switches to Database & Supabase tab and displays project routing info', async () => {
    renderSettings();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /database & supabase/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /database & supabase/i }));

    await waitFor(() => {
      expect(screen.getByText('Supabase Project Routing')).toBeInTheDocument();
    });

    expect(screen.getByText(/Project URL \(NEXT_PUBLIC_SUPABASE_URL\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Public Anon Key \(NEXT_PUBLIC_SUPABASE_ANON_KEY\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /test connection/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view schema ddl/i })).toBeInTheDocument();
  });

  it('opens and closes Supabase Schema DDL modal', async () => {
    renderSettings();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /database & supabase/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /database & supabase/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /view schema ddl/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /view schema ddl/i }));

    await waitFor(() => {
      expect(screen.getByText('Supabase PostgreSQL Schema (DDL)')).toBeInTheDocument();
    });

    // Close modal
    const closeBtn = screen.getByRole('button', { name: /^close$/i });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText('Supabase PostgreSQL Schema (DDL)')).not.toBeInTheDocument();
    });
  });

  it('switches to API Health Hub tab and mounts ApiProviderHub cleanly', async () => {
    renderSettings();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /api health hub/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /api health hub/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /api health hub/i })).toBeInTheDocument();
    });
  });
});