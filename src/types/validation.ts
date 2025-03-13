export interface ValidationRule<T = unknown> {
  validate: (value: T) => boolean;
  message: string;
  field?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
  rule?: string;
}

export interface ValidationSchema<T = unknown> {
  rules: ValidationRule<T>[];
  validate: (data: T) => ValidationResult;
}

export interface ValidationConfig {
  stopOnFirstError?: boolean;
  allowUnknownFields?: boolean;
  stripUnknownFields?: boolean;
}

export interface ValidationContext {
  parent?: unknown;
  path?: string[];
  value?: unknown;
  field?: string;
  config?: ValidationConfig;
} 