export type CommunityMode = 'rural' | 'city'
export type Page = 'onboarding' | 'explore' | 'event' | 'people' | 'inbox' | 'messages' | 'ai'
export type EventCategory = 'Hiking' | 'Kayaking' | 'Food' | 'Arts' | 'Music' | 'Wellness'

export type MeetEvent = {
  id: string
  title: string
  shortTitle: string
  date: string
  time: string
  venue: string
  town: string
  travel: string
  category: EventCategory
  tags: string[]
  image: string
  source: string
  description: string
  attendees: number
  host: { name: string; initials: string; color: string }
  map: { x: number; y: number }
  publicEvent: boolean
}

export const ruralEvents: MeetEvent[] = [
  {
    id: 'foothill-hike',
    title: 'Foothill Trail Community Hike',
    shortTitle: 'Foothill Trail Hike',
    date: 'Sat, Oct 10',
    time: '9:00 AM – 12:00 PM',
    venue: 'Pine Ridge Community Trailhead',
    town: 'Pine Ridge',
    travel: '28 min',
    category: 'Hiking',
    tags: ['Hiking', 'Outdoors', 'Community'],
    image: '/images/foothill-hike.png',
    source: 'Parks & Rec',
    description: 'An all-levels walk on the Ridgeview Trail, followed by coffee at the Pine Ridge General Store. A friendly way to meet neighbors and enjoy the views.',
    attendees: 24,
    host: { name: 'Sarah L.', initials: 'SL', color: 'coral' },
    map: { x: 27, y: 30 },
    publicEvent: true,
  },
  {
    id: 'harvest-market',
    title: 'Riverton Harvest Market',
    shortTitle: 'Harvest Market',
    date: 'Sat, Oct 10',
    time: '9:00 AM – 1:00 PM',
    venue: 'Riverton Town Green',
    town: 'Riverton',
    travel: '22 min',
    category: 'Food',
    tags: ['Local Food', 'Community', 'Outdoors'],
    image: '/images/foothill-market.png',
    source: 'Local Calendar',
    description: 'Browse fall produce, flowers, and small-batch treats from nearby growers. Come for a stroll, stay for a little neighborly conversation.',
    attendees: 36,
    host: { name: 'Riverton Community', initials: 'RC', color: 'sage' },
    map: { x: 42, y: 65 },
    publicEvent: true,
  },
  {
    id: 'kayak-social',
    title: 'Sunset Kayak & Social',
    shortTitle: 'Kayak & Social',
    date: 'Sun, Oct 11',
    time: '4:00 PM – 6:30 PM',
    venue: 'Lakeside Public Launch',
    town: 'Lakeside',
    travel: '18 min',
    category: 'Kayaking',
    tags: ['Kayaking', 'Photography', 'Outdoors'],
    image: '/images/foothill-kayak.png',
    source: 'Lakeside Library',
    description: 'Paddle the quiet side of the lake with a small group, then share snacks by the shore. Bring your own kayak or ask about a spare seat.',
    attendees: 18,
    host: { name: 'Mark T.', initials: 'MT', color: 'blue' },
    map: { x: 66, y: 47 },
    publicEvent: true,
  },
  {
    id: 'moonrise-hike',
    title: 'Moonrise Night Hike',
    shortTitle: 'Moonrise Hike',
    date: 'Sat, Oct 17',
    time: '7:30 PM – 10:00 PM',
    venue: 'Cedar Falls Park Entrance',
    town: 'Cedar Falls',
    travel: '35 min',
    category: 'Hiking',
    tags: ['Hiking', 'Outdoors', 'Wellness'],
    image: '/images/foothill-campfire.png',
    source: 'Parks & Rec',
    description: 'A gentle evening loop under the moon, led by a local volunteer. We will finish with warm drinks at the public picnic area.',
    attendees: 12,
    host: { name: 'Ben C.', initials: 'BC', color: 'gold' },
    map: { x: 76, y: 25 },
    publicEvent: true,
  },
]

export const cityEvents: MeetEvent[] = [
  {
    id: 'twin-peaks-hike',
    title: 'Sunset Walk at Twin Peaks',
    shortTitle: 'Twin Peaks Walk',
    date: 'Sat, Oct 10',
    time: '5:00 PM – 7:00 PM',
    venue: 'Twin Peaks North Lot',
    town: 'San Francisco',
    travel: '15 min',
    category: 'Hiking',
    tags: ['Hiking', 'Outdoors', 'Photography'],
    image: '/images/foothill-hike.png',
    source: 'Community Calendar',
    description: 'Take in the city at golden hour with a relaxed neighborhood walking group. We will stop for photos and finish near the overlook.',
    attendees: 31,
    host: { name: 'Lena M.', initials: 'LM', color: 'coral' },
    map: { x: 32, y: 30 },
    publicEvent: true,
  },
  {
    id: 'lake-merritt-kayak',
    title: 'Lake Merritt Kayak Social',
    shortTitle: 'Lake Merritt Kayaks',
    date: 'Sun, Oct 11',
    time: '10:00 AM – 12:00 PM',
    venue: 'Lake Merritt Boating Center',
    town: 'Oakland',
    travel: '19 min',
    category: 'Kayaking',
    tags: ['Kayaking', 'Outdoors', 'Community'],
    image: '/images/foothill-kayak.png',
    source: 'Community Calendar',
    description: 'An easy-going paddle around the lake with time to chat and enjoy the morning. Rentals are available at the public boating center.',
    attendees: 22,
    host: { name: 'Mark T.', initials: 'MT', color: 'blue' },
    map: { x: 66, y: 48 },
    publicEvent: true,
  },
  {
    id: 'dolores-potluck',
    title: 'Dolores Park Picnic Club',
    shortTitle: 'Dolores Picnic Club',
    date: 'Sun, Oct 11',
    time: '12:30 PM – 2:30 PM',
    venue: 'Dolores Park, south lawn',
    town: 'San Francisco',
    travel: '12 min',
    category: 'Food',
    tags: ['Food', 'Outdoors', 'Community'],
    image: '/images/foothill-market.png',
    source: 'Neighborhood Calendar',
    description: 'Bring something small to share or just bring yourself. This relaxed picnic is a good way to meet people from around the city.',
    attendees: 28,
    host: { name: 'Olivia R.', initials: 'OR', color: 'sage' },
    map: { x: 47, y: 57 },
    publicEvent: true,
  },
  {
    id: 'oakland-art-walk',
    title: 'Oakland First Friday Art Walk',
    shortTitle: 'First Friday Art Walk',
    date: 'Fri, Oct 16',
    time: '6:00 PM – 8:30 PM',
    venue: 'Uptown Oakland, public plaza',
    town: 'Oakland',
    travel: '21 min',
    category: 'Arts',
    tags: ['Art & Culture', 'Live Music', 'Community'],
    image: '/images/foothill-market.png',
    source: 'Neighborhood Calendar',
    description: 'Explore open galleries, pop-up performances, and local art with a small group. Meet at the public plaza before heading out.',
    attendees: 17,
    host: { name: 'Alex P.', initials: 'AP', color: 'gold' },
    map: { x: 74, y: 39 },
    publicEvent: true,
  },
]

