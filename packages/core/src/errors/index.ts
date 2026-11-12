// Base
export { DomainError } from './base-error'

// Domain Errors
export {
    ConflictError,
    DatabaseError,
    ForbiddenError,
    InternalServerError,
    NotFoundError,
    UnauthorizedError,
    ValidationError
} from './domain-errors'

// Error Handler
export { handleError, isDomainError } from './error-handler'
export type { ErrorContext, ErrorResult } from './error-handler'

