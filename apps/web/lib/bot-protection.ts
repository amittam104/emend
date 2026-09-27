import { checkBotId } from "botid/server"

export async function isBotRequest(): Promise<boolean> {
  if (!process.env.VERCEL) return false

  const { isBot } = await checkBotId()
  return isBot
}
