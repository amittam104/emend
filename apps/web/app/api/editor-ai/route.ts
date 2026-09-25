import { createOpenRouter } from "@openrouter/ai-sdk-provider"

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

export { POST } from "@emend/registry-components/recipes/vercel-ai-gateway"
