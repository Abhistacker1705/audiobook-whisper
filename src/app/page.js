"use client"

import { useState } from "react"
import AudiobookPlayer from "@/components/AudiobookPlayer"
import AIAssistant from "@/components/AIAssistant"

export default function Home() {
  const [currentAudiobook, setCurrentAudiobook] = useState(null)

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <header className="p-6 border-b border-gray-700">
        <h1 className="text-3xl font-bold text-center">Audiobook Assistant</h1>
      </header>

      <main className="flex flex-col h-[calc(100vh-180px)]">
        <div className="h-[80vh] overflow-y-auto">
          <AIAssistant currentAudiobook={currentAudiobook} />
        </div>
        <div className="h-[20vh]">
          <AudiobookPlayer onAudiobookChange={setCurrentAudiobook} />
        </div>
      </main>
    </div>
  )
}
