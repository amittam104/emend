"use client"

import { useCallback, useEffect, useState } from "react"
import type { AssistantMessage } from "./ai-assistant"

export interface AssistantThread {
  readonly id: string
  readonly updatedAt: number
  readonly messages: AssistantMessage[]
}

const maxStorageLength = 1_000_000

function isThread(value: unknown): value is AssistantThread {
  if (!value || typeof value !== "object") return false
  const thread = value as AssistantThread
  return (
    typeof thread.id === "string" &&
    Number.isFinite(thread.updatedAt) &&
    Array.isArray(thread.messages) &&
    thread.messages.every(
      (message) =>
        message &&
        typeof message.id === "string" &&
        typeof message.requestId === "string" &&
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string"
    )
  )
}

export function useAssistantHistory(storageKey: string) {
  const [threads, setThreads] = useState<AssistantThread[]>([])
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const [storageNotice, setStorageNotice] = useState<string | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      const parsed: unknown = stored ? JSON.parse(stored) : []
      if (!Array.isArray(parsed) || !parsed.every(isThread))
        throw new Error("Invalid history")
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setThreads(parsed.slice(0, 20))
    } catch {
      setThreads([])
      setStorageNotice(
        "Saved history is unavailable. You can still chat in this session."
      )
    }
    setLoadedKey(storageKey)
  }, [storageKey])

  useEffect(() => {
    if (loadedKey !== storageKey) return
    try {
      const serialized = JSON.stringify(threads)
      if (serialized.length > maxStorageLength)
        throw new Error("History is full")
      localStorage.setItem(storageKey, serialized)
    } catch {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStorageNotice(
        "This chat could not be saved. Browser storage may be full or unavailable."
      )
    }
  }, [threads, loadedKey, storageKey])

  const saveThread = useCallback(
    (thread: Pick<AssistantThread, "id" | "messages">) => {
      if (thread.messages.length === 0) return
      setThreads((current) => {
        const existing = current.find((item) => item.id === thread.id)
        if (
          existing &&
          JSON.stringify(existing.messages) === JSON.stringify(thread.messages)
        )
          return current
        const next = [
          { ...thread, updatedAt: Date.now() },
          ...current.filter((item) => item.id !== thread.id),
        ].slice(0, 20)
        while (
          next.length > 1 &&
          JSON.stringify(next).length > maxStorageLength
        )
          next.pop()
        return next
      })
    },
    []
  )

  const deleteThread = useCallback((id: string) => {
    setThreads((current) => current.filter((thread) => thread.id !== id))
  }, [])

  return { threads, saveThread, deleteThread, storageNotice }
}
