import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { rateLimiter } from 'hono-rate-limiter'
import Chat from './routes/chat'

const app = new Hono()

app.use('*', cors())

// Global rate limit: 60 requests per minute per IP
app.use('*', rateLimiter({
  windowMs: 60 * 1000,
  limit: 60,
  keyGenerator: (c) => c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown',
  message: { error: 'Too many requests. Please try again in a minute.' },
}))

// Stricter limit on AI message endpoint: 10 requests per minute per IP
app.use('/chat/message', rateLimiter({
  windowMs: 60 * 1000,
  limit: 10,
  keyGenerator: (c) => c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown',
  message: { error: 'Message rate limit exceeded. Please wait before sending another message.' },
}))

app.get('/health', (c) => {
  return c.text('OK')
})

app.route('/chat', Chat)

export default app

