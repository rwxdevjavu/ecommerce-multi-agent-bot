import { openai } from "@ai-sdk/openai"
import { generateText, stepCountIs } from "ai"
import { findOrderByIdTool, findOrdersByProductTool } from "../utils/tools"

export async function orderSubAgent(refinedContext: string): Promise<string> {
  const response = await generateText({
    model: openai("gpt-4o-mini"),
    system: `
You are an Order Support Agent for a customer support system.

Responsibilities:
- Handle order tracking, shipping updates, delivery status, modifications, and cancellations.
- ALWAYS use tools to fetch real order data before responding. Never guess or fabricate details.
- If an order ID is provided (e.g. ORD-2026-01), use findOrderByIdTool.
- If only a product name is mentioned, use findOrdersByProductTool.
- If no matching order is found, clearly inform the user.
- Do NOT handle payments, refunds, or billing — those belong to the Billing Agent.

Order status meanings:
- pending: Order placed, awaiting confirmation.
- confirmed: Order confirmed, being prepared.
- shipped: Order dispatched and in transit.
- delivered: Successfully delivered.
- cancelled: Order was cancelled.

Be concise, professional, and empathetic.
`,
    tools: {
      findOrderByIdTool,
      findOrdersByProductTool,
    },
    toolChoice: "auto",
    stopWhen: stepCountIs(5),
    prompt: refinedContext,
  })

  console.log(response)
  return response.text
}
