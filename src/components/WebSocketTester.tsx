import { useState, useEffect } from 'react';

export function WebSocketTester() {
    const [messages, setMessages] = useState<string[]>([]);
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
    const [retryCount, setRetryCount] = useState(0);
    const MAX_RETRIES = 3;

    const connect = () => {
        const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/.netlify/functions/websocket-handler`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            setStatus('connected');
            setRetryCount(0);
            setMessages(prev => [...prev, '✅ Connected to WebSocket']);
            ws.send(JSON.stringify({
                type: 'subscribe',
                predictionId: 'test123'
            }));
        };

        ws.onmessage = (event) => {
            setMessages(prev => [...prev, `📥 Received: ${event.data}`]);
        };

        ws.onerror = () => {
            setStatus('disconnected');
            setMessages(prev => [...prev, '❌ Connection error']);
        };

        ws.onclose = () => {
            setStatus('disconnected');
            setMessages(prev => [...prev, '🔌 Connection closed']);

            if (retryCount < MAX_RETRIES) {
                setRetryCount(prev => prev + 1);
                setTimeout(connect, 1000 * Math.pow(2, retryCount));
            }
        };

        setSocket(ws);
    };

    useEffect(() => {
        connect();
        return () => socket?.close();
    }, []);

    return (
        <div className="p-4 bg-secondary-light dark:bg-secondary-dark rounded-lg">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl">WebSocket Tester</h2>
                <div className={`px-3 py-1 rounded-full ${status === 'connected' ? 'bg-green-500' :
                    status === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
                    } text-white text-sm`}>
                    {status}
                </div>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
                {messages.map((msg, i) => (
                    <div key={i} className="p-2 bg-primary-light dark:bg-primary-dark rounded">
                        {msg}
                    </div>
                ))}
            </div>
        </div>
    );
}
