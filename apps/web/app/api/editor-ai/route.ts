import { POST as handleEditorAi } from "@emend/registry-components/recipes/vercel-ai-gateway"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"

import { isBotRequest } from "@/lib/bot-protection"

// The site runs the unmodified Gateway recipe (same handler and system prompt)
// but resolves its model through OpenRouter's Free Models Router instead.
// The recipe passes a plain model id, which the AI SDK resolves through the
// global default provider at request time. Every language model id resolves
// to the free router, so this route never depends on the recipe's model name.
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_DEMO_API_KEY,
})
const freeModel = openrouter.chat("openrouter/free")

globalThis.AI_SDK_DEFAULT_PROVIDER = {
  specificationVersion: "v4",
  languageModel: () => freeModel,
  embeddingModel: (modelId) => openrouter.textEmbeddingModel(modelId),
  imageModel: (modelId) => openrouter.imageModel(modelId),
}

export async function POST(request: Request): Promise<Response> {
  if (await isBotRequest())
    return new Response("Access denied", { status: 403 })

  return handleEditorAi(request)
}
