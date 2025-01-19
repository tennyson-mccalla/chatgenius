import { create } from 'zustand';
import { TypingState } from './types';
import { createActions } from './actions';

export const useTypingStore = create<TypingState & ReturnType<typeof createActions>>((set, get) => ({
  typingUsers: {},
  ...createActions(set, get)
}));
