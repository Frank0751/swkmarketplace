import { afterEach, describe, it, expect, vi } from 'vitest'
import { AuthApiError, AuthPKCECodeVerifierMissingError } from '@supabase/supabase-js'
import {
  failedCodeNotice,
  firstStopAfterSignup,
  loginPath,
  missingCodeNotice,
  signupRole,
} from '@/lib/auth/callback'
import { readAuthNext, rememberAuthNext } from '@/lib/auth/next-cookie'

describe('the role picked at sign-up', () => {
  it('keeps buyer and vendor, the two choices on the form', () => {
    expect(signupRole({ role: 'buyer' })).toBe('buyer')
    expect(signupRole({ role: 'vendor', full_name: 'Ama Owusu' })).toBe('vendor')
  })

  it('makes everyone else a buyer, as the database trigger does', () => {
    expect(signupRole({ role: 'admin' })).toBe('buyer')
    expect(signupRole({ role: ['vendor'] })).toBe('buyer')
    expect(signupRole({ name: 'Kofi', picture: 'https://example.com/k.png' })).toBe('buyer') // Google
    expect(signupRole(null)).toBe('buyer')
    expect(signupRole(undefined)).toBe('buyer')
  })
})

describe('first stop after sign-up', () => {
  it('sends sellers to their application, wherever they started', () => {
    expect(firstStopAfterSignup('vendor', null)).toBe('/vendor/apply')
    expect(firstStopAfterSignup('vendor', '/checkout')).toBe('/vendor/apply')
  })

  it('sends buyers back to the page they were on, or to their dashboard', () => {
    expect(firstStopAfterSignup('buyer', '/checkout')).toBe('/checkout')
    expect(firstStopAfterSignup('buyer', null)).toBe('/buyer/dashboard')
  })

  it('never sends anyone to another site', () => {
    expect(firstStopAfterSignup('buyer', '//evil.example')).toBe('/buyer/dashboard')
    expect(firstStopAfterSignup('buyer', 'https://evil.example')).toBe('/buyer/dashboard')
  })
})

describe('what the sign-in page says when the callback fails', () => {
  it('a confirmation link opened in another browser means the email is confirmed', () => {
    // The error auth-js gives when this browser holds no code verifier
    const otherBrowser = new AuthPKCECodeVerifierMissingError()
    expect(failedCodeNotice(otherBrowser.code, false)).toBe('email_confirmed')
  })

  it('after an email sign-up in this browser, a failed exchange still means a confirmed email', () => {
    const lapsed = new AuthApiError('invalid flow state, flow state has expired', 422, 'flow_state_expired')
    const replaced = new AuthApiError('code challenge does not match previously saved code verifier', 400, 'bad_code_verifier')
    expect(failedCodeNotice(lapsed.code, true)).toBe('email_confirmed')
    expect(failedCodeNotice(replaced.code, true)).toBe('email_confirmed')
  })

  it('anything else is a Google sign-in that did not complete', () => {
    expect(failedCodeNotice('bad_code_verifier', false)).toBe('oauth')
    expect(failedCodeNotice('flow_state_not_found', false)).toBe('oauth')
    expect(failedCodeNotice(undefined, false)).toBe('oauth')
  })

  it('an expired or used email link is not reported as a Google error', () => {
    expect(missingCodeNotice('otp_expired')).toBe('link_expired')
    expect(missingCodeNotice(null)).toBe('oauth')
    expect(missingCodeNotice('bad_oauth_state')).toBe('oauth')
  })

  it('keeps the page they were headed for', () => {
    expect(loginPath('email_confirmed', '/checkout')).toBe('/login?error=email_confirmed&redirect=%2Fcheckout')
    expect(loginPath('link_expired', '/vendor/apply')).toBe('/login?error=link_expired&redirect=%2Fvendor%2Fapply')
    expect(loginPath('oauth', null)).toBe('/login?error=oauth')
  })
})

describe('remembering the page to return to', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // Just enough of a browser to see the cookies written
  function browser(protocol = 'http:') {
    const written: string[] = []
    vi.stubGlobal('window', { location: { protocol } })
    vi.stubGlobal('document', { set cookie(value: string) { written.push(value) } })
    return written
  }

  it('an email sign-up keeps the page for as long as the link lasts, and says so', () => {
    const written = browser()
    rememberAuthNext('/checkout', { emailSignup: true })
    expect(written).toEqual([
      'swk_auth_next=%2Fcheckout; Path=/; Max-Age=86400; SameSite=Lax',
      'swk_email_signup=1; Path=/; Max-Age=86400; SameSite=Lax',
    ])
  })

  it('Google sign-in keeps it for ten minutes and forgets an earlier email sign-up', () => {
    const written = browser('https:')
    rememberAuthNext('/checkout')
    expect(written).toEqual([
      'swk_auth_next=%2Fcheckout; Path=/; Max-Age=600; SameSite=Lax; Secure',
      'swk_email_signup=; Path=/; Max-Age=0; SameSite=Lax; Secure',
    ])
  })

  it('forgets both when there is nowhere to go back to', () => {
    const written = browser()
    rememberAuthNext(null)
    expect(written).toEqual([
      'swk_auth_next=; Path=/; Max-Age=0; SameSite=Lax',
      'swk_email_signup=; Path=/; Max-Age=0; SameSite=Lax',
    ])
  })

  it('never remembers another site', () => {
    const written = browser()
    rememberAuthNext('//evil.example', { emailSignup: true })
    expect(written[0]).toBe('swk_auth_next=; Path=/; Max-Age=0; SameSite=Lax')
  })

  it('reads back only paths on this site', () => {
    expect(readAuthNext('%2Fcheckout')).toBe('/checkout')
    expect(readAuthNext('%2F%2Fevil.example')).toBeNull()
    expect(readAuthNext('%E0%A4%A')).toBeNull() // malformed
    expect(readAuthNext(undefined)).toBeNull()
  })
})
