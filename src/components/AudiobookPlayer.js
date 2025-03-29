"use client"

import { useState, useRef, useEffect } from "react"
import {
  PlayIcon,
  PauseIcon,
  ForwardIcon,
  BackwardIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
} from "@heroicons/react/24/solid"
import FileUpload from "./FileUpload"

export default function AudiobookPlayer({ onAudiobookChange }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentFile, setCurrentFile] = useState(null)
  const [currentFileData, setCurrentFileData] = useState(null)
  const [currentFileName, setCurrentFileName] = useState("")
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [currentContext, setCurrentContext] = useState("")
  const [isLoadingContext, setIsLoadingContext] = useState(false)
  const audioRef = useRef(null)
  const isRequestInProgress = useRef(false)
  const lastRequestTime = useRef(0)
  const CONTEXT_WINDOW = 30 // 30 seconds total window (15 before + 15 after)
  const REQUEST_DEBOUNCE = CONTEXT_WINDOW * 1000 // Match the context window size

  // Extract text content based on current time
  const extractTextContent = async (startTime, endTime) => {
    // Don't extract if audio is not playing or has ended
    if (!isPlaying || currentTime >= duration) {
      console.log("Audio not playing or ended, skipping text extraction")
      return ""
    }

    // Prevent multiple simultaneous requests
    if (isRequestInProgress.current) {
      console.log("Request already in progress, skipping...")
      return ""
    }

    // Debounce requests
    const now = Date.now()
    if (now - lastRequestTime.current < REQUEST_DEBOUNCE) {
      console.log("Request too soon, skipping...")
      return ""
    }

    try {
      isRequestInProgress.current = true
      setIsLoadingContext(true)
      lastRequestTime.current = now

      // Create a blob from the audio data
      const audioBlob = new Blob([currentFileData], {
        type: currentFileData.type,
      })

      const formData = new FormData()
      formData.append("audio", audioBlob, currentFileName)
      formData.append("startTime", startTime)
      formData.append("endTime", endTime)

      console.log(
        `Sending request for time window: ${startTime}s to ${endTime}s`
      )
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to extract text")
      }

      const data = await response.json()
      return data.text
    } catch (error) {
      console.error("Text extraction error:", error)
      return ""
    } finally {
      setIsLoadingContext(false)
      isRequestInProgress.current = false
    }
  }

  // Update context based on current time
  useEffect(() => {
    let intervalId
    let finalTimeout
    let finalCheckInterval

    if (currentFileData && isPlaying) {
      // Extract first context immediately when play is clicked
      const extractInitialContext = async () => {
        const currentPosition = audioRef.current.currentTime
        const text = await extractTextContent(
          0,
          Math.min(15, currentPosition + 15)
        )
        if (text) {
          setCurrentContext(text)
        }
      }
      extractInitialContext()

      // Then set up regular interval for 30-second windows
      intervalId = setInterval(async () => {
        const currentPosition = audioRef.current.currentTime
        const audioDuration = audioRef.current.duration

        // Skip if audio has ended
        if (currentPosition >= audioDuration) {
          return
        }

        // Handle start of audio (first 15 seconds)
        let startTime = currentPosition - 15

        // Handle end of audio (last 15 seconds)
        let endTime = currentPosition + 15
        if (endTime > audioDuration) {
          endTime = audioDuration
          startTime = Math.max(0, endTime - 30) // Get last 30 seconds if possible
        }

        console.log(
          `Processing window: ${startTime.toFixed(2)}s to ${endTime.toFixed(
            2
          )}s`
        )
        const text = await extractTextContent(startTime, endTime)
        if (text) {
          setCurrentContext(text)
        }
      }, CONTEXT_WINDOW * 1000) // Regular interval for 30-second windows

      // Set up final call for last 15 seconds
      const checkForFinalCall = () => {
        const currentPosition = audioRef.current.currentTime
        const audioDuration = audioRef.current.duration
        const timeLeft = audioDuration - currentPosition

        // Skip if audio has ended
        if (currentPosition >= audioDuration) {
          return
        }

        if (timeLeft <= 15) {
          // Make final call to get last 15 seconds
          finalTimeout = setTimeout(async () => {
            const text = await extractTextContent(
              Math.max(0, audioDuration - 15),
              audioDuration
            )
            if (text) {
              setCurrentContext(text)
            }
          }, timeLeft * 1000)
        }
      }

      // Check for final call every second
      finalCheckInterval = setInterval(checkForFinalCall, 1000)
    }

    // Cleanup function to clear all intervals and timeouts
    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
      if (finalTimeout) {
        clearTimeout(finalTimeout)
      }
      if (finalCheckInterval) {
        clearInterval(finalCheckInterval)
      }
    }
  }, [currentFileData, isPlaying])

  // Update context for AI
  useEffect(() => {
    if (currentFile) {
      onAudiobookChange({
        fileName: currentFileName,
        currentTime,
        duration,
        isPlaying,
        context: currentContext,
      })
    } else {
      onAudiobookChange(null)
    }
  }, [
    currentFile,
    currentFileName,
    currentTime,
    duration,
    isPlaying,
    currentContext,
    onAudiobookChange,
  ])

  const handleFileSelect = async (fileUrl, fileName, fileData) => {
    setCurrentFile(fileUrl)
    setCurrentFileData(fileData)
    setCurrentFileName(fileName)
    setCurrentTime(0)
    setDuration(0)
    setIsPlaying(false)
    setCurrentContext("")
  }

  const togglePlay = () => {
    if (!currentFile) return

    if (isPlaying) {
      audioRef.current.pause()
      // Clear any ongoing text extraction
      if (isRequestInProgress.current) {
        isRequestInProgress.current = false
        setIsLoadingContext(false)
      }
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleTimeUpdate = () => {
    setCurrentTime(audioRef.current.currentTime)
  }

  const handleLoadedMetadata = () => {
    setDuration(audioRef.current.duration)
  }

  const handleSeek = (e) => {
    const time = e.target.value
    audioRef.current.currentTime = time
    setCurrentTime(time)
  }

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    audioRef.current.volume = newVolume
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
    audioRef.current.volume = isMuted ? volume : 0
  }

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  return (
    <div className="h-full bg-gray-900 border-t border-gray-800">
      {!currentFile ? (
        <div className="h-full flex items-center justify-center">
          <FileUpload onFileSelect={handleFileSelect} />
        </div>
      ) : (
        <div className="h-full grid grid-cols-3 items-center px-4">
          {/* Left section - Track info */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <p className="text-sm font-semibold truncate max-w-[120px]">
                  {currentFileName}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setCurrentFile(null)
                setCurrentFileName("")
                setCurrentTime(0)
                setDuration(0)
                setIsPlaying(false)
              }}
              className="text-sm text-gray-400 hover:text-gray-300"
            >
              Upload Different File
            </button>
          </div>

          {/* Center section - Playback controls */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-6">
              <button className="p-2 hover:bg-gray-700 rounded-full">
                <BackwardIcon className="w-5 h-5" />
              </button>
              <button
                onClick={togglePlay}
                className="p-3 bg-white hover:bg-gray-100 rounded-full text-black"
              >
                {isPlaying ? (
                  <PauseIcon className="w-6 h-6" />
                ) : (
                  <PlayIcon className="w-6 h-6" />
                )}
              </button>
              <button className="p-2 hover:bg-gray-700 rounded-full">
                <ForwardIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="w-full max-w-md">
              <input
                type="range"
                min="0"
                max={duration}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>

          {/* Right section - Volume control */}
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={toggleMute}
              className="p-2 hover:bg-gray-700 rounded-full"
            >
              {isMuted ? (
                <SpeakerXMarkIcon className="w-5 h-5" />
              ) : (
                <SpeakerWaveIcon className="w-5 h-5" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-24 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      )}

      <audio
        ref={audioRef}
        src={currentFile}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        className="hidden"
      />
    </div>
  )
}
