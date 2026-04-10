"use client"

import { useEffect, useRef, useState } from "react"
import { Play, Pause, Download, Volume2, VolumeX } from "lucide-react"

interface AudioPlayerProps {
  src: string
  filename?: string
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00"
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

export function AudioPlayer({ src, filename = "recording.mp3" }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [muted, setMuted] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onLoaded = () => { setDuration(audio.duration); setLoading(false) }
    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onEnded = () => setPlaying(false)
    const onError = () => setLoading(false)

    audio.addEventListener("loadedmetadata", onLoaded)
    audio.addEventListener("timeupdate", onTimeUpdate)
    audio.addEventListener("ended", onEnded)
    audio.addEventListener("error", onError)

    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded)
      audio.removeEventListener("timeupdate", onTimeUpdate)
      audio.removeEventListener("ended", onEnded)
      audio.removeEventListener("error", onError)
    }
  }, [src])

  function togglePlay() {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
    } else {
      audio.play()
    }
    setPlaying(!playing)
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current
    if (!audio) return
    const time = parseFloat(e.target.value)
    audio.currentTime = time
    setCurrentTime(time)
  }

  function changeSpeed() {
    const audio = audioRef.current
    if (!audio) return
    const speeds = [1, 1.25, 1.5, 2, 0.5, 0.75]
    const idx = speeds.indexOf(speed)
    const next = speeds[(idx + 1) % speeds.length]
    audio.playbackRate = next
    setSpeed(next)
  }

  function toggleMute() {
    const audio = audioRef.current
    if (!audio) return
    audio.muted = !muted
    setMuted(!muted)
  }

  return (
    <div className="rounded-lg border border-border/80 bg-card shadow-sm p-4 space-y-3">
      <audio ref={audioRef} src={src} preload="metadata" />

      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          disabled={loading}
          className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50"
        >
          {playing ? <Pause className="size-4" /> : <Play className="size-4 ml-0.5" />}
        </button>

        <div className="flex-1">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full accent-primary"
            disabled={loading}
          />
          <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground font-mono">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <button
          onClick={changeSpeed}
          className="px-2.5 h-8 rounded border text-xs font-semibold hover:bg-muted transition-colors cursor-pointer min-w-[45px]"
          title="Playback speed"
        >
          {speed}x
        </button>

        <button
          onClick={toggleMute}
          className="w-8 h-8 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          title={muted ? "Unmute" : "Mute"}
        >
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </button>

        <a
          href={src}
          download={filename}
          target="_blank"
          rel="noopener noreferrer"
          className="w-8 h-8 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          title="Download"
        >
          <Download className="size-4" />
        </a>
      </div>
    </div>
  )
}
