import { Router } from 'express';

class WebSocketMonitor {
  private connections: number = 0;
  private messages: number = 0;
  private errors: number = 0;

  trackConnection() {
    this.connections++;
  }

  trackDisconnection() {
    this.connections--;
  }

  trackMessage() {
    this.messages++;
  }

  trackError() {
    this.errors++;
  }

  getStats() {
    return {
      activeConnections: this.connections,
      totalMessages: this.messages,
      totalErrors: this.errors
    };
  }
}

export const wsMonitor = new WebSocketMonitor();

const router = Router();

router.get('/ws/stats', (req, res) => {
  res.json(wsMonitor.getStats());
});

export default router;
