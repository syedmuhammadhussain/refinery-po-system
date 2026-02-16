import amqplib from 'amqplib';
import logger from '../config/logger.js';
import pool from '../config/database.js';

const EXCHANGE = 'refinery.events';
const QUEUE = 'procurement.catalog-events';

/**
 * Consume catalog events to keep procurement data consistent.
 * E.g. if a catalog item is discontinued, flag draft POs that contain it.
 */
export async function startConsumer() {
  const url = process.env.RABBITMQ_URL || 'amqp://rabbit_user:secret@rabbitmq:5672';
  const maxRetries = 10;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const conn = await amqplib.connect(url);
      const channel = await conn.createChannel();

      await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
      await channel.assertQueue(QUEUE, { durable: true });

      // Bind to catalog-related events
      await channel.bindQueue(QUEUE, EXCHANGE, 'catalog.item.updated');
      await channel.bindQueue(QUEUE, EXCHANGE, 'catalog.item.discontinued');

      channel.consume(QUEUE, async (msg) => {
        if (!msg) return;

        try {
          const event = JSON.parse(msg.content.toString());
          const routingKey = msg.fields.routingKey;

          logger.info({ routingKey, itemId: event.itemId }, 'Processing catalog event');

          if (routingKey === 'catalog.item.discontinued') {
            // Flag any draft POs that contain this item
            await pool.query(`
              UPDATE po_line_items
              SET notes = 'ITEM DISCONTINUED — review required'
              WHERE catalog_item_id = $1
                AND po_id IN (
                  SELECT id FROM purchase_orders WHERE status = 'DRAFT'
                )
            `, [event.itemId]);
          }

          channel.ack(msg);
        } catch (err) {
          logger.error({ err }, 'Failed to process catalog event');
          channel.nack(msg, false, true); // requeue
        }
      });

      conn.on('close', () => {
        logger.warn('RabbitMQ consumer connection closed, reconnecting…');
        setTimeout(startConsumer, 5_000);
      });

      logger.info('Procurement event consumer started');
      return;
    } catch (err) {
      logger.warn(`Consumer connection attempt ${attempt}/${maxRetries} failed`);
      if (attempt === maxRetries) {
        logger.error('Consumer connection failed after max retries');
        return;
      }
      await new Promise((r) => setTimeout(r, 3_000));
    }
  }
}
