import { useEffect, useRef } from 'react'
import { LngLatBounds, Map as MapLibreMap, Marker, NavigationControl, ScaleControl, setWorkerUrl, type GeoJSONSource } from 'maplibre-gl'
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { CommunityEvent, LocationResult } from '../data/models'
import { EVENT_SEARCH_RADIUS_MILES } from '../data/constants'
import type { Feature, Polygon } from 'geojson'

setWorkerUrl(mapWorkerUrl)

type MapCanvasProps = {
  location: LocationResult | null
  events: CommunityEvent[]
  showSearchRadius?: boolean
  onOpenEvent: (eventId: string) => void
}

const SEARCH_RADIUS_SOURCE = 'localloops-search-radius'

function searchRadiusFeature(location: LocationResult): Feature<Polygon> {
  const earthRadiusKm = 6371.0088
  const angularRadius = EVENT_SEARCH_RADIUS_MILES * 1.609344 / earthRadiusKm
  const latitude = location.latitude * Math.PI / 180
  const longitude = location.longitude * Math.PI / 180
  const steps = 72
  const coordinates: Array<[number, number]> = []

  for (let step = 0; step <= steps; step += 1) {
    const bearing = step * 2 * Math.PI / steps
    const circleLatitude = Math.asin(
      Math.sin(latitude) * Math.cos(angularRadius)
      + Math.cos(latitude) * Math.sin(angularRadius) * Math.cos(bearing),
    )
    const circleLongitude = longitude + Math.atan2(
      Math.sin(bearing) * Math.sin(angularRadius) * Math.cos(latitude),
      Math.cos(angularRadius) - Math.sin(latitude) * Math.sin(circleLatitude),
    )
    coordinates.push([circleLongitude * 180 / Math.PI, circleLatitude * 180 / Math.PI])
  }

  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [coordinates] },
  }
}

export function MapCanvas({ location, events, showSearchRadius = false, onOpenEvent }: MapCanvasProps) {
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

    const marker = document.createElement('div')
    marker.className = 'greet-map-search-center'
    marker.setAttribute('role', 'img')
    marker.setAttribute('aria-label', `Map search center near ${location.label}`)
    marker.title = `Map search center near ${location.label}`
    searchCenterMarkerRef.current = new Marker({ element: marker, anchor: 'center' })
      .setLngLat([location.longitude, location.latitude])
      .addTo(map)

    const updateMapView = () => {
      if (showSearchRadius) {
        const coordinates = searchRadiusFeature(location).geometry.coordinates[0]
        const first = coordinates[0] as [number, number]
        const bounds = new LngLatBounds(first, first)
        coordinates.slice(1).forEach((coordinate) => bounds.extend(coordinate as [number, number]))
        map.fitBounds(bounds, { padding: 40, maxZoom: 7.8, duration: 900 })
      } else {
        map.flyTo({ center: [location.longitude, location.latitude], zoom: location.zoom, duration: 900 })
      }
    }

    if (showSearchRadius) map.on('resize', updateMapView)
    if (map.isStyleLoaded()) updateMapView()
    else map.once('load', updateMapView)
    return () => {
      map.off('resize', updateMapView)
      map.off('load', updateMapView)
    }
  }, [location, showSearchRadius])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !location || !showSearchRadius) return

    const updateSearchRadius = () => {
      if (!map.isStyleLoaded()) return
      const source = map.getSource(SEARCH_RADIUS_SOURCE) as GeoJSONSource | undefined
      if (source) {
        source.setData(searchRadiusFeature(location))
        return
      }

      map.addSource(SEARCH_RADIUS_SOURCE, {
        type: 'geojson',
        data: searchRadiusFeature(location),
      })
      const firstSymbolLayer = map.getStyle().layers?.find((layer) => layer.type === 'symbol')?.id
      map.addLayer({
        id: 'localloops-search-radius-fill',
        type: 'fill',
        source: SEARCH_RADIUS_SOURCE,
        paint: { 'fill-color': '#6c9a77', 'fill-opacity': 0.14 },
      }, firstSymbolLayer)
      map.addLayer({
        id: 'localloops-search-radius-outline',
        type: 'line',
        source: SEARCH_RADIUS_SOURCE,
        paint: { 'line-color': '#47785b', 'line-width': 2, 'line-opacity': 0.85 },
      }, firstSymbolLayer)
    }

    if (map.isStyleLoaded()) updateSearchRadius()
    else map.once('load', updateSearchRadius)
    return () => { map.off('load', updateSearchRadius) }
  }, [location, showSearchRadius])

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
    <div className="greet-map" role="region" aria-label={showSearchRadius ? `Map of events within ${EVENT_SEARCH_RADIUS_MILES} miles` : 'Map of real nearby events'}>
      <div ref={containerRef} className="greet-map__canvas" />
      {showSearchRadius && location && <div className="greet-map__radius-label"><span aria-hidden="true" />{EVENT_SEARCH_RADIUS_MILES}-mile search radius</div>}
      {!location && <div className="greet-map__prompt"><span>Start with any U.S. town or ZIP code.</span></div>}
      {location && events.length === 0 && <div className="greet-map__prompt greet-map__prompt--location"><span>The map is centered near {location.label}.</span></div>}
    </div>
  )
}
