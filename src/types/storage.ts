export interface StorageItem<T> {
  key: string;
  value: T;
  timestamp: number;
  expiresAt?: number;
}

export interface StorageConfig {
  prefix?: string;
  defaultExpiration?: number;
  encryption?: boolean;
}

export interface StorageClient {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, expiresIn?: number): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
  has(key: string): Promise<boolean>;
  getExpiration(key: string): Promise<number | null>;
  setExpiration(key: string, expiresIn: number): Promise<void>;
}

export interface StorageError {
  code: string;
  message: string;
  key?: string;
} 