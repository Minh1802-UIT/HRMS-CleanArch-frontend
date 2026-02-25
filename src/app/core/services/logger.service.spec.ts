import { TestBed } from '@angular/core/testing';
import { LoggerService, LogLevel } from './logger.service';

describe('LoggerService', () => {
  let service: LoggerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LoggerService]
    });
    service = TestBed.inject(LoggerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // --------------------------------------------------
  // Log methods call correct console methods
  // --------------------------------------------------
  describe('log methods', () => {
    it('should call console.log for debug()', () => {
      spyOn(console, 'log');
      service.setLogLevel(LogLevel.Debug);
      service.debug('test debug', { extra: 1 });
      expect(console.log).toHaveBeenCalled();
    });

    it('should call console.info for info()', () => {
      spyOn(console, 'info');
      service.setLogLevel(LogLevel.Debug);
      service.info('test info');
      expect(console.info).toHaveBeenCalled();
    });

    it('should call console.warn for warn()', () => {
      spyOn(console, 'warn');
      service.setLogLevel(LogLevel.Debug);
      service.warn('test warn');
      expect(console.warn).toHaveBeenCalled();
    });

    it('should call console.error for error()', () => {
      spyOn(console, 'error');
      service.setLogLevel(LogLevel.Debug);
      service.error('test error', new Error('boom'));
      expect(console.error).toHaveBeenCalled();
    });
  });

  // --------------------------------------------------
  // Log level filtering
  // --------------------------------------------------
  describe('log level filtering', () => {
    it('should suppress debug when level is Warn', () => {
      spyOn(console, 'log');
      service.setLogLevel(LogLevel.Warn);
      service.debug('should not appear');
      expect(console.log).not.toHaveBeenCalled();
    });

    it('should suppress info when level is Warn', () => {
      spyOn(console, 'info');
      service.setLogLevel(LogLevel.Warn);
      service.info('should not appear');
      expect(console.info).not.toHaveBeenCalled();
    });

    it('should allow warn when level is Warn', () => {
      spyOn(console, 'warn');
      service.setLogLevel(LogLevel.Warn);
      service.warn('should appear');
      expect(console.warn).toHaveBeenCalled();
    });

    it('should allow error when level is Warn', () => {
      spyOn(console, 'error');
      service.setLogLevel(LogLevel.Warn);
      service.error('should appear');
      expect(console.error).toHaveBeenCalled();
    });

    it('should suppress everything when level is None', () => {
      spyOn(console, 'log');
      spyOn(console, 'info');
      spyOn(console, 'warn');
      spyOn(console, 'error');
      service.setLogLevel(LogLevel.None);
      service.debug('x');
      service.info('x');
      service.warn('x');
      service.error('x');
      expect(console.log).not.toHaveBeenCalled();
      expect(console.info).not.toHaveBeenCalled();
      expect(console.warn).not.toHaveBeenCalled();
      expect(console.error).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------
  // setLogLevel
  // --------------------------------------------------
  describe('setLogLevel', () => {
    it('should change the minimum log level', () => {
      spyOn(console, 'log');
      service.setLogLevel(LogLevel.Error);
      service.debug('nope');
      expect(console.log).not.toHaveBeenCalled();

      service.setLogLevel(LogLevel.Debug);
      service.debug('yes');
      expect(console.log).toHaveBeenCalled();
    });
  });

  // --------------------------------------------------
  // Log format
  // --------------------------------------------------
  describe('log format', () => {
    it('should include timestamp and level label in message', () => {
      spyOn(console, 'warn');
      service.setLogLevel(LogLevel.Debug);
      service.warn('my warning');

      const args = (console.warn as jasmine.Spy).calls.mostRecent().args;
      const message = args[0] as string;
      expect(message).toContain('Warn:');
      expect(message).toContain('my warning');
      // Check ISO timestamp format
      expect(message).toMatch(/\[\d{4}-\d{2}-\d{2}T/);
    });
  });
});
