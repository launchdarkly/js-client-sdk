// Default implementation of our internal logging interface, which writes messages to the console.
// If no minimum level is specified, all messages will be logged. Setting the level to "none"
// disables all logging.

export default function createConsoleLogger(level) {
  const allLevels = ['debug', 'info', 'warn', 'error'];
  let minLevelIndex = 0;
  if (level) {
    if (level === 'none') {
      minLevelIndex = 100;
    } else {
      minLevelIndex = allLevels.indexOf(level);
    }
  }

  const logger = {};

  function log(levelIndex, outputFn, msg) {
    if (levelIndex >= minLevelIndex) {
      outputFn(msg);
    }
  }

  logger.debug = msg => log(0, console.log, msg);
  logger.info = msg => log(1, console.info, msg);
  logger.warn = msg => log(2, console.warn, msg);
  logger.error = msg => log(3, console.error, msg);

  return logger;
}
