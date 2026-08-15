import { createEmendAiHandler, mockGenerate } from "@emend/ai/server"

const handlers = {
  normal: createEmendAiHandler({ generate: mockGenerate }),
  delayed: createEmendAiHandler({
    generate: (request, signal) =>
      mockGenerate(request, signal, { delayMs: 300 }),
  }),
  failing: createEmendAiHandler({
    generate: (request, signal) =>
      mockGenerate(request, signal, { delayMs: 180, failAfterDeltas: 3 }),
  }),
}

type MockMode = keyof typeof handlers

export function POST(request: Request): Promise<Response> {
  const mode = new URL(request.url).searchParams.get("mode")
  return handlers[isMockMode(mode) ? mode : "normal"](request)
}

function isMockMode(value: string | null): value is MockMode {
  return value !== null && Object.hasOwn(handlers, value)
}
