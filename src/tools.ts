import { z } from "zod";
import type OpenAI from "openai";

const bookings = new Map([
  [42, { id: 42, status: "CONFIRMED", traveller: "A. Rao", from: "HYD", to: "LHR", date: "2026-11-12", passport: "X1234567" }],
  [7,  { id: 7,  status: "CANCELLED", traveller: "S. Khan", from: "BLR", to: "DXB", date: "2026-10-20", passport: "Y7654321" }],
]);

export const tools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_booking",
      description:
        "Fetch ONE travel booking by its numeric ID. Returns status, traveller name, route and date. " +
        "Use only when the user gives a booking ID. Read-only; never modifies anything.",
      parameters: {
        type: "object",
        properties: { id: { type: "integer", description: "Numeric booking ID, e.g. 42" } },
        required: ["id"],
      },
    },
  },
];

const GetBookingInput = z.object({ id: z.number().int().positive() });

export async function runTool(name: string, input: unknown): Promise<{ content: string; isError: boolean }> {
  try {
    if (name === "get_booking") {
      const { id } = GetBookingInput.parse(input);          // never trust model arguments
      const booking = bookings.get(id);
      if (!booking) return { content: `No booking with id ${id}`, isError: true };
      const { passport, ...safe } = booking;                // PII never leaves the tool
      return { content: JSON.stringify(safe), isError: false };
    }
    return { content: `Unknown tool: ${name}`, isError: true };
  } catch (err) {
    return { content: `Tool failed: ${err instanceof Error ? err.message : "unknown error"}`, isError: true };
  }
}