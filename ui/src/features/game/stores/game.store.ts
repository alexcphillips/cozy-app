import { create } from "zustand";

type GameState = {
    mode: string | null;
    toasts: string[] | null;
};

export const useGameStore = create<GameState>((set) => ({
    mode: null,
    toasts: [],

    setMode: (newMode: string) => {
        set({ mode: newMode });
    },

    setToasts: (toast: string) => {
        set({ toasts: [toast] });
    },
}));
