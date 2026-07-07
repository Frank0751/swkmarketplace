'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/types'

interface UseUserReturn {
  user: User | null
  loading: boolean
  error: string | null
}

export function useUser(): UseUserReturn {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    let isMounted = true

    async function fetchProfile(authUserId: string) {
      const { data, error: dbErr } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUserId)
        .single()

      if (!isMounted) return

      if (dbErr) {
        setError(dbErr.message)
        setUser(null)
      } else {
        setUser(data as User)
        setError(null)
      }
      setLoading(false)
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    // Subscribe to auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return
      if (session?.user) {
        setLoading(true)
        fetchProfile(session.user.id)
      } else {
        setUser(null)
        setError(null)
        setLoading(false)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  return { user, loading, error }
}
