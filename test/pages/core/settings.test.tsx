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
      screen.getByText(/Manage your AI synthesis engines, voice models, custom LLMs/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add custom api/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /run system diagnostics/i })).toBeInTheDocument();

    // All 7 category tabs
    expect(screen.getByRole('button', { name: /ai models/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /voice & audio/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /stock media/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /brand kits/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /usage & quotas/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /database & supabase/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /api health hub/i })).toBeInTheDocument();
  });

  it('renders AI Models tab content by default', async () => {
    renderSettings();

    await waitFor(() => {
      expect(screen.getByText(/AI Models Integrations/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Manage API keys and custom model endpoints for ai models/i)).toBeInTheDocument();
    expect(screen.getByText(/Google Gemini/i)).toBeInTheDocument();
  });

  it('switches to Voice & Audio tab and renders voice catalog and controls', async () => {
    renderSettings();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /voice & audio/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /voice & audio/i }));

    await waitFor(() => {
      expect(screen.getByText('Voice Synthesis Credentials')).toBeInTheDocument();
      expect(screen.getByText('Voice Model Catalog')).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText(/search voices or language/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^all$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^azure$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^elevenlabs$/i })).toBeInTheDocument();
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

  it('opens and closes Add Custom API Integration modal', async () => {
    renderSettings();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add custom api/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /add custom api/i }));

    await waitFor(() => {
      expect(screen.getByText('Add Custom API Integration')).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText(/e\.g\. DeepSeek V3 \/ Ollama/i)).toBeInTheDocument();

    // Cancel modal
    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByText('Add Custom API Integration')).not.toBeInTheDocument();
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
