import { Hono } from 'hono';
import { db } from '../db';
import { ordersTable, paymentsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

const orders = new Hono()

  // GET /orders — list all orders with their payment status
  .get('/', async (c) => {
    const rows = await db
      .select({
        id:              ordersTable.id,
        product:         ordersTable.product,
        productType:     ordersTable.productType,
        quantity:        ordersTable.quantity,
        totalAmount:     ordersTable.totalAmount,
        currency:        ordersTable.currency,
        status:          ordersTable.status,
        shippingAddress: ordersTable.shippingAddress,
        createdAt:       ordersTable.createdAt,
        paymentId:       paymentsTable.id,
        paymentStatus:   paymentsTable.status,
        paymentMethod:   paymentsTable.method,
      })
      .from(ordersTable)
      .leftJoin(paymentsTable, eq(paymentsTable.orderId, ordersTable.id))
      .orderBy(ordersTable.createdAt);

    return c.json(rows);
  });

export default orders;
