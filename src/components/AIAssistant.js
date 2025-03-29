"use client"

import { useState } from "react"
import { PaperAirplaneIcon } from "@heroicons/react/24/solid"

export default function AIAssistant({ currentAudiobook }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage = { role: "user", content: input }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: input,
          audiobookContext: currentAudiobook
            ? {
                fileName: currentAudiobook.fileName,
                currentTime: currentAudiobook.currentTime,
                duration: currentAudiobook.duration,
                isPlaying: currentAudiobook.isPlaying,
                context: currentAudiobook.context,
              }
            : null,
        }),
      })

      const data = await response.json()
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.message },
      ])
    } catch (error) {
      console.error("Error:", error)
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl h-full flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-xl font-semibold">AI Assistant</h2>
        <p className="text-sm text-gray-400">
          {currentAudiobook
            ? `Currently playing: ${currentAudiobook.fileName}`
            : "No audiobook playing"}
        </p>
        {currentAudiobook?.context && (
          <div className="mt-2 p-2 bg-gray-700 rounded text-xs text-gray-300">
            <p className="font-medium">Current Context:</p>
            <p className="truncate">{currentAudiobook.context}</p>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-200"
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-700 rounded-lg p-3 text-gray-200">
              Thinking...
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question or take a note..."
            className="flex-1 bg-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2 disabled:opacity-50"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  )
}
