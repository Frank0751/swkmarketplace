import { cn } from '@/lib/utils'

interface SectionHeadingProps {
  eyebrow: string
  title: React.ReactNode
  subtitle?: React.ReactNode
  align?: 'left' | 'center'
  /** On a forest-green section */
  onDark?: boolean
  as?: 'h1' | 'h2'
  className?: string
}

/**
 * The house pattern for a section's opening: a mono eyebrow label, the title,
 * a short gold rule, then one line of context. Highlight words in the title by
 * wrapping them in <span className="text-green-600"> (colour, never italic).
 */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'left',
  onDark = false,
  as: Heading = 'h2',
  className,
}: SectionHeadingProps) {
  const centered = align === 'center'
  return (
    <div className={cn(centered && 'text-center mx-auto', 'max-w-2xl', className)}>
      <p className={cn('eyebrow mb-3', onDark && 'eyebrow-on-dark')}>{eyebrow}</p>
      <Heading
        className={cn(
          'font-bold tracking-[-0.02em] leading-[1.1] text-balance text-[clamp(1.75rem,3.6vw,2.75rem)]',
          onDark ? 'text-white' : 'text-sand-900',
        )}
      >
        {title}
      </Heading>
      <span className={cn('rule mt-4', centered && 'mx-auto')} aria-hidden="true" />
      {subtitle && (
        <p className={cn('mt-4 text-base md:text-lg leading-relaxed', onDark ? 'text-green-50/90' : 'text-sand-700')}>
          {subtitle}
        </p>
      )}
    </div>
  )
}
