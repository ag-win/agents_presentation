/** Base class for every error the server raises on purpose. Subclasses carry their HTTP meaning. */
export abstract class AppError extends Error {
  abstract readonly status: number
  abstract readonly code: string

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = new.target.name
  }
}

export class ValidationError extends AppError {
  readonly status = 400
  readonly code = 'invalid_request'
}

export class NotFoundError extends AppError {
  readonly status = 404
  readonly code = 'not_found'
}

export class MethodNotAllowedError extends AppError {
  readonly status = 405
  readonly code = 'method_not_allowed'
}

export class PayloadTooLargeError extends AppError {
  readonly status = 413
  readonly code = 'payload_too_large'
}

/** The model provider failed or refused (bad key, quota, outage...). */
export class UpstreamError extends AppError {
  readonly status = 502
  readonly code = 'upstream_error'
}
