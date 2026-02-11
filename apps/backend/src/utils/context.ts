import { db } from '../db'
import { messagesTable, Message } from '../db/schema'
import {eq} from 'drizzle-orm'


export const getConversation = async (conversationId: string): Promise<Message[]> => {
    return db
        .select()
        .from(messagesTable)
        .where(eq(messagesTable.conversationId, conversationId))
        .orderBy(messagesTable.createdAt)
        .limit(6)
}