export type DemoPerson = {
  id: string
  name: string
  initials: string
  color: string
  town: string
  travel: string
  interests: string[]
  sharedEventId: string
  bio: string
}

export const people: DemoPerson[] = [
  { id: 'lena', name: 'Lena M.', initials: 'LM', color: 'coral', town: 'Pine Ridge', travel: '26 min', interests: ['Hiking', 'Trail Running'], sharedEventId: 'foothill-hike', bio: 'Always up for a trail with a good view and a coffee stop after.' },
  { id: 'mark', name: 'Mark T.', initials: 'MT', color: 'blue', town: 'Lakeside', travel: '18 min', interests: ['Kayaking', 'Photography'], sharedEventId: 'kayak-social', bio: 'New to the area and learning every quiet corner of the lake.' },
  { id: 'olivia', name: 'Olivia R.', initials: 'OR', color: 'sage', town: 'Cedar Falls', travel: '34 min', interests: ['Biking', 'Local Food'], sharedEventId: 'harvest-market', bio: 'Farmer market regular, weekend cyclist, and enthusiastic taste tester.' },
  { id: 'ben', name: 'Ben C.', initials: 'BC', color: 'gold', town: 'Riverton', travel: '22 min', interests: ['Hiking', 'Live Music'], sharedEventId: 'moonrise-hike', bio: 'Likes easy hikes, live music, and meeting new neighbors.' },
  { id: 'tessa', name: 'Tessa W.', initials: 'TW', color: 'plum', town: 'Maple Creek', travel: '14 min', interests: ['Local Food', 'Art & Culture'], sharedEventId: 'harvest-market', bio: 'Here for the community events and the best pie in the foothills.' },
  { id: 'jamie', name: 'Jamie R.', initials: 'JR', color: 'blue', town: 'Pine Ridge', travel: '25 min', interests: ['Hiking', 'Photography'], sharedEventId: 'foothill-hike', bio: 'Happy to share a trail tip, a ride, or a photo spot.' },
  { id: 'alex', name: 'Alex P.', initials: 'AP', color: 'gold', town: 'Riverton', travel: '22 min', interests: ['Art & Culture', 'Live Music'], sharedEventId: 'harvest-market', bio: 'Always looking for live music and a friendly crowd.' },
]

export const inboxThreads = [
  { id: 'jamie', name: 'Jamie R.', initials: 'JR', color: 'blue', preview: "Thanks for the ride offer! Looking forward to Saturday's hike.", time: '10:24 AM', unread: true, accepted: true },
  { id: 'alex', name: 'Alex P.', initials: 'AP', color: 'gold', preview: 'Are you going to the Riverton Harvest Market?', time: 'Yesterday', unread: false, accepted: true },
]

export const incomingRequests = [
  { id: 'tessa', name: 'Tessa W.', initials: 'TW', color: 'plum', town: 'Maple Creek', shared: 'Also going to the Harvest Market' },
]

export const localNotifications = [
  { id: 'alert-hike', type: 'event_alert' as const, title: 'A new hike near Pine Ridge', detail: 'Foothill Trail Community Hike · Saturday at 9:00 AM', eventId: 'foothill-hike', time: '12 min ago' },
  { id: 'request-tessa', type: 'friend_request' as const, title: 'Tessa W. wants to connect', detail: 'You are both going to the Riverton Harvest Market.', personId: 'tessa', time: '1 hr ago' },
  { id: 'alert-market', type: 'event_alert' as const, title: 'Harvest Market this weekend', detail: 'Riverton Town Green · Saturday at 9:00 AM', eventId: 'harvest-market', time: 'Yesterday' },
]

export const interestOptions = [
  { label: 'Biking', icon: 'bike' },
  { label: 'Hiking', icon: 'mountain' },
  { label: 'Food & Drinks', icon: 'utensils' },
  { label: 'Live Music', icon: 'music' },
  { label: 'Art & Culture', icon: 'palette' },
  { label: 'Wellness', icon: 'flower' },
  { label: 'Beach', icon: 'waves' },
  { label: 'Photography', icon: 'camera' },
]
