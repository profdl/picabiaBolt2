import { Shape } from "../../../types";
import { useProcessedImageSubscription } from "../../../hooks/useProcessedImageSubscription";
import { useStore } from "../../../store";
import { useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";

interface ProcessedShapeProps {
  shape: Shape;
  type: "depth" | "edge" | "pose";
}

// Include the LoadingPlaceholder component directly to avoid import issues
const LoadingPlaceholder: React.FC<{ isGenerating: boolean; logs?: string[] }> = ({ isGenerating, logs }) => {
  // Process logs to preserve all content
  const getProcessedLogs = (logs: string[] | string | undefined) => {
    if (!logs) return [];
    return typeof logs === 'string' ? logs.split('\n') : logs;
  };

  const processedLogs = getProcessedLogs(logs);
  const logsRef = useRef<HTMLPreElement>(null);
  
  // Detect server state from logs
  const getServerState = (logs: string[]) => {
    const lastLogs = logs.join(' ');
    if (lastLogs.includes('Starting server')) {
      return 'Server is starting up...';
    }
    if (lastLogs.includes('queue_full') || lastLogs.includes('in queue')) {
      return 'Waiting in queue...';
    }
    return isGenerating ? 'Generating...' : 'Processing...';
  };

  // Auto-scroll to bottom when logs update
  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [processedLogs]);
  
  return (
    <div className="flex flex-col items-stretch w-full h-full bg-[#1C1C1C] rounded-lg p-3">
      <div className="flex-grow flex flex-col items-center justify-center">
        <div className="flex items-center justify-center mb-2">
          <Loader2 className="w-5 h-5 animate-spin text-blue-400 mr-2" />
          <span className="text-[14px] font-medium text-gray-400">
            {getServerState(processedLogs)}
          </span>
        </div>
      </div>
      <pre 
        ref={logsRef}
        className="bg-[#151515] text-gray-400 px-6 py-3 m-0 text-[16px] leading-7 font-sans overflow-x-hidden overflow-y-scroll scrollbar-none whitespace-pre-wrap break-all h-[120px]"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {processedLogs.length > 0 ? processedLogs.map((log, i) => {
          // Highlight important server states in the logs
          const isServerBoot = log.includes('Starting server');
          const isQueueState = log.includes('queue_full') || log.includes('in queue');
          const className = isServerBoot || isQueueState ? 'text-blue-400 font-medium' : '';
          
          // Split each log entry into lines and add breaks
          const lines = log.split('\n');
          return (
            <div key={i} className={className}>
              {lines.map((line, j) => (
                <div key={`${i}-${j}`} className="mb-3">
                  {line}
                </div>
              ))}
              {i < processedLogs.length - 1 && <div className="mb-6" />}
            </div>
          );
        }) : 'Waiting for A.I. to start...'}
      </pre>
    </div>
  );
};

export const ProcessedShape: React.FC<ProcessedShapeProps> = ({ shape, type }) => {
  // Get generatingPredictions from store
  const { generatingPredictions } = useStore(state => ({
    generatingPredictions: state.generatingPredictions
  }));
  
  // Check if this shape is currently being generated
  const isGenerating = generatingPredictions.has(shape.id);
  
  // Use the subscription hook for the specific process type
  useProcessedImageSubscription(shape.id, shape.sourceImageId, type);

  // Get the appropriate URL based on the type
  const urlKey = `${type}Url` as keyof Shape;
  const processedUrl = shape[urlKey] as string | undefined;

  if (shape.isUploading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <LoadingPlaceholder isGenerating={isGenerating} logs={shape.logs} />
      </div>
    );
  }

  if (!processedUrl) {
    return null;
  }

  return (
    <img
      src={processedUrl}
      alt={`${type} processed image`}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        position: 'absolute',
        top: 0,
        left: 0
      }}
    />
  );
}; 