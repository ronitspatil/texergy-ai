"use client"

import { useEffect, useRef } from "react"

interface AnimatedNoiseProps {
  opacity?: number
  className?: string
}

export function AnimatedNoise({ opacity = 0.05, className }: AnimatedNoiseProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationId: number
    let frame = 0

    const resize = () => {
      canvas.width = Math.max(1, Math.floor(canvas.offsetWidth / 2))
      canvas.height = Math.max(1, Math.floor(canvas.offsetHeight / 2))
    }

    const generateNoise = () => {
      // Guard the zero case: a tab that lays out before it has been sized gives
      // us a 0x0 canvas, and createImageData(0, 0) throws — which would kill the
      // rAF loop for good, so the grain never appears even once the tab resizes.
      if (canvas.width < 1 || canvas.height < 1) return

      const imageData = ctx.createImageData(canvas.width, canvas.height)
      const data = imageData.data

      for (let i = 0; i < data.length; i += 4) {
        const value = Math.random() * 255
        data[i] = value // R
        data[i + 1] = value // G
        data[i + 2] = value // B
        data[i + 3] = 255 // A
      }

      ctx.putImageData(imageData, 0, 0)
    }

    const animate = () => {
      frame++
      // Update noise every 2 frames for performance while still looking animated
      if (frame % 2 === 0) {
        generateNoise()
      }
      animationId = requestAnimationFrame(animate)
    }

    resize()
    // Observe the canvas itself rather than the window: the hero can change
    // height without the window resizing (fonts swapping in, --vph landing).
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    animate()

    return () => {
      observer.disconnect()
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        opacity,
        mixBlendMode: "overlay",
      }}
    />
  )
}
