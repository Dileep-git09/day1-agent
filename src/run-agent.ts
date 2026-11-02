import process from "node:process";
import { runAgent } from "./agent.js";
console.log(await runAgent(process.argv[2] ?? "Is booking 42 confirmed, and where is the traveller flying?"));