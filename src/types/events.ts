export type EventType = 
  | 'user:created'
  | 'user:updated'
  | 'user:deleted'
  | 'project:created'
  | 'project:updated'
  | 'project:deleted'
  | 'shape:created'
  | 'shape:updated'
  | 'shape:deleted'
  | 'image:generated'
  | 'image:processed'
  | 'image:failed'
  | 'workflow:started'
  | 'workflow:completed'
  | 'workflow:failed';

export interface Event<T = unknown> {
  id: string;
  type: EventType;
  timestamp: number;
  data: T;
  userId?: string;
  projectId?: string;
  metadata?: Record<string, unknown>;
}

export interface EventHandler<T = unknown> {
  (event: Event<T>): void | Promise<void>;
}

export interface EventBus {
  subscribe<T>(type: EventType, handler: EventHandler<T>): () => void;
  publish<T>(event: Event<T>): Promise<void>;
  unsubscribe(type: EventType, handler: EventHandler): void;
  unsubscribeAll(): void;
  hasSubscribers(type: EventType): boolean;
}

export interface EventError {
  code: string;
  message: string;
  eventId?: string;
  type?: EventType;
} 