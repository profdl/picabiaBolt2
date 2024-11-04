import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateImage } from './replicate';
import { PredictionSocket } from './websocket';

describe('Prediction System', () => {
    beforeEach(() => {
        global.fetch = vi.fn();
        global.WebSocket = vi.fn(() => ({
            send: vi.fn(),
            close: vi.fn(),
        }));
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should handle successful prediction', async () => {
        const mockPredictionId = 'test-prediction-123';
        const mockOutput = 'generated-image-url';

        // Mock the initial API call
        global.fetch.mockResolvedValueOnce({
            json: () => Promise.resolve({ predictionId: mockPredictionId }),
        });

        // Start the prediction
        const imagePromise = generateImage('workflow-json');

        // Simulate WebSocket message
        const socket = new PredictionSocket(mockPredictionId, () => { });
        socket.onmessage({
            data: JSON.stringify({
                status: 'succeeded',
                output: mockOutput
            })
        });

        const result = await imagePromise;
        expect(result).toBe(mockOutput);
    });
});
