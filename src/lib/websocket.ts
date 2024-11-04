export class PredictionSocket {
    private socket: WebSocket | null = null;
    private predictionId: string;
    private onUpdate: (data: any) => void;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;

    constructor(predictionId: string, onUpdate: (data: any) => void) {
        this.predictionId = predictionId;
        this.onUpdate = onUpdate;
        this.connect();
    }

    private connect() {
        const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/.netlify/functions/websocket-handler`;
        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => {
            this.reconnectAttempts = 0;
            this.socket?.send(JSON.stringify({
                type: 'subscribe',
                predictionId: this.predictionId
            }));
        };

        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.status === 'succeeded' || data.status === 'failed') {
                this.onUpdate(data);
                this.close();
            }
        };

        this.socket.onclose = () => {
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                setTimeout(() => this.connect(), 1000 * Math.pow(2, this.reconnectAttempts));
            }
        };
    }

    close() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }
}