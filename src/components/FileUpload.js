"use client"

import { useState } from "react"
import { ArrowUpTrayIcon } from "@heroicons/react/24/outline"

export default function FileUpload({ onFileSelect }) {
  const [isDragging, setIsDragging] = useState(false)

  const handleFileSelect = async (file) => {
    if (!file) return

    // Check if file is an audio file
    if (!file.type.startsWith("audio/")) {
      alert("Please select an audio file")
      return
    }

    try {
      // Create a blob URL with proper MIME type
      const blob = new Blob([file], { type: file.type })
      const fileUrl = URL.createObjectURL(blob)

      // Set up cleanup when the URL is no longer needed
      setTimeout(() => {
        URL.revokeObjectURL(fileUrl)
      }, 1000) // Give some time for the audio element to load the URL

      onFileSelect(fileUrl, file.name, file)
    } catch (error) {
      console.error("Error handling file:", error)
      alert("Error reading file. Please try again.")
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    handleFileSelect(file)
  }

  const handleFileInput = (e) => {
    const file = e.target.files[0]
    handleFileSelect(file)
  }

  return (
    <div
      className={`w-full max-w-md p-8 border-2 border-dashed rounded-lg text-center ${
        isDragging
          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
          : "border-gray-300 dark:border-gray-600"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        id="file-upload"
        className="hidden"
        accept="audio/*"
        onChange={handleFileInput}
      />
      <label
        htmlFor="file-upload"
        className="cursor-pointer flex flex-col items-center gap-4"
      >
        <ArrowUpTrayIcon className="w-12 h-12 text-gray-400" />
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Select an audiobook file
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            or drag and drop
          </p>
        </div>
      </label>
    </div>
  )
}
