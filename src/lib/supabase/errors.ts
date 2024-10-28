export class ConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConnectionError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export function handleError(error: unknown): Error {
  if (!navigator.onLine) {
    return new ConnectionError('No internet connection. Please check your network.');
  }

  if (error instanceof Error) {
    if (error.message.includes('Failed to fetch')) {
      return new ConnectionError('Unable to connect to the server. Please try again later.');
    }
    
    if (error.message.includes('JWT')) {
      return new AuthenticationError('Your session has expired. Please log in again.');
    }

    if (error.message.includes('PGRST116')) {
      return new NotFoundError('The requested resource was not found.');
    }

    return error;
  }

  return new Error('An unexpected error occurred. Please try again.');
}