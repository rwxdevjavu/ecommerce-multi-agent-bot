import { pgEnum, pgTable, serial, integer, text, timestamp, uuid, decimal } from 'drizzle-orm/pg-core'

// ─── Users ────────────────────────────────────────────────────────────────────

export const usersTable = pgTable('users', {
  id:        serial('id').primaryKey(),
  name:      text('name').notNull(),
  email:     text('email').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Orders ───────────────────────────────────────────────────────────────────

export const orderStatusEnum = pgEnum('order_status', [
  'pending', 'confirmed', 'shipped', 'delivered', 'cancelled',
])

export const productTypeEnum = pgEnum('product_type', [
  'electronics', 'clothing', 'footwear', 'books', 'home_appliances', 'sports', 'other',
])

export const ordersTable = pgTable('orders', {
  id:              text('id').primaryKey(),                        // ORD-2026-01
  product:         text('product').notNull(),
  productType:     productTypeEnum('product_type').notNull().default('other'),
  quantity:        text('quantity').notNull().default('1'),
  totalAmount:     decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  currency:        text('currency').notNull().default('INR'),
  status:          orderStatusEnum('status').notNull().default('pending'),
  shippingAddress: text('shipping_address').notNull(),
  createdAt:       timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:       timestamp('updated_at',  { withTimezone: true }).defaultNow().notNull(),
})

// ─── Payments ─────────────────────────────────────────────────────────────────

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending', 'completed', 'failed', 'refunded',
])

export const paymentMethodEnum = pgEnum('payment_method', [
  'card', 'bank_transfer', 'wallet',
])

export const paymentsTable = pgTable('payments', {
  id:        text('id').primaryKey(),                              // PAY-2026-10
  orderId:   text('order_id').notNull().references(() => ordersTable.id),
  amount:    decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency:  text('currency').notNull().default('INR'),
  status:    paymentStatusEnum('status').notNull().default('pending'),
  method:    paymentMethodEnum('method').notNull(),
  paidAt:    timestamp('paid_at',    { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Conversations ────────────────────────────────────────────────────────────

export const conversationsTable = pgTable('conversations', {
  id:        uuid('id').primaryKey().defaultRandom(),
  userId:    integer('user_id').notNull().references(() => usersTable.id),
  subject:   text('subject'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at',  { withTimezone: true }).defaultNow().notNull(),
})

// ─── Messages ─────────────────────────────────────────────────────────────────

export const messageRoleEnum = pgEnum('message_role', ['user', 'agent'])

export const messagesTable = pgTable('messages', {
  id:             uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').notNull().references(() => conversationsTable.id, { onDelete: 'cascade' }),
  role:           messageRoleEnum('role').notNull(),
  content:        text('content').notNull(),
  createdAt:      timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Inferred Types ───────────────────────────────────────────────────────────

export type User         = typeof usersTable.$inferSelect
export type Order        = typeof ordersTable.$inferSelect
export type NewOrder     = typeof ordersTable.$inferInsert
export type Payment      = typeof paymentsTable.$inferSelect
export type Conversation = typeof conversationsTable.$inferSelect
export type Message      = typeof messagesTable.$inferSelect
