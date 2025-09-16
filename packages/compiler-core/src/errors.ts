import { SourceLocation } from './ast'

export enum ErrorCodes {
  X_INVALID_END_TAG,
  INVALID_FIRST_CHARACTER_OF_TAG_NAME,
  X_MISSING_INTERPOLATION_END,
}

export const errorMessages: Record<ErrorCodes, string> = {
  [ErrorCodes.X_INVALID_END_TAG]: 'Invalid end tag.',
  [ErrorCodes.INVALID_FIRST_CHARACTER_OF_TAG_NAME]:
    "Illegal tag name. Use '&lt;' to print '<'.",
  [ErrorCodes.X_MISSING_INTERPOLATION_END]:
    'Interpolation end sign was not found.',
}

export function createCompilerError<T extends number>(
  code: T,
  loc?: SourceLocation
) {
  const msg = errorMessages[code]

  const error = new SyntaxError(String(msg)) as any
  error.code = code
  error.loc = loc

  return error
}

export function defaultOnError(error) {
  throw error
}
