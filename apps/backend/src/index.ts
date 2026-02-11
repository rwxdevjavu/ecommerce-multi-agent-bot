import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { rateLimiter } from 'hono-rate-limiter'
import Chat from './routes/chat'
import Orders from './routes/orders'

const app = new Hono()

  .use('*', cors())

  // Global rate limit: 60 requests per minute per IP
  .use('*', rateLimiter({
    windowMs: 60 * 1000,
    limit: 60,
    keyGenerator: (c) => c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown',
    message: { error: 'Too many requests. Please try again in a minute.' },
  }))

  // Stricter limit on AI message endpoint: 10 requests per minute per IP
  .use('/chat/message', rateLimiter({
    windowMs: 60 * 1000,
    limit: 10,
    keyGenerator: (c) => c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown',
    message: { error: 'Message rate limit exceeded. Please wait before sending another message.' },
  }))

  .get('/health', (c) => c.text('OK'))

  .route('/chat', Chat)
  .route('/orders', Orders)

// Export the type for use with hc<AppType> on the frontend
export type AppType = typeof app

export default app
