"use client"

import type React from "react"
import { motion } from "framer-motion"
import { useMemo, useState, useCallback, useEffect, useRef } from "react"

interface SplitFlapTextProps {
  text: string
  className?: string
  speed?: number
  accentIndices?: number[]
  /** CSS length for one tile's font-size. Drives tile width/height too, so
   *  it is the single knob for how big the board reads. The default is capped
   *  on viewport width, viewport height and an absolute max so a 9-character
   *  board always clears the hero's padding and leaves room below it. */
  size?: string
}

const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("")

// Fallback for standalone use. The hero overrides this with --hero-flap
// (app/globals.css), whose width cap steps with the hero's own padding.
//
// Three caps, whichever binds first:
//   --vpw * 13 — a 9-tile board is ~5.85em wide, so this all but fills the
//              space left by the hero's widest horizontal padding (10rem at
//              md+). This is the cap that binds on phones and tablets, where
//              the board has height to spare but not width.
//   --vph * 30 − 88px — the height left over once the headline, the copy and
//              the ZIP card (which grow with viewport height too) have taken
//              their share. Fitted against the real layout so the whole hero
//              clears the nav and stays above the fold from 568px tall upward.
//   11.25rem — absolute ceiling on large displays.
// max() floors the whole thing so the board stays legible on ~320px phones.
// --vpw/--vph rather than vw/svh so the board can't collapse to its floor when
// Chrome lays the page out before the tab is sized (components/viewport-units).
const DEFAULT_FLAP_SIZE =
  "max(2.25rem, min(calc(var(--vpw) * 13), calc(var(--vph) * 30 - 88px), 11.25rem))"

function SplitFlapTextInner({ text, className = "", speed = 50, accentIndices = [], size = DEFAULT_FLAP_SIZE }: SplitFlapTextProps) {
  const chars = useMemo(() => text.split(""), [text])
  const accentSet = useMemo(() => new Set(accentIndices), [accentIndices])
  const [animationKey, setAnimationKey] = useState(0)
  const [hasInitialized, setHasInitialized] = useState(false)

  const handleMouseEnter = useCallback(() => {
    setAnimationKey((prev) => prev + 1)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setHasInitialized(true)
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      className={`inline-flex gap-[0.08em] items-center cursor-pointer ${className}`}
      aria-label={text}
      onMouseEnter={handleMouseEnter}
      style={{ perspective: "1000px", "--flap-size": size } as React.CSSProperties}
    >
      {chars.map((char, index) => (
        <SplitFlapChar
          key={index}
          char={char.toUpperCase()}
          index={index}
          animationKey={animationKey}
          skipEntrance={hasInitialized}
          speed={speed}
          accent={accentSet.has(index)}
        />
      ))}
    </div>
  )
}

export function SplitFlapText(props: SplitFlapTextProps) {
  return <SplitFlapTextInner {...props} />
}

interface SplitFlapCharProps {
  char: string
  index: number
  animationKey: number
  skipEntrance: boolean
  speed: number
  accent?: boolean
}

function SplitFlapChar({ char, index, animationKey, skipEntrance, speed, accent = false }: SplitFlapCharProps) {
  const isPeriod = char === "."
  const displayChar = CHARSET.includes(char) || isPeriod ? char : " "
  const isSpace = char === " "
  const [currentChar, setCurrentChar] = useState(skipEntrance ? displayChar : " ")
  const [isSettled, setIsSettled] = useState(skipEntrance)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const tileDelay = 0.15 * index

  const bgColor = isSettled ? "var(--split-flap-bg)" : "var(--split-flap-bg-active)"
  const textColor = isSettled ? (accent ? "var(--accent)" : "var(--split-flap-text)") : "var(--accent)"

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    if (isSpace) {
      setCurrentChar(" ")
      setIsSettled(true)
      return
    }

    if (isPeriod) {
      setCurrentChar(".")
      setIsSettled(true)
      return
    }

    setIsSettled(false)
    setCurrentChar(CHARSET[Math.floor(Math.random() * CHARSET.length)])

    const baseFlips = 8
    const startDelay = skipEntrance ? tileDelay * 400 : tileDelay * 800
    let flipIndex = 0
    let hasStartedSettling = false

    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        const settleThreshold = baseFlips + index * 3

        if (flipIndex >= settleThreshold && !hasStartedSettling) {
          hasStartedSettling = true
          if (intervalRef.current) clearInterval(intervalRef.current)
          setCurrentChar(displayChar)
          setIsSettled(true)
          return
        }
        setCurrentChar(CHARSET[Math.floor(Math.random() * CHARSET.length)])
        flipIndex++
      }, speed)
    }, startDelay)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [displayChar, isSpace, tileDelay, animationKey, skipEntrance, index, speed])

  if (isSpace) {
    return (
      <div
        style={{
          width: "0.3em",
          fontSize: "calc(var(--flap-size) * 1.14)",
        }}
      />
    )
  }

  if (isPeriod) {
    return (
      <motion.div
        initial={skipEntrance ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: tileDelay, duration: 0.3, ease: "easeOut" }}
        className="flex items-end justify-center"
        style={{
          fontSize: "calc(var(--flap-size) * 1.14)",
          width: "0.25em",
          height: "1.05em",
        }}
        aria-hidden="true"
      >
        <span
          className="leading-none transition-colors duration-150"
          style={{
            color: accent ? "var(--accent)" : "var(--split-flap-text)",
            transform: "translateY(-0.05em)",
          }}
        >
          .
        </span>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={skipEntrance ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: tileDelay, duration: 0.3, ease: "easeOut" }}
      className="relative overflow-hidden flex items-center justify-center font-[family-name:var(--font-bebas)]"
      style={{
        fontSize: "var(--flap-size)",
        width: "0.65em",
        height: "1.05em",
        backgroundColor: bgColor,
        transformStyle: "preserve-3d",
        transition: "background-color 0.15s ease",
      }}
    >
      <div
        className="absolute inset-x-0 top-1/2 h-[1px] pointer-events-none z-10"
        style={{ backgroundColor: "var(--split-flap-divider)" }}
      />

      <div className="absolute inset-x-0 top-0 bottom-1/2 flex items-end justify-center overflow-hidden">
        <span
          className="block translate-y-[0.52em] leading-none transition-colors duration-150"
          style={{ color: textColor }}
        >
          {currentChar}
        </span>
      </div>

      <div className="absolute inset-x-0 top-1/2 bottom-0 flex items-start justify-center overflow-hidden">
        <span
          className="-translate-y-[0.52em] leading-none transition-colors duration-150"
          style={{ color: textColor }}
        >
          {currentChar}
        </span>
      </div>

      <motion.div
        key={`${animationKey}-${isSettled}`}
        initial={{ rotateX: -90 }}
        animate={{ rotateX: 0 }}
        transition={{
          delay: skipEntrance ? tileDelay * 0.5 : tileDelay + 0.15,
          duration: 0.25,
          ease: [0.22, 0.61, 0.36, 1],
        }}
        className="absolute inset-x-0 top-0 bottom-1/2 origin-bottom overflow-hidden"
        style={{
          backgroundColor: bgColor,
          transformStyle: "preserve-3d",
          backfaceVisibility: "hidden",
          transition: "background-color 0.15s ease",
        }}
      >
        <div className="flex h-full items-end justify-center">
          <span
            className="translate-y-[0.52em] leading-none transition-colors duration-150"
            style={{ color: textColor }}
          >
            {currentChar}
          </span>
        </div>
      </motion.div>
    </motion.div>
  )
}
