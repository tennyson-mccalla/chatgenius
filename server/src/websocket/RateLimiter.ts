export interface RateLimiterConfig {
  windowMs: number;
  maxRequests: number;
}

export class RateLimiter {
  private requests: Map<string, number[]>;
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(config: RateLimiterConfig) {
    this.requests = new Map();
    this.windowMs = config.windowMs;
    this.maxRequests = config.maxRequests;
  }

  public checkLimit(socketId: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get or initialize request timestamps for this socket
    let timestamps = this.requests.get(socketId) || [];
    timestamps = timestamps.filter(timestamp => timestamp > windowStart);

    // Check if rate limit is exceeded
    if (timestamps.length >= this.maxRequests) {
      return false;
    }

    // Add new request timestamp
    timestamps.push(now);
    this.requests.set(socketId, timestamps);

    return true;
  }

  public clearSocket(socketId: string): void {
    this.requests.delete(socketId);
  }
}
