export const getNatsUrl = (): string => {
  const env = process.env.NODE_ENV || 'development';
  
  if (env === 'production' || env === 'docker') {
    // Inside Docker network
    return process.env.NATS_URL || 'nats://nats:4222';
  }
  
  // Local development
  return process.env.NATS_URL || 'nats://localhost:4222';
};

export const natsConfig = {
  url: getNatsUrl(),
  // Optional: connection options
  options: {
    reconnect: true,
    reconnectDelayMs: 200,
  },
};