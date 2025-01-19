interface OAuthState {
  state: string;
  timestamp: number;
}

const OAUTH_STATE_KEY = 'oauth_state';
const STATE_EXPIRY = 10 * 60 * 1000; // 10 minutes

/**
 * Stores the OAuth state in localStorage
 */
export const setOAuthState = (state: string): void => {
  const stateObj: OAuthState = {
    state,
    timestamp: Date.now()
  };
  localStorage.setItem(OAUTH_STATE_KEY, JSON.stringify(stateObj));
};

/**
 * Retrieves the OAuth state from localStorage
 */
export const getOAuthState = (): OAuthState | null => {
  const stored = localStorage.getItem(OAUTH_STATE_KEY);
  if (!stored) return null;

  try {
    const stateObj: OAuthState = JSON.parse(stored);
    // Check if state has expired
    if (Date.now() - stateObj.timestamp > STATE_EXPIRY) {
      clearOAuthState();
      return null;
    }
    return stateObj;
  } catch {
    clearOAuthState();
    return null;
  }
};

/**
 * Clears the OAuth state from localStorage
 */
export const clearOAuthState = (): void => {
  localStorage.removeItem(OAUTH_STATE_KEY);
};
