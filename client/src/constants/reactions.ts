export const SUPPORTED_REACTIONS = {
  THUMBS_UP: '👍',
  HEART: '❤️',
  SMILE: '😄',
  LAUGH: '😂',
  CLAP: '👏',
  FIRE: '🔥',
  ROCKET: '🚀',
  EYES: '👀'
} as const;

export type SupportedReaction = typeof SUPPORTED_REACTIONS[keyof typeof SUPPORTED_REACTIONS];
