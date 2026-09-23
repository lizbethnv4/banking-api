export class DomainException extends Error {
  readonly code: string;
  readonly httpStatus: number;
  readonly details?: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    httpStatus: number,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'DomainException';
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;
  }
}
