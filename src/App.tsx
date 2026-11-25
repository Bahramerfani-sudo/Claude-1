import { lazy, Suspense, useEffect, type ComponentType } from 'react'
import { useRoute } from './lib/router'
import Home from './pages/Home'

const EinStrich = lazy(() => import('./games/strich/EinStrich'))
const InnererTakt = lazy(() => import('./games/takt/InnererTakt'))
const Schattenlabor = lazy(() => import('./games/schatten/Schattenlabor'))
const KleinerPlanet = lazy(() => import('./games/planet/KleinerPlanet'))
const FalscherTon = lazy(() => import('./games/ton/FalscherTon'))

const ROUTES: Record<string, ComponentType> = {
  '/ein-strich': EinStrich,
  '/innerer-takt': InnererTakt,
  '/schattenlabor': Schattenlabor,
  '/kleiner-planet': KleinerPlanet,
  '/falscher-ton': FalscherTon,
}

export default function App() {
  const route = useRoute()
  const Page = ROUTES[route]

  useEffect(() => {
    window.scrollTo(0, 0)
    if (!Page) document.title = 'Spieltrieb – fünf kleine Spiele'
  }, [route, Page])

  if (!Page) return <Home />
  return (
    <Suspense fallback={<div className="loading">Lädt …</div>}>
      <Page key={route} />
    </Suspense>
  )
}
