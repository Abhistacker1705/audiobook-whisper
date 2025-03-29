import { NextResponse } from "next/server"
import { writeFile } from "fs/promises"
import { join } from "path"
import { v4 as uuid } from "uuid"

export async function POST(req) {
  try {
    const formData = await req.formData()
    const file = formData.get("file")

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Create a unique filename
    const uniqueId = uuid()
    const extension = file.name.split(".").pop()
    const filename = `${uniqueId}.${extension}`

    // Save to public/uploads directory
    const uploadDir = join(process.cwd(), "public", "uploads")
    const filepath = join(uploadDir, filename)

    await writeFile(filepath, buffer)

    // Return the URL that can be used to access the file
    return NextResponse.json({
      fileUrl: `/uploads/${filename}`,
      filename: file.name,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    )
  }
}
