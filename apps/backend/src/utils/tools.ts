import { tool } from "ai"
import { z } from "zod"
import { db } from "../db"
import { conversationsTable, messagesTable, ordersTable, paymentsTable } from "../db/schema"
import { eq, like } from "drizzle-orm"

// ─── Order Tools ──────────────────────────────────────────────────────────────

export const findOrderByIdTool = tool({
  description: `
  Retrieve a single order by its exact order ID (e.g. ORD-2026-01).
  Use this when the user provides a specific order ID.
  `,
  inputSchema: z.object({
    orderId: z.string().min(1).describe("Exact order ID, e.g. ORD-2026-01"),
  }),
  execute: async ({ orderId }) => {
    const orders = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, orderId))
      .limit(1)
    return orders[0] ?? null
  },
})

export const findOrdersByProductTool = tool({
  description: `
  Search for orders by product name (partial match, case-insensitive).
  Use this when the user mentions a product name but no order ID.
  Returns up to 5 matching orders.
  `,
  inputSchema: z.object({
    product: z.string().min(1).describe("Product name to search for, e.g. 'iPhone'"),
  }),
  execute: async ({ product }) => {
    return db
      .select()
      .from(ordersTable)
      .where(like(ordersTable.product, `%${product}%`))
      .limit(5)
  },
})

// ─── Billing Tools ────────────────────────────────────────────────────────────

export const findPaymentByIdTool = tool({
  description: `
  Retrieve a single payment by its exact payment ID (e.g. PAY-2026-10).
  Use this when the user provides a specific payment ID.
  `,
  inputSchema: z.object({
    paymentId: z.string().min(1).describe("Exact payment ID, e.g. PAY-2026-10"),
  }),
  execute: async ({ paymentId }) => {
    const payments = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.id, paymentId))
      .limit(1)
    return payments[0] ?? null
  },
})

export const findPaymentByOrderIdTool = tool({
  description: `
  Retrieve the payment linked to a specific order ID.
  Use this when the user mentions an order ID in a billing context (refund, charge, invoice).
  `,
  inputSchema: z.object({
    orderId: z.string().min(1).describe("Order ID whose payment you want to look up, e.g. ORD-2026-01"),
  }),
  execute: async ({ orderId }) => {
    const payments = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.orderId, orderId))
      .limit(1)
    return payments[0] ?? null
  },
})

// ─── Support Tools ────────────────────────────────────────────────────────────

export const getConversationHistoryTool = tool({
  description: `
  Retrieve the full message history of a conversation by its conversation ID.
  Use this to look up prior interactions for context when handling support inquiries.
  `,
  inputSchema: z.object({
    conversationId: z.string().uuid().describe("UUID of the conversation to fetch history for"),
  }),
  execute: async ({ conversationId }) => {
    const convo = await db
      .select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, conversationId))
      .limit(10)

    if (!convo.length) return null

    const messages = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, conversationId))
      .orderBy(messagesTable.createdAt)

    return { ...convo[0], messages }
  },
})
