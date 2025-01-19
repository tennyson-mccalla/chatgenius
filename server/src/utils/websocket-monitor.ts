import { EventEmitter } from 'events';

interface ConnectionMetrics {
  totalConnections: number;
  activeConnections: number;
  failedConnections: number;
  reconnectionAttempts: number;
  avgLatency: number;
  connectionErrors: number;
}

interface MessageMetrics {
  messagesSent: number;
  messagesReceived: number;
  failedMessages: number;
  avgDeliveryTime: number;
  typingIndicatorsSent: number;
  typingIndicatorsFailed: number;
  presenceUpdatesSent: number;
  presenceUpdatesFailed: number;
  channelJoins: number;
  channelLeaves: number;
  channelCreates: number;
  channelOperationsFailed: number;
  reactionsAdded: number;
  reactionsRemoved: number;
  reactionsFailed: number;
  filesShared: number;
  fileSharesFailed: number;
  totalBytesUploaded: number;
}

interface ErrorMetrics {
  authErrors: number;
  messageErrors: number;
  connectionErrors: number;
  rateLimitErrors: number;
}

export class WebSocketMonitor extends EventEmitter {
  private connectionMetrics: ConnectionMetrics = {
    totalConnections: 0,
    activeConnections: 0,
    failedConnections: 0,
    reconnectionAttempts: 0,
    avgLatency: 0,
    connectionErrors: 0,
  };

  private messageMetrics: MessageMetrics = {
    messagesSent: 0,
    messagesReceived: 0,
    failedMessages: 0,
    avgDeliveryTime: 0,
    typingIndicatorsSent: 0,
    typingIndicatorsFailed: 0,
    presenceUpdatesSent: 0,
    presenceUpdatesFailed: 0,
    channelJoins: 0,
    channelLeaves: 0,
    channelCreates: 0,
    channelOperationsFailed: 0,
    reactionsAdded: 0,
    reactionsRemoved: 0,
    reactionsFailed: 0,
    filesShared: 0,
    fileSharesFailed: 0,
    totalBytesUploaded: 0
  };

  private errorMetrics: ErrorMetrics = {
    authErrors: 0,
    messageErrors: 0,
    connectionErrors: 0,
    rateLimitErrors: 0,
  };

  private latencyHistory: number[] = [];
  private deliveryTimeHistory: number[] = [];
  private implementation: 'SOCKET.IO' | 'WS';

  constructor(implementation: 'SOCKET.IO' | 'WS') {
    super();
    this.implementation = implementation;
  }

  // Connection tracking
  trackConnection() {
    this.connectionMetrics.totalConnections++;
    this.connectionMetrics.activeConnections++;
    this.emit('metrics:update', this.getMetrics());
  }

  trackDisconnection() {
    this.connectionMetrics.activeConnections--;
    this.emit('metrics:update', this.getMetrics());
  }

  trackFailedConnection() {
    this.connectionMetrics.failedConnections++;
    this.connectionMetrics.connectionErrors++;
    this.emit('metrics:update', this.getMetrics());
  }

  // Message tracking
  trackMessageSent(messageId: string) {
    this.messageMetrics.messagesSent++;
    this.emit('metrics:update', this.getMetrics());
  }

  trackMessageReceived(messageId: string, deliveryTime: number) {
    this.messageMetrics.messagesReceived++;
    this.deliveryTimeHistory.push(deliveryTime);
    this.updateAvgDeliveryTime();
    this.emit('metrics:update', this.getMetrics());
  }

  trackFailedMessage() {
    this.messageMetrics.failedMessages++;
    this.errorMetrics.messageErrors++;
    this.emit('metrics:update', this.getMetrics());
  }

  // Latency tracking
  trackLatency(latency: number) {
    this.latencyHistory.push(latency);
    this.updateAvgLatency();
    this.emit('metrics:update', this.getMetrics());
  }

  // Error tracking
  trackAuthError() {
    this.errorMetrics.authErrors++;
    this.emit('metrics:update', this.getMetrics());
  }

  trackRateLimitError() {
    this.errorMetrics.rateLimitErrors++;
    this.emit('metrics:update', this.getMetrics());
  }

