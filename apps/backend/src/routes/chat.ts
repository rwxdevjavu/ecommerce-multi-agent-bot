import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { db } from '../db';
import { conversationsTable, messagesTable } from '../db/schema';
import router from '../agents/router';
import { getConversation } from '../utils/context';

const chat = new Hono();

// POST /message — add a message to a conversation
chat.post('/message', async (c) => {
  const body = await c.req.json();
  const { conversationId, content } = body;

  if (!conversationId || !content) {
    return c.json({ error: 'conversationId and content are required' }, 400);
  }

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
    .values({ conversationId, role: "user", content })
    .returning();

  // Fetch last 5 messages (before the one just inserted) for context
  const history = await getConversation(conversationId)

  const ai_response = await router(content, history)

  await db
    .insert(messagesTable)
    .values({ conversationId, role: "agent", content: ai_response })
    .returning();

  return c.json({ content:ai_response }, 201);
});

// GET /conversation — list all conversations
chat.get('/conversation', async (c) => {
  const conversations = await db.select().from(conversationsTable);
  console.log(conversations)
  return c.json(conversations);
});

// GET /conversation/:id — get a conversation with its full message history
chat.get('/conversation/:id', async (c) => {
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
});

// DELETE /conversation/:id — delete a conversation (cascades to messages)
chat.delete('/conversation/:id', async (c) => {
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
