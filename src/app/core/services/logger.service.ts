import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export enum LogLevel {
  Debug = 0,
  Info = 1,
  Warn = 2,
  Error = 3,
  None = 4
}

@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  private currentLogLevel: LogLevel = environment.production ? LogLevel.Warn : LogLevel.Debug;

  constructor() {}

  /**
   * Log a debug message (only in development)
   */
  debug(message: string, ...optionalParams: any[]): void {
    this.log(LogLevel.Debug, message, optionalParams);
  }

  /**
   * Log an informational message
   */
  info(message: string, ...optionalParams: any[]): void {
    this.log(LogLevel.Info, message, optionalParams);
  }

  /**
   * Log a warning message
   */
  warn(message: string, ...optionalParams: any[]): void {
    this.log(LogLevel.Warn, message, optionalParams);
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error | any, ...optionalParams: any[]): void {
    this.log(LogLevel.Error, message, [error, ...optionalParams]);
  }

  /**
   * Internal logging method
   */
  private log(level: LogLevel, message: string, optionalParams: any[]): void {
    if (level < this.currentLogLevel) {
      return;
    }

    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${LogLevel[level]}: ${message}`;

    switch (level) {
      case LogLevel.Debug:
        console.log(logMessage, ...optionalParams);
        break;
      case LogLevel.Info:
        console.info(logMessage, ...optionalParams);
        break;
      case LogLevel.Warn:
        console.warn(logMessage, ...optionalParams);
        break;
      case LogLevel.Error:
        console.error(logMessage, ...optionalParams);
        break;
    }

    // TODO: In production, integrate with external logging service (e.g., Sentry, LogRocket)
    // if (environment.production && level >= LogLevel.Error) {
    //   this.sendToExternalLogger(level, message, optionalParams);
    // }
  }

  /**
   * Set the minimum log level
   */
  setLogLevel(level: LogLevel): void {
    this.currentLogLevel = level;
  }

  /**
   * Placeholder for external logging integration
   */
  private sendToExternalLogger(level: LogLevel, message: string, params: any[]): void {
    // Integration with external logging service
    // Example: Sentry.captureMessage(message, { level: LogLevel[level], extra: params });
  }
}
