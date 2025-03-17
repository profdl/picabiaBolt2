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
const INSECURE = import.meta.env.VITE_COMFYUI_INSECURE === 'true';
// For WebSocket connections, we need to use the /ws endpoint
const WS_URL = `${COMFYUI_URL.replace(/^https?/, COMFYUI_URL.startsWith('https') ? 'wss' : 'ws')}/ws?clientId=${crypto.randomUUID()}`;

// Helper function to create fetch options with proper CORS settings
function createFetchOptions(options: RequestInit = {}): RequestInit {
  return {
    ...options,
    mode: 'cors',
    credentials: 'omit',
    headers: {
      ...options.headers,
    }
  };
}

// Helper function to fetch with proper error handling
async function fetchWithErrorHandling(url: string, options: RequestInit = {}) {
  try {
    const response = await fetch(url, createFetchOptions(options));
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}

// Helper function to fetch image as blob
async function fetchImageAsBlob(url: string): Promise<Blob> {
  console.log('Fetching image from URL:', url);
  const response = await fetchWithErrorHandling(url);
  const blob = await response.blob();
  console.log('Image fetched, size:', blob.size);
  return blob;
}

// Helper function to upload image to ComfyUI
async function uploadImageToComfyUI(imageBlob: Blob): Promise<string> {
  console.log('Uploading image to ComfyUI, size:', imageBlob.size);
  const formData = new FormData();
  formData.append('image', imageBlob, 'image.png');
  
  const response = await fetchWithErrorHandling(`${COMFYUI_URL}/upload/image`, {
    method: 'POST',
    body: formData
  });

  const uploadResult = await response.json();
  console.log('Upload response:', uploadResult);
  return uploadResult.name;
}

// Helper function to process workflow and upload images
async function processWorkflow(workflow: ComfyUIWorkflow): Promise<ComfyUIWorkflow> {
  console.log('Starting workflow processing');
  const processedWorkflow = { ...workflow };
  
  // Find the last node that outputs images
  const lastImageNode = Object.entries(processedWorkflow)
    .find(([_, node]) => 
      node.class_type === 'VAEDecode' || 
      node.class_type === 'PreviewImage' ||
      node.class_type === 'SaveImage'
    );

  if (lastImageNode) {
    // Add a SaveImage node if it doesn't exist
    const saveImageNodeId = 'save_image_websocket';
    if (!processedWorkflow[saveImageNodeId]) {
      processedWorkflow[saveImageNodeId] = {
        class_type: 'SaveImage',
        inputs: {
          images: [lastImageNode[0], 0]  // Connect to the last image node's output
        }
      };
      console.log('Added SaveImage node:', saveImageNodeId);
    }
  }

  // Process image uploads
  for (const [nodeId, node] of Object.entries(processedWorkflow)) {
    console.log(`Processing node ${nodeId}:`, {
      class_type: node.class_type,
      inputs: node.inputs
    });

    if (node.class_type === 'LoadImage' && 
        typeof node.inputs.image === 'string' &&
        node.inputs.image.startsWith('http')) {
      try {
        console.log(`Downloading image for node ${nodeId}:`, node.inputs.image);
        const imageBlob = await fetchImageAsBlob(node.inputs.image);
        console.log(`Image downloaded for node ${nodeId}, size:`, imageBlob.size);
        
        console.log(`Uploading image for node ${nodeId} to ComfyUI`);
        const uploadedImageName = await uploadImageToComfyUI(imageBlob);
        console.log(`Image uploaded for node ${nodeId}, name:`, uploadedImageName);
        
        node.inputs = {
          ...node.inputs,
          image: uploadedImageName,
          'image-upload': false
        };
        console.log(`Updated node ${nodeId} inputs:`, node.inputs);
      } catch (error) {
        console.error(`Failed to process image for node ${nodeId}:`, error);
        throw new Error(`Failed to process image for node ${nodeId}: ${(error as Error).message}`);
      }
    }
  }

  console.log('Workflow processing completed');
  return processedWorkflow;
}

// Helper function to get image data using multiple endpoints
async function getImageFromComfyUI(image: { filename: string; subfolder: string }, retryCount = 0): Promise<string> {
  const MAX_RETRIES = 3;
  const endpoints = [
    // Try view endpoint first
    () => `${COMFYUI_URL}/view?filename=${encodeURIComponent(image.filename)}&subfolder=${encodeURIComponent(image.subfolder || '')}&type=output`,
    // Then try direct output endpoint
    () => `${COMFYUI_URL}/output/${encodeURIComponent(image.subfolder || '')}/${encodeURIComponent(image.filename)}`,
    // Finally try view endpoint with different type
    () => `${COMFYUI_URL}/view?filename=${encodeURIComponent(image.filename)}&subfolder=${encodeURIComponent(image.subfolder || '')}&type=temp`
  ];

  if (retryCount >= endpoints.length * MAX_RETRIES) {
    throw new Error('Failed to retrieve image after all retries');
  }

  const endpointIndex = Math.floor(retryCount / MAX_RETRIES);
  const url = endpoints[endpointIndex]();
  
  try {
    console.log(`Attempting to fetch image (attempt ${retryCount + 1}) from:`, url);
    const response = await fetchWithErrorHandling(url);
    const contentType = response.headers.get('content-type');
    
    if (!contentType?.startsWith('image/')) {
      console.warn('Response is not an image:', {
        contentType,
        status: response.status,
        url
      });
      throw new Error('Response is not an image');
    }

    const blob = await response.blob();
    if (blob.size === 0) {
      throw new Error('Empty image blob received');
    }

    console.log('Successfully retrieved image:', {
      size: blob.size,
      type: blob.type,
      url
    });

    return url;
  } catch (error) {
    console.warn(`Failed to fetch image (attempt ${retryCount + 1}):`, error);
    // Wait a short time before retrying
    await new Promise(resolve => setTimeout(resolve, 1000));
    return getImageFromComfyUI(image, retryCount + 1);
  }
}

// Helper function to wait for WebSocket messages
function waitForWebSocketMessage(ws: WebSocket, promptId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('WebSocket timeout after 10 minutes'));
    }, 10 * 60 * 1000); // 10 minutes timeout

    let isExecuting = false;
    let lastProgressTime = Date.now();
    let lastProgressValue = 0;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 3;

    async function checkHistory() {
      try {
        console.log('Checking history for prompt:', promptId);
        const historyResponse = await fetchWithErrorHandling(`${COMFYUI_URL}/history`);
        const history: ComfyUIHistoryResponse = await historyResponse.json();
        console.log('Full history response:', history);
        
        const promptHistory = history[promptId];
        if (!promptHistory) {
          console.log('No history found for prompt ID:', promptId);
          if (!isExecuting) {
            reject(new Error('No history found for this generation'));
          }
          return;
        }
        
        console.log('History for current prompt:', {
          hasOutputs: !!promptHistory.outputs,
          imageCount: promptHistory.outputs?.images?.length || 0,
          outputsWaiting: promptHistory.outputs_waiting,
          fullOutputs: promptHistory.outputs
        });
        
        if (promptHistory?.outputs?.images?.length > 0) {
          const image = promptHistory.outputs.images[0];
          console.log('Found image in history:', image);
          
          try {
            // Try to get the image URL using our retry mechanism
            const imageUrl = await getImageFromComfyUI(image);
            console.log('Successfully retrieved image URL:', imageUrl);
            
            clearTimeout(timeout);
            ws.close();
            resolve(imageUrl);
            return;
          } catch (error) {
            console.error('Error accessing image:', error);
            if (!isExecuting) {
              reject(new Error(`Failed to access generated image: ${(error as Error).message}`));
              return;
            }
          }
        } else if (promptHistory?.outputs_waiting === 0 && !isExecuting) {
          console.log('No images found and no outputs waiting');
          reject(new Error('Generation completed but no image was produced'));
          return;
        } else {
          console.log('Still waiting for outputs:', {
            outputs_waiting: promptHistory?.outputs_waiting,
            isExecuting,
            hasOutputs: !!promptHistory.outputs,
            imageCount: promptHistory.outputs?.images?.length || 0
          });
        }
      } catch (error) {
        console.error('Error checking history:', error);
        if (!isExecuting) {
          reject(error);
          return;
        }
      }
    }

    // Helper function to check queue status
    async function checkQueueStatus() {
      try {
        const response = await fetchWithErrorHandling(`${COMFYUI_URL}/queue`);
        const queueData = await response.json();
        console.log('Queue status:', queueData);
        
        // Check if our prompt is in the queue
        const queueItem = queueData.queue_running.find((item: any) => item.prompt_id === promptId) ||
                         queueData.queue_pending.find((item: any) => item.prompt_id === promptId);
        
        if (queueItem) {
          console.log('Prompt still in queue:', {
            promptId,
            status: queueItem.status,
            executionTime: queueItem.execution_time,
            nodeErrors: queueItem.node_errors
          });
        } else {
          console.log('Prompt not found in queue, checking history...');
          await checkHistory();
        }
      } catch (error) {
        console.warn('Error checking queue status:', error);
      }
    }

    function setupWebSocket() {
      // Add connection status logging
      ws.onopen = () => {
        console.log('WebSocket connection opened, client ID:', WS_URL.split('clientId=')[1]);
        reconnectAttempts = 0;
        
        // Subscribe to all necessary channels
        const subscriptions = [
          { type: "subscribe", data: { channel: "status" } },
          { type: "subscribe", data: { channel: "progress" } },
          { type: "subscribe", data: { channel: "executing" } },
          { type: "subscribe", data: { channel: "executed" } }
        ];
        
        subscriptions.forEach(sub => {
          console.log('Sending subscription for channel:', sub.data.channel);
          ws.send(JSON.stringify(sub));
        });
      };

      ws.onmessage = async (event) => {
        lastProgressTime = Date.now();

        // Handle binary messages (image data)
        if (event.data instanceof Blob) {
          console.log('Received binary data, size:', event.data.size);
          // Convert blob to base64
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(event.data);
          });
          console.log('Image received via WebSocket');
          resolve(base64);
          return;
        }

        // Handle text messages
        let data;
        try {
          data = JSON.parse(event.data);
          console.log('Received WebSocket message:', {
            type: data.type,
            dataPreview: typeof data.data === 'string' ? 
              data.data.slice(0, 100) : 
              JSON.stringify(data.data).slice(0, 100),
            promptId: data.data?.prompt_id
          });
        } catch (error) {
          console.warn('Failed to parse WebSocket message:', error);
          return;
        }

        switch (data.type) {
          case 'status':
            try {
              const statusData = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
              console.log('Status update:', statusData);
              
              if (statusData.status?.exec_info) {
                if (statusData.status.exec_info.queue_remaining !== undefined) {
                  console.log('Queue remaining:', statusData.status.exec_info.queue_remaining);
                }
              }
            } catch (error) {
              console.warn('Failed to parse status message:', error);
            }
            break;

          case 'progress':
            if (data.data.value > lastProgressValue) {
              lastProgressValue = data.data.value;
              console.log(`Generation progress: ${data.data.value}/${data.data.max}`);
            }
            break;

          case 'executing':
            if (data.data.prompt_id === promptId) {
              console.log('Executing node:', data.data.node);
              isExecuting = true;
              if (data.data.node === null) {
                console.log('Execution completed');
                isExecuting = false;
              }
            }
            break;

          case 'executed':
            if (data.data.prompt_id === promptId) {
              console.log('Node execution completed:', data.data.node);
              
              // Parse the output data if it's a string
              const outputData = typeof data.data.output === 'string' ? 
                JSON.parse(data.data.output) : data.data.output;
              
              console.log('Node output data:', outputData);
              
              // Check if this execution produced images
              if (outputData?.images?.length > 0) {
                const image = outputData.images[0];
                console.log('Found image in execution output:', image);
                
                try {
                  // Try to get the image URL using our retry mechanism
                  const imageUrl = await getImageFromComfyUI({
                    filename: image.filename,
                    subfolder: image.subfolder || ''
                  });
                  console.log('Successfully retrieved image URL:', imageUrl);
                  
                  // Resolve the promise with the image URL
                  resolve(imageUrl);
                } catch (error) {
                  console.error('Error accessing image:', error);
                  if (!isExecuting) {
                    reject(new Error(`Failed to access generated image: ${(error as Error).message}`));
                  }
                }
              }
            }
            break;
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        if (isExecuting && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          console.log(`Attempting to reconnect (${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})...`);
          reconnectAttempts++;
          ws = new WebSocket(WS_URL);
          setupWebSocket();
        } else if (isExecuting) {
          reject(new Error('WebSocket connection lost while still executing'));
        }
      };
    }

    // Initial WebSocket setup
    setupWebSocket();

    // Set up a periodic check
    const progressInterval = setInterval(async () => {
      if (isExecuting) {
        await Promise.all([
          checkHistory(),
          checkQueueStatus()
        ]).catch(error => {
          console.warn('Error during periodic check:', error);
        });
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
    console.log('Using WebSocket URL:', WS_URL);
    
    // Parse the workflow JSON if it's a string
    let workflow: ComfyUIWorkflow;
    try {
      workflow = typeof workflowJson === 'string' ? JSON.parse(workflowJson) : workflowJson;
      console.log('Parsed workflow:', JSON.stringify(workflow, null, 2));
    } catch (error) {
      console.error('Failed to parse workflow JSON:', error);
      throw new Error('Invalid workflow JSON');
    }

    // Process the workflow and upload images
    workflow = await processWorkflow(workflow);

    // Connect to WebSocket before queueing the prompt
    ws = new WebSocket(WS_URL);
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws?.close();
        reject(new Error('WebSocket connection timeout after 30 seconds'));
      }, 30000); // 30 second connection timeout

      ws!.onopen = () => {
        clearTimeout(timeout);
        resolve();
      };
      ws!.onerror = (error) => {
        clearTimeout(timeout);
        console.error('WebSocket connection error:', error);
        reject(new Error('Failed to connect to WebSocket'));
      };
    });

    // Queue the prompt with proper CORS headers
    console.log('Queueing workflow to ComfyUI:', {
      url: `${COMFYUI_URL}/prompt`,
      workflowNodeCount: Object.keys(workflow).length,
      workflow: JSON.stringify(workflow).slice(0, 200) + '...' // Log first 200 chars
    });

    const response = await fetchWithErrorHandling(`${COMFYUI_URL}/prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: workflow,
        client_id: WS_URL.split('clientId=')[1],
        extra_data: {
          preview: {
            output_node: Object.entries(workflow)
              .find(([_, node]) => node.class_type === 'SaveImage')?.[0]
          }
        }
      }),
    });

    const responseText = await response.text();
    console.log('ComfyUI Queue Response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      responseText: responseText.slice(0, 200) + '...' // Log first 200 chars
    });

    let data: ComfyUIResponse;
    try {
      data = JSON.parse(responseText);
      console.log('Parsed response data:', data);
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
      url: COMFYUI_URL,
      wsUrl: WS_URL
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
    const response = await fetchWithErrorHandling(`${COMFYUI_URL}/system_stats`);
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