export type LogLevel = 'info' | 'warn' | 'error';

const COLOURS: Record<LogLevel, string> = {
  info: '\x1b[32m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
};

export const log = (message: string, level: LogLevel = 'info'): void => {
  const colour = COLOURS[level] ?? COLOURS.info;
  // eslint-disable-next-line no-console
  console.log(`${colour}${level}\x1b[0m: ${new Date().toISOString()} | ${message}`);
};
