import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect } from 'react'
import { api, unwrap, type SoundSlot } from '@/shared/api'
import { usePreferences, useAuth } from '@/entities/user'
import { playSound, preloadSounds } from './player'

/** The slots that have a sound. */
export function useSounds() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['sounds'],
    queryFn: () => unwrap(api.GET('/sounds')),
    enabled: !!user,
    staleTime: 5 * 60_000,
  })
}

/** Loads the sounds ahead of time (when the user has them on) so they play without a delay. */
export function usePreloadSounds() {
  const { prefs } = usePreferences()
  const { data } = useSounds()
  useEffect(() => {
    if (prefs.soundsEnabled && data) void preloadSounds(data)
  }, [prefs.soundsEnabled, data])
}

/** Plays the first of the slots that has a sound, unless the user has switched sounds off. */
export function usePlaySound() {
  const { prefs } = usePreferences()
  const enabled = prefs.soundsEnabled
  return useCallback((...slots: SoundSlot[]) => enabled && playSound(...slots), [enabled])
}
