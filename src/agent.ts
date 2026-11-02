import "dotenv/config";
import OpenAI from "openai";
import { tools, runTool } from "./tools.js";

const client = new OpenAI({
  baseURL: process.env.LLM_BASE_URL,
  apiKey: process.env.LLM_API_KEY ?? "not-needed", // Ollama ignores the key
});
const MAX_STEPS = 6;

const SYSTEM =
  "You are a support assistant for a travel platform. Answer ONLY from tool results. " +
  "If a tool returns an error or no data, say so plainly. Never guess booking details.";

export async function runAgent(question: string): Promise<string> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM },
    { role: "user", content: question },
  ];

  for (let step = 1; step <= MAX_STEPS; step++) {
    const res = await client.chat.completions.create({
      model: process.env.MODEL!,
      messages,
      tools,
      temperature: 0,
    });
    const choice = res.choices[0];
    const msg = choice.message;
    console.error(`[step ${step}] finish=${choice.finish_reason} in=${res.usage?.prompt_tokens} out=${res.usage?.completion_tokens}`);

    messages.push(msg); // keep the assistant message, tool_calls included

    if (!msg.tool_calls?.length) return msg.content ?? "";   // no tool needed: final answer

    const toolMessages = await Promise.all(
      msg.tool_calls.map(async (call): Promise<OpenAI.Chat.ChatCompletionToolMessageParam> => {
        if (call.type !== "function") {
          return { role: "tool", tool_call_id: call.id, content: "ERROR: unsupported tool type" };
        }
        let args: unknown = null;
        try { args = JSON.parse(call.function.arguments); } catch { /* broken JSON from the model */ }
        console.error(`  tool ${call.function.name}`, call.function.arguments);
        const out = await runTool(call.function.name, args);
        return { role: "tool", tool_call_id: call.id, content: out.isError ? `ERROR: ${out.content}` : out.content };
      }),
    );
    messages.push(...toolMessages);
  }
  return "Stopped: step limit reached.";
}