  trackTypingIndicator() {
    this.messageMetrics.typingIndicatorsSent++;
  }

  trackFailedTypingIndicator() {
    this.messageMetrics.typingIndicatorsFailed++;
  }

  trackPresenceUpdate() {
    this.messageMetrics.presenceUpdatesSent++;
    this.emit('metrics:update', this.getMetrics());
  }

  trackFailedPresenceUpdate() {
    this.messageMetrics.presenceUpdatesFailed++;
    this.emit('metrics:update', this.getMetrics());
  }

  trackChannelJoin() {
    this.messageMetrics.channelJoins++;
    this.emit('metrics:update', this.getMetrics());
  }

  trackChannelLeave() {
    this.messageMetrics.channelLeaves++;
    this.emit('metrics:update', this.getMetrics());
  }

  trackChannelCreate() {
    this.messageMetrics.channelCreates++;
    this.emit('metrics:update', this.getMetrics());
  }

  trackFailedChannelOperation() {
    this.messageMetrics.channelOperationsFailed++;
    this.emit('metrics:update', this.getMetrics());
  }

  trackReaction(isAdd: boolean) {
    if (isAdd) {
      this.messageMetrics.reactionsAdded++;
    } else {
      this.messageMetrics.reactionsRemoved++;
    }
    this.emit('metrics:update', this.getMetrics());
  }

  trackFailedReaction() {
    this.messageMetrics.reactionsFailed++;
    this.emit('metrics:update', this.getMetrics());
  }

  trackFileShared(fileSize: number = 0) {
    this.messageMetrics.filesShared++;
    this.messageMetrics.totalBytesUploaded += fileSize;
    this.emit('metrics:update', this.getMetrics());
  }

  trackFailedFileShare() {
    this.messageMetrics.fileSharesFailed++;
    this.emit('metrics:update', this.getMetrics());
  }

  // Metrics retrieval
  getMetrics() {
    return {
      implementation: this.implementation,
      timestamp: new Date().toISOString(),
      connections: { ...this.connectionMetrics },
      messages: { ...this.messageMetrics },
      errors: { ...this.errorMetrics },
    };
  }

  // Debug endpoint data
  getDebugData() {
    return {
      ...this.getMetrics(),
      latencyHistory: this.latencyHistory.slice(-100),
      deliveryTimeHistory: this.deliveryTimeHistory.slice(-100),
    };
  }

  private updateAvgLatency() {
    const recentLatencies = this.latencyHistory.slice(-100);
    this.connectionMetrics.avgLatency = recentLatencies.reduce((a, b) => a + b, 0) / recentLatencies.length;
  }

  private updateAvgDeliveryTime() {
    const recentDeliveryTimes = this.deliveryTimeHistory.slice(-100);
    this.messageMetrics.avgDeliveryTime = recentDeliveryTimes.reduce((a, b) => a + b, 0) / recentDeliveryTimes.length;
  }

  // Reset metrics (useful for testing)
  reset() {
    this.connectionMetrics = {
      totalConnections: 0,
      activeConnections: 0,
      failedConnections: 0,
      reconnectionAttempts: 0,
      avgLatency: 0,
      connectionErrors: 0,
    };
    this.messageMetrics = {
      messagesSent: 0,
      messagesReceived: 0,
      failedMessages: 0,
      avgDeliveryTime: 0,
      typingIndicatorsSent: 0,
      typingIndicatorsFailed: 0,
      presenceUpdatesSent: 0,
      presenceUpdatesFailed: 0,
      channelJoins: 0,
      channelLeaves: 0,
      channelCreates: 0,
      channelOperationsFailed: 0,
      reactionsAdded: 0,
      reactionsRemoved: 0,
      reactionsFailed: 0,
      filesShared: 0,
      fileSharesFailed: 0,
      totalBytesUploaded: 0
    };
    this.errorMetrics = {
      authErrors: 0,
      messageErrors: 0,
      connectionErrors: 0,
      rateLimitErrors: 0,
    };
    this.latencyHistory = [];
    this.deliveryTimeHistory = [];
  }
}
