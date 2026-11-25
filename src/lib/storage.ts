import { useCallback, useState } from 'react'

const PREFIX = 'spieltrieb:v1:'

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(PREFIX + key)
    if (raw == null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function save<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    /* privater Modus o. Ä. – dann eben ohne Speichern */
  }
  window.dispatchEvent(new CustomEvent('spieltrieb:storage', { detail: key }))
}

export function clearProgress(): void {
  try {
    const keys: string[] = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i)
      if (k && k.startsWith(PREFIX) && k !== PREFIX + 'muted') keys.push(k)
    }
    keys.forEach((k) => window.localStorage.removeItem(k))
  } catch {
    /* egal */
  }
  window.dispatchEvent(new CustomEvent('spieltrieb:storage', { detail: '*' }))
}

/** Wie useState, nur dauerhaft im Browser gespeichert. */
export function useStored<T>(key: string, fallback: T): [T, (v: T | ((old: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => load(key, fallback))
  const set = useCallback(
    (v: T | ((old: T) => T)) => {
      setValue((old) => {
        const next = typeof v === 'function' ? (v as (o: T) => T)(old) : v
        save(key, next)
        return next
      })
    },
    [key],
  )
  return [value, set]
}
