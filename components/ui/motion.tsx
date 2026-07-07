'use client'

import { useEffect, useRef, useState } from 'react'
import {
  motion,
  useInView,
  useReducedMotion,
  type Variants,
} from 'framer-motion'

// Shared motion primitives. All viewport-triggered, all respect
// prefers-reduced-motion (content appears instantly, no translation).

type Direction = 'up' | 'down' | 'left' | 'right' | 'none'

const OFFSET = 28

function directionOffset(direction: Direction) {
  switch (direction) {
    case 'up':    return { y: OFFSET }
    case 'down':  return { y: -OFFSET }
    case 'left':  return { x: OFFSET }
    case 'right': return { x: -OFFSET }
    default:      return {}
  }
}

interface FadeInProps {
  children: React.ReactNode
  direction?: Direction
  delay?: number
  duration?: number
  className?: string
  once?: boolean
}

export function FadeIn({
  children,
  direction = 'up',
  delay = 0,
  duration = 0.6,
  className,
  once = true,
}: FadeInProps) {
  const reduce = useReducedMotion()

  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 1 } : { opacity: 0, ...directionOffset(direction) }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once, margin: '-60px' }}
      transition={{ duration, delay, ease: [0.21, 0.65, 0.35, 1] }}
    >
      {children}
    </motion.div>
  )
}

// ─── Stagger ───────────────────────────────────────────────────────────────────

const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
}

interface StaggerProps {
  children: React.ReactNode
  className?: string
}

export function Stagger({ children, className }: StaggerProps) {
  return (
    <motion.div
      className={className}
      variants={staggerContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({
  children,
  className,
  direction = 'up',
}: {
  children: React.ReactNode
  className?: string
  direction?: Direction
}) {
  const reduce = useReducedMotion()

  const item: Variants = {
    hidden: reduce ? { opacity: 1 } : { opacity: 0, ...directionOffset(direction) },
    show: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: { duration: 0.55, ease: [0.21, 0.65, 0.35, 1] },
    },
  }

  return (
    <motion.div className={className} variants={item}>
      {children}
    </motion.div>
  )
}

// ─── CountUp ───────────────────────────────────────────────────────────────────

interface CountUpProps {
  end: number
  prefix?: string
  suffix?: string
  duration?: number
  className?: string
}

export function CountUp({ end, prefix = '', suffix = '', duration = 1.6, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const reduce = useReducedMotion()
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!inView) return
    if (reduce) {
      setValue(end)
      return
    }
    let frame: number
    const start = performance.now()
    const total = duration * 1000

    const tick = (now: number) => {
      const progress = Math.min((now - start) / total, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * end))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [inView, end, duration, reduce])

  return (
    <span ref={ref} className={className}>
      {prefix}{value.toLocaleString()}{suffix}
    </span>
  )
}
