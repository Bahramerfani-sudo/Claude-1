import { useEffect, useState } from 'react'

// Routen als einfache Anker (#ein-strich). Alte Links mit #/ein-strich gehen weiterhin.
function current(): string {
  const h = window.location.hash.replace(/^#\/?/, '')
  return '/' + h
}

export function useRoute(): string {
  const [route, setRoute] = useState(current)
  useEffect(() => {
    const on = () => setRoute(current())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}

export function navigate(path: string): void {
  window.location.hash = path.replace(/^\//, '')
}
