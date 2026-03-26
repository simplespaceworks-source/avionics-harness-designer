import { create } from 'zustand';

export type Segment = {
  edgeId: string;
  isHoriz: boolean;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

interface RoutingState {
  segments: Record<string, Segment[]>;
  setSegments: (id: string, segments: Segment[]) => void;
  removeSegments: (id: string) => void;
}

export const useRoutingStore = create<RoutingState>((set) => ({
  segments: {},
  setSegments: (id, segs) => set((s) => ({ segments: { ...s.segments, [id]: segs } })),
  removeSegments: (id) => set((s) => {
    const next = { ...s.segments };
    delete next[id];
    return { segments: next };
  }),
}));
