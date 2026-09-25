import { create } from 'zustand';

interface AppState {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  user: unknown | null;
  setUser: (user: unknown) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  user: null,
  setUser: (user) => set({ user }),
}));
