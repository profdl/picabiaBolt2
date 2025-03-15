interface ComfyUIResponse {
  prompt_id?: string;
  number?: number;
  node_errors?: Record<string, string>;
  error?: string | {
    type: string;
    message: string;
    details: string;
    extra_info: Record<string, unknown>;
  };
}

interface ComfyUIHistoryResponse {
  [key: string]: {
    outputs: {
      images: Array<{
        filename: string;
        subfolder: string;
        type: string;
      }>;
    };
    prompt: unknown;
    outputs_waiting: number;
  };
}

interface ComfyUIWorkflow {
  [key: string]: {
    inputs: Record<string, unknown>;
    class_type: string;
  };
}

const COMFYUI_URL = import.meta.env.VITE_COMFYUI_URL || 'http://127.0.0.1:8188';
const WS_URL = COMFYUI_URL.replace(/^http/, 'ws');

// Helper function to fetch image as blob
async function fetchImageAsBlob(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  return response.blob();
}

// Helper function to upload image to ComfyUI
async function uploadImageToComfyUI(imageBlob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append('image', imageBlob, 'image.png');
  
  const uploadResponse = await fetch(`${COMFYUI_URL}/upload/image`, {
    method: 'POST',
    body: formData
  });

  if (!uploadResponse.ok) {
    throw new Error(`Failed to upload image: ${uploadResponse.statusText}`);
  }

  const uploadResult = await uploadResponse.json();
  return uploadResult.name;
}

// Helper function to process workflow and upload images
async function processWorkflow(workflow: ComfyUIWorkflow): Promise<ComfyUIWorkflow> {
  const processedWorkflow = { ...workflow };
  const imageNodes = ['12', '17', '33', '37', '40']; // Node IDs that might contain image URLs
  const ipAdapterPattern = /^17_\d+$/; // Pattern for IP Adapter image nodes

  for (const [nodeId, node] of Object.entries(processedWorkflow)) {
    if (
      (imageNodes.includes(nodeId) || ipAdapterPattern.test(nodeId)) &&
      node.class_type === 'LoadImage' &&
      typeof node.inputs.image === 'string' &&
      node.inputs.image.startsWith('http')
    ) {
      try {
        console.log(`Processing image for node ${nodeId}:`, node.inputs.image);
        const imageBlob = await fetchImageAsBlob(node.inputs.image);
        const uploadedImageName = await uploadImageToComfyUI(imageBlob);
        
        node.inputs = {
          ...node.inputs,
          image: uploadedImageName,
          'image-upload': false
        };
      } catch (error) {
        console.error(`Failed to process image for node ${nodeId}:`, error);
        throw new Error(`Failed to process image for node ${nodeId}`);
      }
    }
  }

  return processedWorkflow;
}

// Helper function to wait for WebSocket messages
function waitForWebSocketMessage(ws: WebSocket, promptId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('WebSocket timeout after 2 minutes'));
    }, 2 * 60 * 1000); // 2 minutes timeout

    let isExecuting = false;
    let lastProgressTime = Date.now();

    // Add connection status logging
    ws.onopen = () => {
      console.log('WebSocket connection opened');
      // Subscribe to updates
      ws.send(JSON.stringify({
        type: "subscribe",
        data: {
          channel: "status"
        }
      }));
    };

    ws.onmessage = async (event) => {
      // Reset progress timeout on any message
      lastProgressTime = Date.now();

      let data;
      try {
        data = JSON.parse(event.data);
      } catch (error) {
        console.log('Received binary message, length:', event.data.length);
        return; // Ignore binary messages
      }

      console.log('WebSocket message:', {
        type: data.type,
        data: JSON.stringify(data.data).slice(0, 200) + '...' // Truncate long data
      });

      switch (data.type) {
        case 'status':
          console.log('Status update:', data.data.status);
          if (data.data.status.exec_info) {
            console.log('Execution info:', data.data.status.exec_info);
          }
          break;

        case 'progress':
          console.log(`Generation progress: ${data.data.value}%`);
          break;

        case 'executing':
          if (data.data.prompt_id === promptId) {
            console.log('Executing node:', data.data.node);
            isExecuting = true;
            if (data.data.node === null) {
              console.log('All nodes completed execution');
              isExecuting = false;
              await checkHistory();
            }
          }
          break;

        case 'executed':
          if (data.data.prompt_id === promptId) {
            console.log('Node execution completed:', data.data.node);
            // Wait a short moment for the final node to complete
            setTimeout(checkHistory, 1000);
          }
          break;

        case 'execution_start':
          if (data.data.prompt_id === promptId) {
            console.log('Workflow execution started');
            isExecuting = true;
          }
          break;

        case 'execution_error':
          if (data.data.prompt_id === promptId) {
            console.error('Execution error:', data.data.exception_message);
            clearTimeout(timeout);
            ws.close();
            reject(new Error(`ComfyUI execution error: ${data.data.exception_message}`));
          }
          break;
      }

      // Check for progress timeout
      if (Date.now() - lastProgressTime > 30000) { // 30 seconds
        console.warn('No progress updates received for 30 seconds');
        await checkHistory(); // Try checking history anyway
      }
    };

    async function checkHistory() {
      try {
        console.log('Checking history for prompt:', promptId);
        const historyResponse = await fetch(`${COMFYUI_URL}/history/${promptId}`);
        const history = await historyResponse.json();
        console.log('History response:', history);
        
        if (history?.outputs?.images?.length > 0) {
          const image = history.outputs.images[0];
          const outputUrl = `${COMFYUI_URL}/view?filename=${image.filename}&subfolder=${image.subfolder || ''}&type=output`;
          console.log('Found output image URL:', outputUrl);

          // Verify the image is accessible
          const imageResponse = await fetch(outputUrl);
          if (imageResponse.ok) {
            console.log('Image is accessible');
            clearTimeout(timeout);
            ws.close();
            resolve(outputUrl);
          } else {
            console.log('Image not yet accessible, status:', imageResponse.status);
            if (!isExecuting) {
              reject(new Error('Failed to access generated image'));
            }
          }
        } else if (!isExecuting) {
          console.log('No images found and not executing');
          reject(new Error('Generation completed but no image was produced'));
        }
      } catch (error) {
        console.error('Error checking history:', error);
        if (!isExecuting) {
          reject(error);
        }
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      clearTimeout(timeout);
      ws.close();
      reject(new Error(`WebSocket error: ${error.type}`));
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
      clearTimeout(timeout);
      if (isExecuting) {
        reject(new Error('WebSocket connection closed while still executing'));
      }
    };

    // Set up a periodic check
    const progressInterval = setInterval(async () => {
      if (isExecuting) {
        await checkHistory();
      }
    }, 5000); // Check every 5 seconds

    // Clean up interval on resolve/reject
    const cleanupInterval = () => clearInterval(progressInterval);
    const originalResolve = resolve;
    const originalReject = reject;
    
    resolve = (value: string | PromiseLike<string>) => {
      cleanupInterval();
      originalResolve(value);
    };
    
    reject = (reason: Error) => {
      cleanupInterval();
      originalReject(reason);
    };
  });
}

