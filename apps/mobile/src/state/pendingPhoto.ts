import { create } from 'zustand';

interface PendingPhotoState {
  imageBase64: string | null;
  setPendingPhoto: (imageBase64: string) => void;
  clearPendingPhoto: () => void;
}

/**
 * A picked photo is handed to log-meal.tsx via this store rather than a
 * navigation param — a base64 image is far too large to pass through
 * expo-router's params, and this only ever needs to survive the single
 * hop from "picked a photo" to "the screen that processes it."
 */
export const usePendingPhotoStore = create<PendingPhotoState>((set) => ({
  imageBase64: null,
  setPendingPhoto: (imageBase64) => set({ imageBase64 }),
  clearPendingPhoto: () => set({ imageBase64: null }),
}));
