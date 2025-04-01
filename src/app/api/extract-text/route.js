import { NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { writeFile, readFile, unlink } from "fs/promises"
import { join } from "path"
import ffmpeg from "fluent-ffmpeg"
import ffmpegStatic from "ffmpeg-static"
import { existsSync } from "fs"

// Configure FFmpeg
const ffmpegPath = join(
  process.cwd(),
  "node_modules",
  "ffmpeg-static",
  "ffmpeg"
)
console.log("FFmpeg path:", ffmpegPath)
console.log("FFmpeg exists:", existsSync(ffmpegPath))

if (!existsSync(ffmpegPath)) {
  throw new Error(`FFmpeg not found at path: ${ffmpegPath}`)
}

ffmpeg.setFfmpegPath(ffmpegPath)

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

    // Create temporary file paths
    const tempDir = "/tmp"
    const inputPath = join(tempDir, `${uuidv4()}.mp3`)
    const outputPath = join(tempDir, `${uuidv4()}.mp3`)

    try {
      // Write the uploaded file to disk
      const buffer = Buffer.from(await audioFile.arrayBuffer())
      await writeFile(inputPath, buffer)

      // Extract the audio segment using FFmpeg
      await new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .setStartTime(startTime)
          .setDuration(endTime - startTime)
          .outputOptions("-c copy")
          .save(outputPath)
          .on("start", (commandLine) => {
            console.log("FFmpeg command:", commandLine)
          })
          .on("progress", (progress) => {
            console.log("FFmpeg progress:", progress)
          })
          .on("end", () => {
            console.log("FFmpeg processing finished")
            resolve()
          })
          .on("error", (err) => {
            console.error("FFmpeg error:", err)
            reject(err)
          })
      })

      // Read the extracted audio file
      const extractedAudio = await readFile(outputPath)

      // Send to Whisper API
      const whisperFormData = new FormData()
      const segmentFile = new File([extractedAudio], "audio.mp3", {
        type: "audio/mp3",
      })
      whisperFormData.append("file", segmentFile)
      whisperFormData.append("model", "whisper-1")

      const response = await fetch(
        "https://api.openai.com/v1/audio/transcriptions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: whisperFormData,
        }
      )

      if (!response.ok) {
        const error = await response.text()
        console.error("Whisper API error:", error)
        throw new Error(`Whisper API error: ${error}`)
      }

      const whisperResponse = await response.json()
      return NextResponse.json({ text: whisperResponse.text })
    } finally {
      // Clean up temporary files
      try {
        await unlink(inputPath)
        await unlink(outputPath)
      } catch (error) {
        console.error("Error cleaning up temporary files:", error)
      }
    }
  } catch (error) {
    console.error("Error processing audio:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
