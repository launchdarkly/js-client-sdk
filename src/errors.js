function createCustomError(name) {
  function CustomError(message, code) {
    Error.captureStackTrace && Error.captureStackTrace(this, this.constructor);
    this.message = message;
    this.code = code;
  }

  CustomError.prototype = new Error();
  CustomError.prototype.name = name;
  CustomError.prototype.constructor = CustomError;

  return CustomError;
}

export const LDUnexpectedResponseError = createCustomError('LaunchDarklyUnexpectedResponseError');
export const LDInvalidEnvironmentIdError = createCustomError('LaunchDarklyInvalidEnvironmentIdError');
export const LDInvalidUserError = createCustomError('LaunchDarklyInvalidUserError');
export const LDInvalidEventKeyError = createCustomError('LaunchDarklyInvalidEventKeyError');
export const LDInvalidArgumentError = createCustomError('LaunchDarklyInvalidArgumentError');
export const LDFlagFetchError = createCustomError('LaunchDarklyFlagFetchError');
