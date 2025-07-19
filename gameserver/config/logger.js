import pino from 'pino';
import { createStream } from 'rotating-file-stream';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create rotating file stream for application logs
const appLogStream = createStream('app.log', {
  interval: '1d', // rotate daily
  size: '10M',    // rotate when file reaches 10MB
  path: path.join(__dirname, '..', 'logs'),
  compress: 'gzip', // compress rotated files
  maxFiles: 30,   // keep 30 days of logs
});

// Create rotating file stream for error logs
const errorLogStream = createStream('error.log', {
  interval: '1d',
  size: '10M',
  path: path.join(__dirname, '..', 'logs'),
  compress: 'gzip',
  maxFiles: 30,
});

// Create multi-stream logger based on environment
const streams = [
  {
    level: 'info',
    stream: appLogStream
  },
  {
    level: 'error',
    stream: errorLogStream
  }
];

// Add console output in development
if (process.env.NODE_ENV !== 'production') {
  streams.push({
    level: 'debug',
    stream: pino.transport({
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'hostname',
      }
    })
  });
}

// Create the logger
const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => {
        return { level: label };
      },
    },
    serializers: {
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
      err: pino.stdSerializers.err,
    },
  },
  pino.multistream(streams)
);

export { logger };