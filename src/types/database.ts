// Hand-written until `supabase gen types typescript` is run against the real project.
// Keep in sync with supabase/migrations/0001_init_schema.sql.

export type ActivityType = 'food' | 'activity' | 'food_and_activity'
export type ActivityCategory = 'savannah' | 'tybee'
export type ActivitySource = 'user_added' | 'imported_note'
export type ParticipantStatus = 'joined' | 'proposed_alt_time' | 'invited'
export type ChangeType =
  | 'created'
  | 'updated'
  | 'joined'
  | 'proposed_time'
  | 'photo_added'
  | 'comment'

export interface Database {
  trip: {
    Views: Record<string, never>
    Functions: {
      check_login_email: {
        Args: { check_email: string }
        Returns: { exists: boolean; needs_setup: boolean }
      }
      has_setting: {
        Args: { setting_key: string }
        Returns: boolean
      }
    }
    Tables: {
      trips: {
        Row: {
          id: string
          name: string
          start_date: string
          end_date: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          start_date: string
          end_date: string
          is_active?: boolean
          created_at?: string
        }
        Update: Partial<Database['trip']['Tables']['trips']['Insert']>
        Relationships: []
      }
      user_profiles: {
        Row: {
          id: string
          display_name: string
          email: string | null
          avatar_url: string | null
          avatar_type: 'preset' | 'custom'
          primary_color: string
          secondary_color: string
          is_admin: boolean
          password_set: boolean
          last_seen_at: string | null
          created_at: string
        }
        Insert: {
          id: string
          display_name: string
          email?: string | null
          avatar_url?: string | null
          avatar_type?: 'preset' | 'custom'
          primary_color?: string
          secondary_color?: string
          is_admin?: boolean
          password_set?: boolean
          last_seen_at?: string | null
          created_at?: string
        }
        Update: Partial<Database['trip']['Tables']['user_profiles']['Insert']>
        Relationships: []
      }
      activities: {
        Row: {
          id: string
          trip_id: string
          type: ActivityType
          name: string
          description: string | null
          proposed_date: string | null
          proposed_time: string | null
          duration_minutes: number | null
          location_name: string | null
          location_lat: number | null
          location_lng: number | null
          location_place_id: string | null
          link_url: string | null
          rating_avg: number | null
          category: ActivityCategory
          source: ActivitySource
          color_tag: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          trip_id: string
          type: ActivityType
          name: string
          description?: string | null
          proposed_date?: string | null
          proposed_time?: string | null
          duration_minutes?: number | null
          location_name?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_place_id?: string | null
          link_url?: string | null
          rating_avg?: number | null
          category: ActivityCategory
          source?: ActivitySource
          color_tag?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['trip']['Tables']['activities']['Insert']>
        Relationships: []
      }
      activity_participants: {
        Row: {
          activity_id: string
          user_id: string
          status: ParticipantStatus
          proposed_date: string | null
          proposed_time: string | null
          rating: number | null
          joined_at: string
        }
        Insert: {
          activity_id: string
          user_id: string
          status?: ParticipantStatus
          proposed_date?: string | null
          proposed_time?: string | null
          rating?: number | null
          joined_at?: string
        }
        Update: Partial<Database['trip']['Tables']['activity_participants']['Insert']>
        Relationships: []
      }
      activity_photos: {
        Row: {
          id: string
          activity_id: string | null
          user_id: string
          storage_path: string
          caption: string | null
          created_at: string
        }
        Insert: {
          id?: string
          activity_id?: string | null
          user_id: string
          storage_path: string
          caption?: string | null
          created_at?: string
        }
        Update: Partial<Database['trip']['Tables']['activity_photos']['Insert']>
        Relationships: []
      }
      photo_tags: {
        Row: {
          photo_id: string
          user_id: string
          tagged_by: string
          created_at: string
        }
        Insert: {
          photo_id: string
          user_id: string
          tagged_by: string
          created_at?: string
        }
        Update: Partial<Database['trip']['Tables']['photo_tags']['Insert']>
        Relationships: []
      }
      activity_changes: {
        Row: {
          id: string
          activity_id: string
          user_id: string
          change_type: ChangeType
          summary_text: string | null
          created_at: string
        }
        Insert: {
          id?: string
          activity_id: string
          user_id: string
          change_type: ChangeType
          summary_text?: string | null
          created_at?: string
        }
        Update: Partial<Database['trip']['Tables']['activity_changes']['Insert']>
        Relationships: []
      }
      digests_daily: {
        Row: {
          date: string
          generated_summary: Record<string, unknown>
          created_at: string
        }
        Insert: {
          date: string
          generated_summary: Record<string, unknown>
          created_at?: string
        }
        Update: Partial<Database['trip']['Tables']['digests_daily']['Insert']>
        Relationships: []
      }
      stays: {
        Row: {
          trip_id: string
          name: string | null
          address: string | null
          notes: string | null
          link_url: string | null
          updated_by: string | null
          updated_at: string
        }
        Insert: {
          trip_id: string
          name?: string | null
          address?: string | null
          notes?: string | null
          link_url?: string | null
          updated_by?: string | null
          updated_at?: string
        }
        Update: Partial<Database['trip']['Tables']['stays']['Insert']>
        Relationships: []
      }
      activity_polls: {
        Row: {
          id: string
          activity_id: string
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          activity_id: string
          created_by: string
          created_at?: string
        }
        Update: Partial<Database['trip']['Tables']['activity_polls']['Insert']>
        Relationships: []
      }
      poll_options: {
        Row: {
          id: string
          poll_id: string
          proposed_date: string | null
          proposed_time: string | null
          is_other: boolean
          proposed_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          poll_id: string
          proposed_date?: string | null
          proposed_time?: string | null
          is_other?: boolean
          proposed_by?: string | null
          created_at?: string
        }
        Update: Partial<Database['trip']['Tables']['poll_options']['Insert']>
        Relationships: []
      }
      poll_votes: {
        Row: {
          poll_id: string
          user_id: string
          option_id: string | null
          not_interested: boolean
          created_at: string
        }
        Insert: {
          poll_id: string
          user_id: string
          option_id?: string | null
          not_interested?: boolean
          created_at?: string
        }
        Update: Partial<Database['trip']['Tables']['poll_votes']['Insert']>
        Relationships: []
      }
    }
  }
}
