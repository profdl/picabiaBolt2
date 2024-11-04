import { PredictionSocket } from './websocket';

export async function generateImage(
  workflowJson: string,
  inputImage?: string,
  outputFormat: 'webp' | 'jpg' | 'png' = 'webp',
  outputQuality: number = 95,
  randomiseSeeds: boolean = true,
): Promise<string> {
  // Start prediction with webhook URL
  const response = await fetch('/.netlify/functions/start-prediction', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      workflow_json: workflowJson,
      input_file: inputImage,
      webhook: `${window.location.origin}/.netlify/functions/webhook-handler`,
      webhook_events_filter: ["completed"]
    }),
  });

  const { predictionId } = await response.json();

  // Wait for webhook update via WebSocket
  return new Promise((resolve, reject) => {
    const socket = new PredictionSocket(predictionId, (data) => {
      if (data.status === 'succeeded') {
        resolve(data.output);
      }
      if (data.status === 'failed') {
        reject(new Error(data.error));
      }
    });
  });
}