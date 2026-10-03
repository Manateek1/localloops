export type EventSource = 'ticketmaster' | 'nps' | 'community'

export type LocationResult = {
  id: string
  label: string
  city: string
  state: string
  stateCode: string
  latitude: number
  longitude: number
  zoom: number
}

export type CommunityEvent = {
  id: string
  sourceId: string
  source: EventSource
  sourceName: string
  sourceUrl: string | null
  title: string
  description: string
  startsAt: string | null
  timeLabel?: string | null
  venue: string
  city: string
  state: string
  stateCode: string
  latitude: number
  longitude: number
  imageUrl: string | null
  category: string
  isFree: boolean | null
  distanceMiles?: number
  communityEventId?: string
  hostName?: string
}

export type Profile = {
  id: string
  display_name: string
  avatar_url: string | null
  bio: string | null
  home_region: string | null
  state_code: string | null
  interests: string[]
  discoverable: boolean
  created_at: string
}

export const INTEREST_OPTIONS = [
  'Hiking', 'Local food', 'Arts & culture', 'Live music', 'Wellness',
  'Gardening', 'Books', 'Photography', 'Volunteering', 'Outdoor skills',
]

export const US_STATES = [
  ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'], ['CA', 'California'],
  ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'], ['FL', 'Florida'], ['GA', 'Georgia'],
  ['HI', 'Hawaii'], ['ID', 'Idaho'], ['IL', 'Illinois'], ['IN', 'Indiana'], ['IA', 'Iowa'],
  ['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'], ['ME', 'Maine'], ['MD', 'Maryland'],
  ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'], ['MS', 'Mississippi'], ['MO', 'Missouri'],
  ['MT', 'Montana'], ['NE', 'Nebraska'], ['NV', 'Nevada'], ['NH', 'New Hampshire'], ['NJ', 'New Jersey'],
  ['NM', 'New Mexico'], ['NY', 'New York'], ['NC', 'North Carolina'], ['ND', 'North Dakota'], ['OH', 'Ohio'],
  ['OK', 'Oklahoma'], ['OR', 'Oregon'], ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'], ['SC', 'South Carolina'],
  ['SD', 'South Dakota'], ['TN', 'Tennessee'], ['TX', 'Texas'], ['UT', 'Utah'], ['VT', 'Vermont'],
  ['VA', 'Virginia'], ['WA', 'Washington'], ['WV', 'West Virginia'], ['WI', 'Wisconsin'], ['WY', 'Wyoming'],
] as const
