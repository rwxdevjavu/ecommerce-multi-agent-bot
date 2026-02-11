import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db';
import { conversationsTable, messagesTable } from '../db/schema';
import router from '../agents/router';
import { getConversation } from '../utils/context';

const messageSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1),
});

const chat = new Hono()

  // POST /message — send a message and get an AI response
  .post('/message', async (c) => {
    const parsed = messageSchema.safeParse(await c.req.json());

    if (!parsed.success) {
      return c.json({ error: 'conversationId and content are required' }, 400);
    }

    const { conversationId, content } = parsed.data;

    const conversation = await db
      .select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, conversationId))
      .limit(1);

    if (!conversation.length) {
      return c.json({ error: 'Conversation not found' }, 404);
    }

    await db
      .insert(messagesTable)
      .values({ conversationId, role: 'user', content })
      .returning();

    const history = await getConversation(conversationId);
    const ai_response = await router(content, history);

    const [agentMessage] = await db
      .insert(messagesTable)
      .values({ conversationId, role: 'agent', content: ai_response })
      .returning();

    return c.json(agentMessage, 201);
  })

  // GET /conversation — list all conversations
  .get('/conversation', async (c) => {
    const conversations = await db.select().from(conversationsTable);
    return c.json(conversations);
  })

  // GET /conversation/:id — get a conversation with its full message history
  .get('/conversation/:id', async (c) => {
    const id = c.req.param('id');

    const conversation = await db
      .select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, id))
      .limit(1);

    if (!conversation.length) {
      return c.json({ error: 'Conversation not found' }, 404);
    }

    const messages = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, id))
      .orderBy(messagesTable.createdAt);

    return c.json({ ...conversation[0], messages });
  })

  // DELETE /conversation/:id — delete a conversation (cascades to messages)
  .delete('/conversation/:id', async (c) => {
    const id = c.req.param('id');

    const deleted = await db
      .delete(conversationsTable)
      .where(eq(conversationsTable.id, id))
      .returning();

    if (!deleted.length) {
      return c.json({ error: 'Conversation not found' }, 404);
    }

    return c.json({ success: true });
  });

export default chat;
