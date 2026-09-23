import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "..", "..", "..", ".env") });

import { recommend } from "../lib/server/recommend.ts";

const input = process.argv[2] || "recommend some sci fi movies";
const lang = process.argv[3] || "en";

try {
  const result = await recommend({
    messages: [input],
    exclude: [],
    guided: null,
    lang,
  });
  
  let formattedOutput = result.reply;
  if (result.movies && result.movies.length > 0) {
    const titles = result.movies.map((m) => m.title).join(", ");
    formattedOutput += `\n[Shown to the user: ${titles}]`;
  }
  
  console.log(JSON.stringify({
    success: true,
    output: formattedOutput,
    reply: result.reply,
    movies: result.movies.map(m => m.title),
    understood: result.understood,
    language: result.language,
    timings: result.timings
  }));
} catch (err) {
  console.log(JSON.stringify({
    success: false,
    error: err.message
  }));
}
