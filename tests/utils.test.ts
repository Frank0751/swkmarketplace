import { describe, it, expect } from 'vitest'
import {
  formatCurrency,
  formatCurrencyCompact,
  generateSlug,
  calculateCommission,
  truncate,
  getProductImageUrl,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
} from '@/lib/utils'

describe('formatCurrency', () => {
  it('formats GHS with two decimals', () => {
    const result = formatCurrency(45)
    expect(result).toContain('45.00')
    expect(result).toMatch(/GH/)
  })

  it('formats large amounts with grouping', () => {
    expect(formatCurrency(1250.5)).toContain('1,250.50')
  })
})

describe('formatCurrencyCompact', () => {
  it('abbreviates thousands', () => {
    expect(formatCurrencyCompact(12500)).toBe('GHS 12.5K')
  })

  it('abbreviates millions', () => {
    expect(formatCurrencyCompact(2_400_000)).toBe('GHS 2.4M')
  })
})

describe('generateSlug', () => {
  it('lowercases, strips symbols, and appends a unique suffix', () => {
    const slug = generateSlug('Raw Forest Honey (500ml)!')
    expect(slug).toMatch(/^raw-forest-honey-500ml-[a-z0-9]{5}$/)
  })

  it('produces different suffixes on repeated calls', () => {
    expect(generateSlug('Same Title')).not.toBe(generateSlug('Same Title'))
  })
})

describe('calculateCommission', () => {
  it('applies the 15% platform rate by default', () => {
    const { gross, commission, net } = calculateCommission(100)
    expect(gross).toBe(100)
    expect(commission).toBe(15)
    expect(net).toBe(85)
  })

  it('keeps gross = commission + net for awkward amounts', () => {
    const { gross, commission, net } = calculateCommission(99.99)
    expect(commission + net).toBeCloseTo(gross, 2)
  })
})

describe('truncate', () => {
  it('leaves short strings alone', () => {
    expect(truncate('short', 10)).toBe('short')
  })

  it('cuts long strings with an ellipsis', () => {
    expect(truncate('a'.repeat(20), 10)).toBe('a'.repeat(10) + '…')
  })
})

describe('getProductImageUrl', () => {
  it('returns the requested image', () => {
    expect(getProductImageUrl(['/a.jpg', '/b.jpg'], 1)).toBe('/b.jpg')
  })

  it('falls back to the placeholder when empty', () => {
    expect(getProductImageUrl([])).toBe('/images/product-placeholder.svg')
  })
})

describe('order status maps', () => {
  const STATUSES = [
    'pending', 'paid', 'confirmed', 'dispatched',
    'delivered', 'released', 'disputed', 'refunded', 'cancelled',
  ]

  it('has a label for every order status', () => {
    for (const status of STATUSES) {
      expect(ORDER_STATUS_LABELS[status], `label for ${status}`).toBeTruthy()
    }
  })

  it('has a badge colour for every order status', () => {
    for (const status of STATUSES) {
      expect(ORDER_STATUS_COLORS[status], `colour for ${status}`).toBeTruthy()
    }
  })
})
