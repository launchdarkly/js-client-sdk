import createConsoleLogger from '../consoleLogger';

describe('createConsoleLogger', () => {
  let logSpy;
  let infoSpy;
  let warnSpy;
  let errorSpy;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    infoSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('has default prefix', () => {
    const logger = createConsoleLogger('info');
    logger.info('xyz');
    expect(infoSpy).toHaveBeenCalledWith('LD: [info] xyz');
  });

  it('can specify prefix', () => {
    const logger = createConsoleLogger('info', 'thing');
    logger.info('xyz');
    expect(infoSpy).toHaveBeenCalledWith('thing [info] xyz');
  });

  it('can specify no prefix', () => {
    const logger = createConsoleLogger('info', '');
    logger.info('xyz');
    expect(infoSpy).toHaveBeenCalledWith('[info] xyz');
  });

  [undefined, 'debug', 'info', 'warn', 'error', 'none'].forEach(configuredLevel => {
    describe('when logger level is set to "' + configuredLevel + '"', () => {
      const logger = createConsoleLogger(configuredLevel, '');

      it('debug message', () => {
        logger.debug('a');

        if (configuredLevel === undefined || configuredLevel === 'debug') {
          expect(logSpy).toHaveBeenCalledWith('[debug] a');
        } else {
          expect(logSpy).not.toHaveBeenCalled();
        }
        expect(infoSpy).not.toHaveBeenCalled();
        expect(warnSpy).not.toHaveBeenCalled();
        expect(errorSpy).not.toHaveBeenCalled();
      });

      it('info message', () => {
        logger.info('b');

        if (configuredLevel === undefined || configuredLevel === 'debug' || configuredLevel === 'info') {
          expect(infoSpy).toHaveBeenCalledWith('[info] b');
        } else {
          expect(infoSpy).not.toHaveBeenCalled();
        }
        expect(logSpy).not.toHaveBeenCalled();
        expect(warnSpy).not.toHaveBeenCalled();
        expect(errorSpy).not.toHaveBeenCalled();
      });

      it('warn message', () => {
        logger.warn('c');

        if (configuredLevel !== 'error' && configuredLevel !== 'none') {
          expect(warnSpy).toHaveBeenCalledWith('[warn] c');
        } else {
          expect(warnSpy).not.toHaveBeenCalled();
        }
        expect(logSpy).not.toHaveBeenCalled();
        expect(infoSpy).not.toHaveBeenCalled();
        expect(errorSpy).not.toHaveBeenCalled();
      });

      it('error message', () => {
        logger.error('d');

        if (configuredLevel !== 'none') {
          expect(errorSpy).toHaveBeenCalledWith('[error] d');
        } else {
          expect(errorSpy).not.toHaveBeenCalled();
        }
        expect(logSpy).not.toHaveBeenCalled();
        expect(infoSpy).not.toHaveBeenCalled();
        expect(warnSpy).not.toHaveBeenCalled();
      });
    });
  });
});
