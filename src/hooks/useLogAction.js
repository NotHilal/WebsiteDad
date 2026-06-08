import { useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useLogAction() {
  const { user, profile } = useAuth()

  return useCallback(async (action, options = {}) => {
    if (!user) return
    const { error } = await supabase.from('activity_logs').insert({
      actor_id:    user.id,
      actor_name:  profile?.full_name || 'Unknown',
      actor_role:  profile?.role      || 'user',
      action,
      entity_type: options.entityType ?? null,
      entity_id:   options.entityId   != null ? String(options.entityId) : null,
      details:     options.details    ?? {},
    })
    if (error) console.error('[Log]', action, error.message)
  }, [user, profile])
}
