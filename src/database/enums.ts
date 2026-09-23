export enum AccountStatus {
  ACTIVE = 'ACTIVE',
  BLOCKED = 'BLOCKED',
  CLOSED = 'CLOSED',
}

export enum TransferStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum MovementType {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

export enum BatchStatus {
  PENDING = 'PENDING',
  VALIDATING = 'VALIDATING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  COMPLETED_WITH_ERRORS = 'COMPLETED_WITH_ERRORS',
  FAILED = 'FAILED',
}

export enum BatchItemStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING',
}