export async function generateImageWithComfyUI(workflowJson: string): Promise<string> {
  let ws: WebSocket | null = null;
  
  try {
    console.log('Attempting to connect to ComfyUI at:', COMFYUI_URL);
    
    // Parse the workflow JSON if it's a string
    let workflow: ComfyUIWorkflow;
    try {
      workflow = typeof workflowJson === 'string' ? JSON.parse(workflowJson) : workflowJson;
    } catch (error) {
      console.error('Failed to parse workflow JSON:', error);
      throw new Error('Invalid workflow JSON');
    }

    // Process the workflow and upload images
    workflow = await processWorkflow(workflow);

    console.log('Processed workflow being sent:', JSON.stringify(workflow, null, 2));

    // Connect to WebSocket before queueing the prompt
    ws = new WebSocket(`${WS_URL}/ws`);
    await new Promise<void>((resolve, reject) => {
      ws!.onopen = () => resolve();
      ws!.onerror = () => reject(new Error('Failed to connect to WebSocket'));
    });

    // Queue the prompt
    const response = await fetch(`${COMFYUI_URL}/prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: workflow,
        client_id: crypto.randomUUID()
      }),
    });

    console.log('ComfyUI Response Status:', response.status);
    const responseText = await response.text();
    console.log('ComfyUI Raw Response:', responseText);

    if (!response.ok) {
      throw new Error(`Failed to queue prompt: ${responseText}`);
    }

    let data: ComfyUIResponse;
    try {
      data = JSON.parse(responseText);
    } catch (error) {
      const parseError = error as Error;
      throw new Error(`Failed to parse ComfyUI response: ${parseError.message}`);
    }
    
    // Check for errors in the response
    if (data.error) {
      const errorMessage = typeof data.error === 'string' 
        ? data.error 
        : `${data.error.type}: ${data.error.message}${data.error.details ? ` - ${data.error.details}` : ''}`;
      throw new Error(`ComfyUI Error: ${errorMessage}`);
    }

    if (!data.prompt_id) {
      throw new Error('No prompt ID received from ComfyUI');
    }

    const promptId = data.prompt_id;
    console.log('Received prompt ID:', promptId);

    // Wait for the generation to complete via WebSocket
    return await waitForWebSocketMessage(ws, promptId);
  } catch (error) {
    const err = error as Error;
    console.error('Error in ComfyUI generation:', {
      error: err.message,
      stack: err.stack,
      url: COMFYUI_URL
    });
    throw err;
  } finally {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  }
}

export async function isComfyUIAvailable(): Promise<boolean> {
  try {
    console.log('Checking ComfyUI availability at:', COMFYUI_URL);
    const response = await fetch(`${COMFYUI_URL}/system_stats`);
    const available = response.ok;
    console.log('ComfyUI availability:', available);
    return available;
  } catch (error) {
    const err = error as Error;
    console.error('Error checking ComfyUI availability:', {
      error: err.message,
      url: COMFYUI_URL
    });
    return false;
  }
} 