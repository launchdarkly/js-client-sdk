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

exports.LDUnexpectedResponseError = createCustomError('LaunchDarklyUnexpectedResponseError');
exports.LDInvalidEnvironmentIdError = createCustomError('LaunchDarklyInvalidEnvironmentIdError');
exports.LDInvalidUserError = createCustomError('LaunchDarklyInvalidUserError');
exports.LDInvalidEventKeyError = createCustomError('LaunchDarklyInvalidEventKeyError');
exports.LDInvalidArgumentError = createCustomError('LaunchDarklyInvalidArgumentError');
exports.LDFlagFetchError = createCustomError('LaunchDarklyFlagFetchError');
