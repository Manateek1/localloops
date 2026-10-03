import { useEffect, useRef } from 'react'
import { Map as MapLibreMap, Marker, NavigationControl, ScaleControl, setWorkerUrl } from 'maplibre-gl'
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { CommunityEvent, LocationResult } from '../data/models'

setWorkerUrl(mapWorkerUrl)

type MapCanvasProps = {
  location: LocationResult | null
  events: CommunityEvent[]
  onOpenEvent: (eventId: string) => void
}

export function MapCanvas({ location, events, onOpenEvent }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markersRef = useRef<Marker[]>([])
  const searchCenterMarkerRef = useRef<Marker | null>(null)
  const onOpenRef = useRef(onOpenEvent)

  useEffect(() => { onOpenRef.current = onOpenEvent }, [onOpenEvent])

  useEffect(() => {
    if (!containerRef.current) return
    const map = new MapLibreMap({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: [-98.5795, 39.8283],
      zoom: 3.25,
      minZoom: 2.7,
      maxZoom: 17,
      attributionControl: { compact: true },
      pitchWithRotate: false,
      dragRotate: false,
    })
    map.addControl(new NavigationControl({ showCompass: false, visualizePitch: false }), 'top-right')
    map.addControl(new ScaleControl({ maxWidth: 90, unit: 'imperial' }), 'bottom-left')
    mapRef.current = map

    const resizeObserver = new ResizeObserver(() => map.resize())
    resizeObserver.observe(containerRef.current)
    return () => {
      resizeObserver.disconnect()
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []
      searchCenterMarkerRef.current?.remove()
      searchCenterMarkerRef.current = null
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    searchCenterMarkerRef.current?.remove()
    searchCenterMarkerRef.current = null
    if (!location) return

    map.flyTo({ center: [location.longitude, location.latitude], zoom: location.zoom, duration: 900 })
    const marker = document.createElement('div')
    marker.className = 'greet-map-search-center'
    marker.setAttribute('role', 'img')
    marker.setAttribute('aria-label', `Map search center near ${location.label}`)
    marker.title = `Map search center near ${location.label}`
    searchCenterMarkerRef.current = new Marker({ element: marker, anchor: 'center' })
      .setLngLat([location.longitude, location.latitude])
      .addTo(map)
  }, [location])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = events.slice(0, 100).map((event) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = `greet-map-marker greet-map-marker--${event.source}`
      button.setAttribute('aria-label', `Open ${event.title} in ${event.city}, ${event.stateCode}`)
      button.title = event.title
      button.textContent = '•'
      button.addEventListener('click', () => onOpenRef.current(event.id))
      return new Marker({ element: button, anchor: 'bottom' })
        .setLngLat([event.longitude, event.latitude])
        .addTo(map)
    })
  }, [events])

  return (
    <div className="greet-map" role="region" aria-label="Map of real nearby events">
      <div ref={containerRef} className="greet-map__canvas" />
      {!location && <div className="greet-map__prompt"><span>Start with any U.S. town or ZIP code.</span></div>}
      {location && events.length === 0 && <div className="greet-map__prompt greet-map__prompt--location"><span>The map is centered near {location.label}.</span></div>}
    </div>
  )
}
