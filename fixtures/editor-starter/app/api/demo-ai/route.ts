import { createEmendAiHandler, mockGenerate } from "@emend/ai/server"

export const POST = createEmendAiHandler({ generate: mockGenerate })
