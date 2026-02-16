import amqplib from 'amqplib';
import logger from '../config/logger.js';

const EXCHANGE = 'refinery.events';
let channel = null;

export async function connectRabbitMQ() {
  
  const url = process.env.RABBITMQ_URL || 'amqp://rabbit_user:secret@rabbitmq:5672';
  const maxRetries = 10;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const conn = await amqplib.connect(url);
      channel = await conn.createChannel();
      await channel.assertExchange(EXCHANGE, 'topic', { durable: true });

      conn.on('close', () => {
        logger.warn('RabbitMQ connection closed, reconnecting...');
        channel = null;
        setTimeout(connectRabbitMQ, 5_000);
      });

      logger.info('RabbitMQ connected');
      return;
    } catch (err) {
      logger.warn(`RabbitMQ connection attempt ${attempt}/${maxRetries} failed`);
      if (attempt === maxRetries) {
        logger.error('RabbitMQ connection failed after max retries');
        return;
      }
      await new Promise((r) => setTimeout(r, 3_000));
    }
  }
}

export function publish(routingKey, payload) {
  if (!channel) return;
  channel.publish(EXCHANGE, routingKey, Buffer.from(JSON.stringify(payload)), {
    persistent: true,
    contentType: 'application/json',
  });
}
