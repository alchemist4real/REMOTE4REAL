/**
 * REMOTE4REAL — High-Speed WebSocket Networking & Packet Service
 * Supports PIN Authentication, Ping Tracking, and Binary Frame Streams.
 */

import * as Haptics from 'expo-haptics';

export type MessageHandler = (data: any) => void;
export type BinaryFrameHandler = (arrayBuffer: ArrayBuffer) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string = 'ws://192.168.2.62:8765';
  private pin: string = '';
  private isConnected: boolean = false;
  private isAuthenticated: boolean = false;
  private messageListeners: Set<MessageHandler> = new Set();
  private binaryListeners: Set<BinaryFrameHandler> = new Set();
  private statusListeners: Set<(connected: boolean, ping: number, authenticated: boolean) => void> = new Set();
  private pingInterval: any = null;
  private currentPing: number = 0;
  private autoReconnect: boolean = true;

  constructor() {}

  public connect(hostIp: string, pin: string = '', port: number = 8765) {
    this.autoReconnect = true;
    this.pin = pin.trim();
    const cleanIp = hostIp.trim().replace(/^http:\/\//, '').replace(/:.*$/, '');
    this.url = `ws://${cleanIp}:${port}`;
    this.disconnect(false);

    try {
      this.ws = new WebSocket(this.url);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        this.isConnected = true;
        this.startPing();
        if (this.pin) {
          this.send({ t: 'auth', pin: this.pin });
        }
      };

      this.ws.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          if (this.isAuthenticated) {
            this.binaryListeners.forEach(listener => listener(event.data));
          }
          return;
        }

        try {
          const parsed = JSON.parse(event.data);
          
          if (parsed.type === 'auth_required') {
            if (this.pin) {
              this.send({ t: 'auth', pin: this.pin });
            } else {
              this.isAuthenticated = false;
              this.notifyStatus();
            }
          } else if (parsed.type === 'auth_success') {
            this.isAuthenticated = true;
            this.triggerHaptic(Haptics.NotificationFeedbackType.Success);
            this.notifyStatus();
          } else if (parsed.type === 'auth_failed') {
            this.isAuthenticated = false;
            this.triggerHaptic(Haptics.NotificationFeedbackType.Error);
            this.notifyStatus();
          } else if (parsed.type === 'pong' && parsed.ts) {
            this.currentPing = Date.now() - parsed.ts;
            this.notifyStatus();
          } else {
            this.messageListeners.forEach(listener => listener(parsed));
          }
        } catch (e) {
          // ignore non-json
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.isAuthenticated = false;
        this.stopPing();
        this.notifyStatus();
        if (this.autoReconnect) {
          setTimeout(() => this.connect(cleanIp, this.pin, port), 1500);
        }
      };

      this.ws.onerror = () => {
        this.isConnected = false;
        this.isAuthenticated = false;
        this.notifyStatus();
      };

    } catch (e) {
      this.isConnected = false;
      this.isAuthenticated = false;
      this.notifyStatus();
    }
  }

  public disconnect(stopReconnect: boolean = true) {
    if (stopReconnect) this.autoReconnect = false;
    this.stopPing();
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {}
      this.ws = null;
    }
    this.isConnected = false;
    this.isAuthenticated = false;
    this.notifyStatus();
  }

  public setPin(newPin: string) {
    this.pin = newPin.trim();
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({ t: 'auth', pin: this.pin });
    }
  }

  public send(payload: object) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  public triggerHaptic(type: Haptics.ImpactFeedbackStyle | Haptics.NotificationFeedbackType = Haptics.ImpactFeedbackStyle.Light) {
    try {
      if (typeof type === 'string' && ['light', 'medium', 'heavy'].includes(type)) {
        Haptics.impactAsync(type as Haptics.ImpactFeedbackStyle);
      } else {
        Haptics.notificationAsync(type as Haptics.NotificationFeedbackType);
      }
    } catch (e) {}
  }

  private startPing() {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      if (this.isConnected) {
        this.send({ t: 'ping', ts: Date.now() });
      }
    }, 1500);
  }

  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  public onStatusChange(callback: (connected: boolean, ping: number, authenticated: boolean) => void) {
    this.statusListeners.add(callback);
    callback(this.isConnected, this.currentPing, this.isAuthenticated);
    return () => this.statusListeners.delete(callback);
  }

  public onBinaryFrame(callback: BinaryFrameHandler) {
    this.binaryListeners.add(callback);
    return () => this.binaryListeners.delete(callback);
  }

  public onMessage(callback: MessageHandler) {
    this.messageListeners.add(callback);
    return () => this.messageListeners.delete(callback);
  }

  private notifyStatus() {
    this.statusListeners.forEach(cb => cb(this.isConnected, this.currentPing, this.isAuthenticated));
  }

  public getIsConnected() {
    return this.isConnected;
  }

  public getIsAuthenticated() {
    return this.isAuthenticated;
  }
}

export const wsService = new WebSocketService();
