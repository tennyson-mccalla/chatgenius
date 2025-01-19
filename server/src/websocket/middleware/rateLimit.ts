import { WebSocketMessageType, RateLimitConfig, rateLimitConfig } from '../../types/websocket.types';

interface RateLimitRule {
  maxRequests: number;
  timeWindow: number;  // in milliseconds
  blockDuration: number;  // in milliseconds
}

interface RateLimitState {
  requests: number;
  windowStart: number;
  blockedUntil?: number;
}

export class RateLimiter {
  private limits: Map<string, Map<WebSocketMessageType, RateLimitState>> = new Map();
  private rules: Record<WebSocketMessageType, RateLimitRule>;

  constructor(config?: Partial<Record<WebSocketMessageType, RateLimitRule>>) {
    this.rules = config ? { ...rateLimitConfig, ...config } : rateLimitConfig;
  }

  public isRateLimited(userId: string, type: WebSocketMessageType): boolean {
    // Skip rate limiting for certain message types
    if (!this.rules[type]) return false;

    const now = Date.now();
    const userLimits = this.getUserLimits(userId);
    const state = this.getTypeState(userLimits, type);

    // Check if user is blocked
    if (state.blockedUntil && now < state.blockedUntil) {
      return true;
    }

    // Reset window if expired
    if (now - state.windowStart >= this.rules[type].timeWindow) {
      state.requests = 0;
      state.windowStart = now;
    }

    // Check if limit exceeded
    if (state.requests >= this.rules[type].maxRequests) {
      state.blockedUntil = now + this.rules[type].blockDuration;
      return true;
    }

    // Increment request count
    state.requests++;
    return false;
  }

  public getRemainingRequests(userId: string, type: WebSocketMessageType): number {
    if (!this.rules[type]) return Infinity;

    const userLimits = this.getUserLimits(userId);
    const state = this.getTypeState(userLimits, type);

    if (state.blockedUntil && Date.now() < state.blockedUntil) {
      return 0;
    }

    return Math.max(0, this.rules[type].maxRequests - state.requests);
  }

  public getBlockDuration(userId: string, type: WebSocketMessageType): number {
    const userLimits = this.getUserLimits(userId);
    const state = this.getTypeState(userLimits, type);

    if (state.blockedUntil && Date.now() < state.blockedUntil) {
      return state.blockedUntil - Date.now();
    }

    return 0;
  }

  private getUserLimits(userId: string): Map<WebSocketMessageType, RateLimitState> {
    let userLimits = this.limits.get(userId);
    if (!userLimits) {
      userLimits = new Map();
      this.limits.set(userId, userLimits);
    }
    return userLimits;
  }

  private getTypeState(userLimits: Map<WebSocketMessageType, RateLimitState>, type: WebSocketMessageType): RateLimitState {
    let state = userLimits.get(type);
    if (!state) {
      state = {
        requests: 0,
        windowStart: Date.now()
      };
      userLimits.set(type, state);
    }
    return state;
  }

  // Cleanup old rate limit data
  public cleanup(): void {
    const now = Date.now();
    for (const [userId, userLimits] of this.limits.entries()) {
      let hasActiveLimits = false;

      for (const [type, state] of userLimits.entries()) {
        // Remove expired blocks and windows
        if ((!state.blockedUntil || now >= state.blockedUntil) &&
            now - state.windowStart >= this.rules[type]?.timeWindow) {
          userLimits.delete(type);
        } else {
          hasActiveLimits = true;
        }
      }

      // Remove user entry if no active limits
      if (!hasActiveLimits) {
        this.limits.delete(userId);
      }
    }
  }
}
