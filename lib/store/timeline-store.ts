import { create } from 'zustand';
import { Scene } from '@/lib/engine/types';

interface Beat extends Scene {
  id: string;
  imageUrl?: string;
  text: string;
  duration: number;
}

interface TimelineState {
  beats: Beat[];
  playheadPosition: number;
  selectedBeatId: string | null;
  history: Beat[][];
  historyIndex: number;
  
  setBeats: (beats: Beat[] | ((prev: Beat[]) => Beat[])) => void;
  setPlayheadPosition: (position: number) => void;
  setSelectedBeatId: (id: string | null) => void;
  undo: () => void;
  redo: () => void;
}

export const useTimelineStore = create<TimelineState>()((set) => ({
  beats: [],
  playheadPosition: 0,
  selectedBeatId: null,
  history: [[]],
  historyIndex: 0,
  
  setBeats: (beatsArg) => set((state) => {
    const nextBeats = typeof beatsArg === 'function' ? beatsArg(state.beats) : beatsArg;
    
    // If setting beats for the first time on load, replace the empty history
    if (state.history.length === 1 && state.history[0].length === 0) {
      return {
        beats: nextBeats,
        history: [nextBeats],
        historyIndex: 0
      };
    }
    
    // Simple undo history append
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(nextBeats);
    return {
      beats: nextBeats,
      history: newHistory,
      historyIndex: newHistory.length - 1
    };
  }),
  setPlayheadPosition: (playheadPosition) => set({ playheadPosition }),
  setSelectedBeatId: (selectedBeatId) => set({ selectedBeatId }),
  
  undo: () => set((state) => {
    if (state.historyIndex > 0) {
      const nextIndex = state.historyIndex - 1;
      return {
        historyIndex: nextIndex,
        beats: state.history[nextIndex]
      };
    }
    return state;
  }),
  redo: () => set((state) => {
    if (state.historyIndex < state.history.length - 1) {
      const nextIndex = state.historyIndex + 1;
      return {
        historyIndex: nextIndex,
        beats: state.history[nextIndex]
      };
    }
    return state;
  }),
}));
