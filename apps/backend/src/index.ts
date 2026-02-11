import { Hono } from 'hono'
import { cors } from 'hono/cors'
import Chat from './routes/chat'

const app = new Hono()

app.use('*', cors())

app.get('/health', (c) => {
  return c.text('Hello Hono!')
})

app.route('/chat',Chat)

export default app

