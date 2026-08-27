import { Peer, DataConnection } from 'peerjs';

export interface P2PEvent {
  type: 'DOC_UPDATE' | 'DOC_DELETE' | 'DOC_SAVED' | 'DOC_DELETED' | 'BATCH_SAVED' | 'BATCH_DELETED' | 'FULL_SYNC_REQUEST' | 'FULL_SYNC_RESPONSE' | 'PING';
  collectionName?: string;
  data?: any;
  items?: any[];
  ids?: string[];
  count?: number;
  id?: string;
  payload?: Record<string, any>;
  senderId?: string;
  senderName?: string;
  roomCode?: string;
  timestamp: number;
}

export interface LocalPeerNode {
  nodeId: string;
  deviceName: string;
  role: string;
  lastSeen: number;
}

type P2PDataCallback = (event: P2PEvent) => void;
type P2PStatusCallback = (connectedCount: number, peerId: string, error?: string, localPeers?: LocalPeerNode[]) => void;

class P2PSyncEngine {
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map();
  private peerId: string = '';
  private deviceName: string = '';
  private role: string = 'docente';
  private roomCode: string = 'cde-bezaleel-mesh';
  private onDataCallback: P2PDataCallback | null = null;
  private onStatusCallback: P2PStatusCallback | null = null;
  private isConnected: boolean = false;
  private presenceChannel: BroadcastChannel | null = null;
  
  // Local LAN Mesh state (Zero Internet)
  private localPeers: LocalPeerNode[] = [];
  private lastPolledTimestamp: number = 0;
  private pollIntervalId: any = null;
  private heartbeatIntervalId: any = null;
  private processedEventIds: Set<string> = new Set();

