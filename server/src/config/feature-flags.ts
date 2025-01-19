import { EventEmitter } from 'events';

export type Feature =
  | 'messaging'
  | 'presence'
  | 'typing'
  | 'channels'
  | 'threads'
  | 'reactions'
  | 'files';

export type Implementation = 'SOCKET.IO' | 'WS' | 'BOTH';

interface FeatureConfig {
  implementation: Implementation;
  fallbackEnabled: boolean;
}

// Initialize feature flags with typing, presence, messaging, and channels enabled for WS
const defaultFeatures: Record<Feature, FeatureConfig> = {
  messaging: { implementation: 'WS', fallbackEnabled: true },
  typing: { implementation: 'WS', fallbackEnabled: true },
  presence: { implementation: 'WS', fallbackEnabled: true },
  channels: { implementation: 'WS', fallbackEnabled: true },
  threads: { implementation: 'SOCKET.IO', fallbackEnabled: true },
  reactions: { implementation: 'WS', fallbackEnabled: true },
  files: { implementation: 'WS', fallbackEnabled: true }
};

class FeatureFlags extends EventEmitter {
  private flags: Map<Feature, FeatureConfig> = new Map();

  constructor() {
    super();
    Object.entries(defaultFeatures).forEach(([feature, config]) => {
      this.flags.set(feature as Feature, config);
    });
  }

  setImplementation(feature: Feature, implementation: Implementation) {
    const current = this.flags.get(feature);
    if (current?.implementation !== implementation) {
      this.flags.set(feature, {
        ...current!,
        implementation
      });
      this.emit('implementation:changed', { feature, implementation });
    }
  }

  getImplementation(feature: Feature): Implementation {
    return this.flags.get(feature)?.implementation || 'SOCKET.IO';
  }

  setFallback(feature: Feature, enabled: boolean) {
    const current = this.flags.get(feature);
    if (current?.fallbackEnabled !== enabled) {
      this.flags.set(feature, {
        ...current!,
        fallbackEnabled: enabled
      });
      this.emit('fallback:changed', { feature, enabled });
    }
  }

  isFallbackEnabled(feature: Feature): boolean {
    return this.flags.get(feature)?.fallbackEnabled || false;
  }

  shouldHandleInSocketIO(feature: Feature): boolean {
    const impl = this.getImplementation(feature);
    return impl === 'SOCKET.IO' || impl === 'BOTH';
  }

  shouldHandleInWS(feature: Feature): boolean {
    const impl = this.getImplementation(feature);
    return impl === 'WS' || impl === 'BOTH';
  }

  // Get current state of all flags
  getState() {
    const state: Record<Feature, FeatureConfig> = {} as any;
    this.flags.forEach((config, feature) => {
      state[feature] = config;
    });
    return state;
  }
}

// Export a singleton instance
export const featureFlags = new FeatureFlags();

// Export a type guard for features
export function isFeature(value: string): value is Feature {
  return [
    'messaging',
    'presence',
    'typing',
    'channels',
    'threads',
    'reactions',
    'files'
  ].includes(value);
}
