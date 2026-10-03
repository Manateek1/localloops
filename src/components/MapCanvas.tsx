import { MapPin } from 'lucide-react'
import type { CommunityMode, MeetEvent } from '../data/demo'

type MapCanvasProps = {
  mode: CommunityMode
  events: MeetEvent[]
  selectedEventId?: string
  onOpenEvent: (eventId: string) => void
}

export function MapCanvas({ mode, events, selectedEventId, onOpenEvent }: MapCanvasProps) {
  const rural = mode === 'rural'

  return (
    <div className={`map-canvas ${rural ? 'map-canvas--rural' : 'map-canvas--city'}`}>
      <svg className="map-art" viewBox="0 0 900 430" preserveAspectRatio="none" aria-hidden="true">
        <rect width="900" height="430" fill={rural ? '#e7ecdf' : '#e9efe8'} />
        {rural ? (
          <>
            <path d="M0 0h230l-28 74 54 62-39 61 23 81-32 152H0Z" fill="#dce8d7" />
            <path d="M615 0h285v430H680l-41-74 33-81-47-67 38-76-55-58Z" fill="#dfe9d9" />
            <path d="M300 278c28-33 75-36 106-11 25 20 28 49 4 71-22 20-71 19-98-1-23-17-33-39-12-59Z" fill="#c4dce0" />
            <path d="M0 302c131-64 238-67 364-3s246 69 536 5" fill="none" stroke="#d1d5c8" strokeWidth="30" />
            <path d="M0 302c131-64 238-67 364-3s246 69 536 5" fill="none" stroke="#fbf8eb" strokeWidth="23" />
            <path d="M118 -15c42 100 58 182 46 283s14 123 72 186M458-10c-34 110-17 197 47 260s73 115 52 189M775-10c-83 83-112 169-87 258s13 132-24 197" fill="none" stroke="#d1d5c8" strokeWidth="24" />
            <path d="M118 -15c42 100 58 182 46 283s14 123 72 186M458-10c-34 110-17 197 47 260s73 115 52 189M775-10c-83 83-112 169-87 258s13 132-24 197" fill="none" stroke="#fffaf0" strokeWidth="17" />
            <path d="M77 101c84-18 129-7 194 28m-121 161c83-15 136-7 224 39m103-213c85 12 145 46 212 102m-189 144c85-8 138 6 214 41" fill="none" stroke="#f9f5e8" strokeWidth="7" strokeLinecap="round" />
            <path d="M265 48c25 14 36 32 38 58m-194 244c23-27 46-36 77-31m433-270c-21 27-27 52-16 79m164 158c-32-6-55 0-72 19" fill="none" stroke="#aac7a8" strokeWidth="3" strokeDasharray="5 8" />
            <g fill="#91af8b" opacity=".72">
              <path d="m79 61 10-20 10 20h-6l8 14H77l8-14Zm50 71 8-16 9 16h-5l7 11h-20l7-11Zm125 239 10-19 9 19h-5l8 13h-25l8-13Zm416-338 8-16 8 16h-4l6 10h-20l6-10Zm112 280 10-19 10 19h-6l8 13h-24l8-13Z" />
              <path d="m197 72 7-14 7 14h-4l6 9h-18l6-9Zm530 71 9-17 9 17h-5l7 11h-22l7-11Zm-23 220 8-15 8 15h-4l6 10h-20l6-10Z" />
            </g>
            <g className="map-place-labels">
              <text x="92" y="121">PINE RIDGE</text>
              <text x="350" y="366">RIVERTON</text>
              <text x="635" y="204">LAKESIDE</text>
              <text x="747" y="83">CEDAR FALLS</text>
            </g>
          </>
        ) : (
          <>
            <path d="M740 0h160v430H730c22-74 14-112 48-172 27-48-4-114-38-164Z" fill="#cde0e5" />
            <path d="M0 108c117 4 197-44 312-16 103 26 190 53 321 23M0 335c140-49 219-43 324-16 139 36 234 19 403-36" fill="none" stroke="#d4d8ca" strokeWidth="26" />
            <path d="M0 108c117 4 197-44 312-16 103 26 190 53 321 23M0 335c140-49 219-43 324-16 139 36 234 19 403-36" fill="none" stroke="#fffaf0" strokeWidth="19" />
            <path d="M170-20c-19 103 5 187 52 243s67 128 40 225M380-20c49 103 48 185 7 264s-42 145 8 206M587-20c-37 99-44 177-6 240s54 125 39 224" fill="none" stroke="#d2d5c9" strokeWidth="22" />
            <path d="M170-20c-19 103 5 187 52 243s67 128 40 225M380-20c49 103 48 185 7 264s-42 145 8 206M587-20c-37 99-44 177-6 240s54 125 39 224" fill="none" stroke="#fffaf0" strokeWidth="15" />
            <path d="M45 206h604M91 267h566M274 17v385M501 8v386M54 59h590" stroke="#f9f5e9" strokeWidth="6" strokeLinecap="round" />
            <path d="M688 28c-17 70-1 127 20 173s28 102 8 175" fill="none" stroke="#99c3ca" strokeWidth="5" strokeDasharray="4 8" />
            <g fill="#91af8b" opacity=".6">
              <path d="m85 282 10-19 10 19h-6l8 13H83l8-13Zm135-187 9-17 9 17h-5l7 11h-22l7-11Zm147 236 8-16 8 16h-4l6 10h-20l6-10Zm177-156 9-18 9 18h-5l7 11h-22l7-11Z" />
            </g>
            <g className="map-place-labels">
              <text x="90" y="82">SAN FRANCISCO</text>
              <text x="484" y="367">OAKLAND</text>
              <text x="766" y="219">THE BAY</text>
            </g>
          </>
        )}
      </svg>
      {events.map((event) => (
        <button
          className={`map-marker ${selectedEventId === event.id ? 'is-selected' : ''}`}
          key={event.id}
          type="button"
          style={{ left: `${event.map.x}%`, top: `${event.map.y}%` }}
          onClick={() => onOpenEvent(event.id)}
          aria-label={`Open ${event.title}, ${event.town}, ${event.travel} away`}
        >
          <span className="map-marker__pin"><MapPin size={19} fill="currentColor" /></span>
          <span className="map-marker__label">{event.town}<small>{event.travel}</small></span>
        </button>
      ))}
      <span className="map-caption">Illustrative community map</span>
    </div>
  )
}
