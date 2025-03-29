import { NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req) {
  try {
    const formData = await req.formData()
    const audioFile = formData.get("audio")
    const startTime = formData.get("startTime")
    const endTime = formData.get("endTime")

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      )
    }

    // Extract text for the specified time range
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "en",
      response_format: "text",
      timestamp_granularities: ["segment"],
      start: startTime ? parseInt(startTime) : undefined,
      end: endTime ? parseInt(endTime) : undefined,
    })

    return NextResponse.json({ text: transcription })
  } catch (error) {
    console.error("Text extraction error:", error)
    return NextResponse.json(
      { error: "Failed to extract text from audio" },
      { status: 500 }
    )
  }
}
