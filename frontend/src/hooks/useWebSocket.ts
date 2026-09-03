import { useEffect, useRef, useState } from 'react';

type EventType = 'status' | 'warning' | 'critical';

export interface WSEvent {
  type: EventType;
  [key: string]: any;
}

export const useWebSocket = (url: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<WSEvent | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(url);

    ws.onopen = () => {
      setIsConnected(true);
      console.log('Connected to WS');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastEvent(data);
      } catch (e) {
        console.error('Failed to parse WS message', e);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log('Disconnected from WS');
      // basic reconnect could go here
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [url]);

  const sendMessage = (msg: any) => {
    if (wsRef.current && isConnected) {
      wsRef.current.send(JSON.stringify(msg));
    }
  };

  return { isConnected, lastEvent, sendMessage };
};
