import { generateText, Output } from 'ai';
import { openai } from '@ai-sdk/openai'
import z from 'zod'
import 'dotenv/config';
import { orderSubAgent } from "../agents/order";
import { billingSubAgent } from "../agents/billing";
import { supportSubAgent } from "../agents/support";


const outputSchema = z.object({
    intent: z.enum(['support','order','billing','unknown']),
    refinedContext: z.string().nullable(),
})

const supervisor = async(prompt:string) => {
  const result = await generateText({
    model: openai('gpt-5'),
    prompt: prompt,
    output: Output.object({schema:outputSchema}),
    system: `You are a routing supervisor agent in a multi-agent customer support system.
            Your responsibilities:

            1. Classify the user message into exactly ONE of:
              - support
              - order
              - billing
              - unknown

            2. Create a clean, minimal, and structured context for the selected sub-agent.
              - Remove irrelevant conversational text.
              - Keep only actionable information.
              - Rewrite the request clearly and concisely.
              - Do NOT answer the user.
              - Do NOT add assumptions.
              - Do NOT invent missing data.

            Intent definitions:

            - support:
              General help, troubleshooting, FAQs, account issues, product usage problems.

            - order:
              Order status, tracking, shipping updates, delivery delays,
              modifications, cancellations related to a specific order.

            - billing:
              Payments, refunds, subscription charges, invoices, double charges,
              pricing disputes, credit card issues.

            Routing priority rules:
            - If billing-related content exists → billing
            - Else if order-related content exists → order
            - Else if general help → support
            - If unclear or unrelated → unknown

            Return ONLY valid JSON in this exact format:

            {
              "intent": "support | order | billing | unknown",
              "refinedContext": string
            }

            The "refinedContext" must:
            - Be written in third person.
            - Be clear and structured.
            - Be ready to pass directly to the appropriate sub-agent.
            - Contain no explanation of classification.
`
  });
  console.log(result.text)
  return JSON.parse(result.text)
}

export default async (prompt:string) => {
  const supervisorResponse = await supervisor(prompt)
  switch(supervisorResponse.intent){
    case "support":
      return supportSubAgent(supervisorResponse.refinedContext)
    case "billing":
      return billingSubAgent(supervisorResponse.refinedContext)
    case "order":
      return orderSubAgent(supervisorResponse.refinedContext)
    case "unknown":
      return "I'm not sure how to help with that. Please contact support if you need further assistance."
  }
}