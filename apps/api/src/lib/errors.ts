export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public readonly details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

/** Raised when a provider's response fails shared-schema validation (spec section 34/35). */
export class InterpretationFailedError extends AppError {
  constructor(message = 'Could not understand that. Please try again.') {
    super(message, 422, 'INTERPRETATION_FAILED');
  }
}

/** Raised when a user exhausts their daily AI budget — protects the shared API key from a runaway client or one heavy user making the app costly for everyone. */
export class QuotaExceededError extends AppError {
  constructor(message = "You've reached today's AI limit — it resets at midnight. Manual logging still works!") {
    super(message, 429, 'QUOTA_EXCEEDED');
  }
}
