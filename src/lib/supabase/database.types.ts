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
  state_code: string | null
  interests: string[]
  discoverable: boolean
  created_at: string
}

export type EventRow = {
  id: string
  host_id: string
  community_id: string | null
  title: string
  description: string
  starts_at: string
  ends_at: string | null
  mode: 'city' | 'rural'
  visibility: 'public'
  category: string
  region_label: string
  venue_label: string
  state_code: string
  latitude: number
  longitude: number
  source_name: string | null
  source_url: string | null
  created_at: string
}

export type CommunityRow = {
  id: string
  name: string
  description: string
  region_label: string | null
  created_by: string
  member_count: number
  created_at: string
}

export type CommunityMemberRow = {
  community_id: string
  user_id: string
  role: 'owner' | 'member'
  joined_at: string
}

export type EventRsvpRow = {
  event_id: string
  user_id: string
  status: 'going' | 'interested'
  created_at: string
}

export type ExternalEventRsvpRow = {
  event_source: 'ticketmaster' | 'nps' | 'ticketfairy'
  source_event_id: string
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

export type ExternalRidePostRow = {
  id: string
  event_source: 'ticketmaster' | 'nps' | 'ticketfairy'
  source_event_id: string
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
      localloops_profiles: TableShape<ProfileRow>
      localloops_communities: TableShape<CommunityRow>
      localloops_community_members: TableShape<CommunityMemberRow>
      localloops_events: TableShape<EventRow>
      localloops_event_rsvps: TableShape<EventRsvpRow>
      localloops_external_event_rsvps: TableShape<ExternalEventRsvpRow>
      localloops_friendships: TableShape<FriendshipRow>
      localloops_messages: TableShape<MessageRow>
      localloops_ride_posts: TableShape<RidePostRow>
      localloops_external_ride_posts: TableShape<ExternalRidePostRow>
      localloops_notifications: TableShape<NotificationRow>
    }
    Views: Record<never, never>
    Functions: {
      localloops_ensure_profile: {
        Args: { p_display_name?: string | null }
        Returns: undefined
      }
      localloops_create_community: {
        Args: { p_name: string; p_description: string; p_region_label: string | null }
        Returns: string
      }
      localloops_join_community: {
        Args: { p_community_id: string }
        Returns: number
      }
      localloops_leave_community: {
        Args: { p_community_id: string }
        Returns: number
      }
    }
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}