  public init(roomCode?: string, onData?: P2PDataCallback, onStatus?: P2PStatusCallback, roleName?: string) {
    if (roomCode) this.roomCode = roomCode.trim().toLowerCase().replace(/\s+/g, '-');
    if (onData) this.onDataCallback = onData;
    if (onStatus) this.onStatusCallback = onStatus;
    if (roleName) this.role = roleName;

    // Clean existing connections and timers
    this.destroy();

    // Generate unique short ID for this device node
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    this.peerId = `${this.roomCode}-node-${randomSuffix}`;
    this.deviceName = `${this.role === 'admin' ? 'Dirección' : this.role === 'cocinera' ? 'Cocina' : 'Aula'}-${randomSuffix}`;
    this.lastPolledTimestamp = Date.now() - 10000; // start 10s back

    // 1. Setup Local LAN Mesh Hub (Zero Internet - Works on Local Wi-Fi / Hotspot)
    this.joinLocalLanMesh();
    this.startLanPolling();

    // 2. Setup BroadcastChannel for instant browser tab sync
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.presenceChannel = new BroadcastChannel(`cde_p2p_presence_${this.roomCode}`);
        this.presenceChannel.onmessage = (e) => {
          if (!e.data) return;
          if (e.data.type === 'ANNOUNCE_PEER' && e.data.peerId && e.data.peerId !== this.peerId) {
            this.connectToPeer(e.data.peerId);
          } else if (e.data.type === 'REQUEST_PRESENCE' && this.peerId) {
            this.announcePresence();
          } else if (e.data.type === 'BROADCAST_EVENT' && e.data.event) {
            this.handleIncomingEvent(e.data.event);
          }
        };
      } catch (_) {}
    }

    // 3. Setup PeerJS WebRTC (Online Signaling Enhancement)
    try {
      this.peer = new Peer(this.peerId, {
        debug: 0
      });

      this.peer.on('open', () => {
        this.isConnected = true;
        this.notifyStatus();
        this.announcePresence();
        this.requestPresence();
      });

      this.peer.on('connection', (conn) => {
        this.setupConnection(conn);
      });

      this.peer.on('error', (err: any) => {
        // Silently handle expected PeerJS offline / timeout events
        if (err.type === 'peer-unavailable' || err.type === 'disconnected' || err.type === 'network') {
          return;
        }
        this.notifyStatus(err.message);
      });

      this.peer.on('disconnected', () => {
        this.isConnected = false;
        this.notifyStatus();
      });
    } catch (e) {
      // PeerJS may fail gracefully when offline; Local LAN Hub takes over seamlessly!
    }

    this.notifyStatus();
  }

  // --- LOCAL LAN MESH RELAY (Zero Internet) ---

  private async joinLocalLanMesh() {
    try {
      const res = await fetch('/api/mesh/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId: this.peerId,
          deviceName: this.deviceName,
          role: this.role,
          roomCode: this.roomCode
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.peers)) {
          this.localPeers = data.peers;
          this.notifyStatus();
        }
        // If server has a stored mesh snapshot, request it on join
        if (data.hasSnapshot) {
          this.fetchLocalSnapshot();
        }
      }
    } catch (_) {
      // Offline fallback
    }
  }

  private startLanPolling() {
    // Poll for new LAN events every 1.5s
    this.pollIntervalId = setInterval(async () => {
      try {
        const res = await fetch(`/api/mesh/events?roomCode=${encodeURIComponent(this.roomCode)}&since=${this.lastPolledTimestamp}&excludeSender=${encodeURIComponent(this.peerId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.serverTime) {
            this.lastPolledTimestamp = data.serverTime;
          }
          if (Array.isArray(data.events) && data.events.length > 0) {
            for (const evt of data.events) {
              if (evt.id && !this.processedEventIds.has(evt.id)) {
                this.processedEventIds.add(evt.id);
                // Keep set bounded
                if (this.processedEventIds.size > 1000) {
                  const first = this.processedEventIds.values().next().value;
                  if (first) this.processedEventIds.delete(first);
                }
                const formattedEvt: P2PEvent = {
                  type: evt.type,
                  collectionName: evt.payload?.collectionName || evt.type.split('_')[0]?.toLowerCase(),
                  data: evt.payload?.data,
                  items: evt.payload?.items,
                  ids: evt.payload?.ids,
                  id: evt.payload?.id,
                  payload: evt.payload,
                  senderId: evt.senderId,
                  senderName: evt.senderName,
                  roomCode: evt.roomCode,
                  timestamp: evt.timestamp
                };
                this.handleIncomingEvent(formattedEvt);
              }
            }
          }
        }
      } catch (_) {
        // Silent catch for offline LAN fluctuations
      }
    }, 1500);

    // Heartbeat & refresh active peers every 10s
    this.heartbeatIntervalId = setInterval(async () => {
      try {
        const res = await fetch('/api/mesh/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nodeId: this.peerId,
            deviceName: this.deviceName,
            role: this.role,
            roomCode: this.roomCode
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.peers)) {
            this.localPeers = data.peers;
            this.notifyStatus();
          }
        }
      } catch (_) {}
    }, 10000);
  }

  public async fetchLocalSnapshot() {
    try {
      const res = await fetch('/api/mesh/snapshot');
      if (res.ok) {
        const json = await res.json();
        if (json.hasSnapshot && json.data) {
          this.handleIncomingEvent({
            type: 'FULL_SYNC_RESPONSE',
            payload: json.data,
            senderId: 'LAN_HUB',
            timestamp: json.updatedAt || Date.now()
          });
        }
      }
    } catch (_) {}
  }

  public async uploadLocalSnapshot(fullData: any) {
    try {
      await fetch('/api/mesh/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: fullData,
          author: this.deviceName
        })
      });
    } catch (_) {}
  }

  private handleIncomingEvent(evt: P2PEvent) {
    if (this.onDataCallback) {
      this.onDataCallback(evt);
    }
  }

  public requestFullSync() {
    this.broadcast({
      type: 'FULL_SYNC_REQUEST'
    });
    this.fetchLocalSnapshot();
  }

  public getRoomCode(): string {
    return this.roomCode;
  }

  public getLocalPeers(): LocalPeerNode[] {
    return this.localPeers;
  }

  private announcePresence() {
    if (this.presenceChannel && this.peerId) {
      try {
        this.presenceChannel.postMessage({ type: 'ANNOUNCE_PEER', peerId: this.peerId });
      } catch (_) {}
    }
  }

  private requestPresence() {
    if (this.presenceChannel) {
      try {
        this.presenceChannel.postMessage({ type: 'REQUEST_PRESENCE' });
      } catch (_) {}
    }
  }

  private setupConnection(conn: DataConnection) {
    conn.on('open', () => {
      this.connections.set(conn.peer, conn);
      this.notifyStatus();

      // Send ping and request full mesh state sync
      conn.send({
        type: 'FULL_SYNC_REQUEST',
        senderId: this.peerId,
        timestamp: Date.now()
      } as P2PEvent);
    });

    conn.on('data', (data: unknown) => {
      const evt = data as P2PEvent;
      if (evt && evt.type) {
        this.handleIncomingEvent(evt);
      }
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
      this.notifyStatus();
    });

    conn.on('error', () => {
      this.connections.delete(conn.peer);
      this.notifyStatus();
    });
  }

  public connectToPeer(targetPeerId: string) {
    if (!targetPeerId || targetPeerId === this.peerId) return;
    if (this.connections.has(targetPeerId)) return;
    try {
      if (this.peer && !this.peer.destroyed) {
        const conn = this.peer.connect(targetPeerId, { reliable: true });
        this.setupConnection(conn);
      }
    } catch (_) {}
  }

  // Broadcasts to Local LAN Mesh Server + BroadcastChannel + WebRTC Connections
  public broadcast(evt: Omit<P2PEvent, 'senderId' | 'timestamp'>) {
    const eventId = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const fullEvt: P2PEvent = {
      ...evt,
      senderId: this.peerId,
      senderName: this.deviceName,
      roomCode: this.roomCode,
      timestamp: Date.now()
    };

    // 1. Post to Local LAN Mesh Hub (Server relay for Zero Internet Wi-Fi/Hotspot)
    fetch('/api/mesh/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: eventId,
        type: fullEvt.type,
        payload: {
          collectionName: fullEvt.collectionName,
          data: fullEvt.data,
          items: fullEvt.items,
          ids: fullEvt.ids,
          id: fullEvt.id,
          ...fullEvt.payload
        },
        senderId: this.peerId,
        senderName: this.deviceName,
        roomCode: this.roomCode
      })
    }).catch(() => {});

    // 2. Post to Local Browser Tabs via BroadcastChannel
    if (this.presenceChannel) {
      try {
        this.presenceChannel.postMessage({
          type: 'BROADCAST_EVENT',
          event: fullEvt
        });
      } catch (_) {}
    }

    // 3. Post to WebRTC peer connections
    this.connections.forEach((conn) => {
      if (conn.open) {
        try {
          conn.send(fullEvt);
        } catch (_) {}
      }
    });

    // 4. Update local storage event for older browser tabs
    try {
      localStorage.setItem('schoolsync_p2p_sync_event', JSON.stringify(fullEvt));
    } catch (_) {}
  }

  private notifyStatus(error?: string) {
    const effectivePeersCount = Math.max(this.connections.size, this.localPeers.length);
    if (this.onStatusCallback) {
      this.onStatusCallback(effectivePeersCount, this.peerId, error, this.localPeers);
    }
  }

  public getConnectedPeerCount(): number {
    return Math.max(this.connections.size, this.localPeers.length);
  }

  public getPeerId(): string {
    return this.peerId;
  }

  public getDeviceName(): string {
    return this.deviceName;
  }

  public destroy() {
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
    if (this.presenceChannel) {
      try {
        this.presenceChannel.close();
      } catch (_) {}
      this.presenceChannel = null;
    }
    this.connections.forEach((conn) => conn.close());
    this.connections.clear();
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (_) {}
      this.peer = null;
    }
    this.isConnected = false;
    this.localPeers = [];
  }
}

export const p2pEngine = new P2PSyncEngine();

