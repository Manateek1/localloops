type TableShape<Row extends Record<string, unknown>> = {
  Row: Row
  Insert: Partial<Row>
  Update: Partial<Row>
  Relationships: []
}

export type ProfileRow = {
  id: string
  display_name: string
  avatar_url: string | null
  bio: string | null
  home_region: string | null
  discoverable: boolean
  created_at: string
}

export type EventRow = {
  id: string
  host_id: string
  title: string
  description: string
  starts_at: string
  ends_at: string | null
  mode: 'city' | 'rural'
  visibility: 'public'
  region_label: string
  venue_label: string
  source_name: string | null
  source_url: string | null
  created_at: string
}

export type EventRsvpRow = {
  event_id: string
  user_id: string
  status: 'going' | 'interested'
  created_at: string
}

export type FriendshipRow = {
  id: string
  requester_id: string
  addressee_id: string
  status: 'pending' | 'accepted'
  created_at: string
  accepted_at: string | null
}

export type MessageRow = {
  id: string
  friendship_id: string
  sender_id: string
  body: string
  created_at: string
}

export type RidePostRow = {
  id: string
  event_id: string
  user_id: string
  kind: 'request' | 'offer'
  pickup_area: string
  seats_available: number | null
  created_at: string
}

export type NotificationRow = {
  id: string
  recipient_id: string
  actor_id: string | null
  event_id: string | null
  kind: 'event_alert' | 'friend_request' | 'message'
  read_at: string | null
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      profiles: TableShape<ProfileRow>
      events: TableShape<EventRow>
      event_rsvps: TableShape<EventRsvpRow>
      friendships: TableShape<FriendshipRow>
      messages: TableShape<MessageRow>
      ride_posts: TableShape<RidePostRow>
      notifications: TableShape<NotificationRow>
    }
    Views: Record<never, never>
    Functions: Record<never, never>
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}
