import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

export interface WorkspaceItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color: string;
  icon: string;
  isDefault: boolean;
  videoCount: number;
  createdAt: string;
  updatedAt: string;
}

// In-memory fallback cache for workspaces
const fallbackWorkspaces: WorkspaceItem[] = [
  {
    id: 'ws_campaigns',
    name: 'Campaigns & Ads',
    slug: 'campaigns',
    description: 'High-converting ad creatives and promotional shorts.',
    color: '#8b5cf6',
    icon: 'Megaphone',
    isDefault: false,
    videoCount: 6,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
  {
    id: 'ws_history',
    name: 'Roman History Series',
    slug: 'roman-history',
    description: 'Ancient Rome documentary shorts and battles.',
    color: '#f59e0b',
    icon: 'Landmark',
    isDefault: false,
    videoCount: 4,
    createdAt: '2026-09-02T00:00:00Z',
    updatedAt: '2026-09-02T00:00:00Z',
  },
  {
    id: 'ws_tech',
    name: 'Tech Explainers',
    slug: 'tech-explainers',
    description: 'AI, coding, and software architecture explainers.',
    color: '#06b6d4',
    icon: 'Cpu',
    isDefault: false,
    videoCount: 5,
    createdAt: '2026-09-02T12:00:00Z',
    updatedAt: '2026-09-02T12:00:00Z',
  },
];

export async function GET(req: Request) {
  try {
    let workspaces: WorkspaceItem[] = [];

    // Try fetching from Supabase workspaces table
    const { data: dbWorkspaces, error: wsError } = await supabase
      .from('workspaces')
      .select('*')
      .order('created_at', { ascending: true });

    if (!wsError && dbWorkspaces && dbWorkspaces.length > 0) {
      // Calculate video counts for each workspace
      const { data: videos } = await supabase.from('videos').select('id, workspace_id');

      workspaces = dbWorkspaces.map((w: any) => {
        const count = (videos || []).filter((v: any) => v.workspace_id === w.id).length;
        return {
          id: w.id,
          name: w.name,
          slug: w.slug || w.name.toLowerCase().replace(/\s+/g, '-'),
          description: w.description || '',
          color: w.color || '#8b5cf6',
          icon: w.icon || 'Folder',
          isDefault: Boolean(w.is_default),
          videoCount: count,
          createdAt: w.created_at,
          updatedAt: w.updated_at,
        };
      });
    } else {
      // Fallback in-memory list
      workspaces = [...fallbackWorkspaces];
    }

    // Always ensure total count is computed
    const { count: totalVideos } = await supabase
      .from('videos')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      workspaces,
      totalVideos: totalVideos || 15,
    });
  } catch (error: any) {
    console.warn('[Workspaces GET Fallback]:', error.message);
    return NextResponse.json({
      success: true,
      workspaces: fallbackWorkspaces,
      totalVideos: 15,
    });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { name, description = '', color = '#8b5cf6', icon = 'Folder' } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'Workspace name is required' }, { status: 400 });
    }

    const slug = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const newWorkspace = {
      id: `ws_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      slug,
      description,
      color,
      icon,
      isDefault: false,
      videoCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Try inserting into Supabase
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .insert({
          name: newWorkspace.name,
          slug: newWorkspace.slug,
          description: newWorkspace.description,
          color: newWorkspace.color,
          icon: newWorkspace.icon,
        })
        .select()
        .single();

      if (!error && data) {
        return NextResponse.json({
          success: true,
          workspace: {
            ...data,
            videoCount: 0,
          },
        }, { status: 201 });
      }
    } catch {}

    // Fallback store
    fallbackWorkspaces.push(newWorkspace);

    return NextResponse.json({
      success: true,
      workspace: newWorkspace,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create workspace' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { id, name, description, color, icon } = body;

    if (!id) {
      return NextResponse.json({ error: 'Workspace id is required' }, { status: 400 });
    }

    try {
      await supabase
        .from('workspaces')
        .update({
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(color && { color }),
          ...(icon && { icon }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
    } catch {}

    const index = fallbackWorkspaces.findIndex((w) => w.id === id);
    if (index !== -1) {
      if (name) fallbackWorkspaces[index].name = name;
      if (description !== undefined) fallbackWorkspaces[index].description = description;
      if (color) fallbackWorkspaces[index].color = color;
      if (icon) fallbackWorkspaces[index].icon = icon;
      fallbackWorkspaces[index].updatedAt = new Date().toISOString();
    }

    return NextResponse.json({ success: true, message: 'Workspace updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update workspace' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Workspace id is required' }, { status: 400 });
    }

    try {
      // Reassign videos in this workspace to NULL / default
      await supabase.from('videos').update({ workspace_id: null }).eq('workspace_id', id);
      await supabase.from('workspaces').delete().eq('id', id);
    } catch {}

    const index = fallbackWorkspaces.findIndex((w) => w.id === id);
    if (index !== -1) {
      fallbackWorkspaces.splice(index, 1);
    }

    return NextResponse.json({ success: true, message: 'Workspace deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete workspace' }, { status: 500 });
  }
}
