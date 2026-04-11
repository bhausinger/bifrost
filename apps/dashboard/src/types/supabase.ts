export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      artists: {
        Row: {
          bio: string | null
          created_at: string | null
          email: string | null
          follower_count: number | null
          genres: string[] | null
          id: string
          image_url: string | null
          instagram_handle: string | null
          location: string | null
          monthly_listeners: number | null
          name: string
          notes: string | null
          other_socials: Json | null
          soundcloud_url: string | null
          source: string | null
          spotify_artist_id: string | null
          spotify_url: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          email?: string | null
          follower_count?: number | null
          genres?: string[] | null
          id?: string
          image_url?: string | null
          instagram_handle?: string | null
          location?: string | null
          monthly_listeners?: number | null
          name: string
          notes?: string | null
          other_socials?: Json | null
          soundcloud_url?: string | null
          source?: string | null
          spotify_artist_id?: string | null
          spotify_url?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          email?: string | null
          follower_count?: number | null
          genres?: string[] | null
          id?: string
          image_url?: string | null
          instagram_handle?: string | null
          location?: string | null
          monthly_listeners?: number | null
          name?: string
          notes?: string | null
          other_socials?: Json | null
          soundcloud_url?: string | null
          source?: string | null
          spotify_artist_id?: string | null
          spotify_url?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      blocked_terms: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          term: string
          type: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          term: string
          type: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          term?: string
          type?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          actual_streams: number | null
          artist_id: string
          created_at: string | null
          end_date: string | null
          id: string
          name: string
          notes: string | null
          pipeline_entry_id: string | null
          start_date: string | null
          status: string | null
          target_streams: number | null
          total_budget: number | null
          total_cost: number | null
          track_name: string | null
          track_spotify_id: string | null
          track_spotify_url: string | null
          updated_at: string | null
        }
        Insert: {
          actual_streams?: number | null
          artist_id: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          name: string
          notes?: string | null
          pipeline_entry_id?: string | null
          start_date?: string | null
          status?: string | null
          target_streams?: number | null
          total_budget?: number | null
          total_cost?: number | null
          track_name?: string | null
          track_spotify_id?: string | null
          track_spotify_url?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_streams?: number | null
          artist_id?: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          pipeline_entry_id?: string | null
          start_date?: string | null
          status?: string | null
          target_streams?: number | null
          total_budget?: number | null
          total_cost?: number | null
          track_name?: string | null
          track_spotify_id?: string | null
          track_spotify_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_pipeline_entry_id_fkey"
            columns: ["pipeline_entry_id"]
            isOneToOne: false
            referencedRelation: "pipeline_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      curator_outreach: {
        Row: {
          confirmed_at: string | null
          created_at: string | null
          email: string | null
          emailed_at: string | null
          followed_up_at: string | null
          genre: string | null
          id: string
          is_organic: boolean | null
          notes: string | null
          playlist_name: string
          playlist_url: string | null
          price_per_10k: number | null
          replied_at: string | null
          updated_at: string | null
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string | null
          email?: string | null
          emailed_at?: string | null
          followed_up_at?: string | null
          genre?: string | null
          id?: string
          is_organic?: boolean | null
          notes?: string | null
          playlist_name: string
          playlist_url?: string | null
          price_per_10k?: number | null
          replied_at?: string | null
          updated_at?: string | null
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string | null
          email?: string | null
          emailed_at?: string | null
          followed_up_at?: string | null
          genre?: string | null
          id?: string
          is_organic?: boolean | null
          notes?: string | null
          playlist_name?: string
          playlist_url?: string | null
          price_per_10k?: number | null
          replied_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      curators: {
        Row: {
          contact_name: string | null
          created_at: string | null
          email: string | null
          genres: string[] | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          payment_code: string | null
          payment_handle: string | null
          payment_method: string | null
          price_per_10k: number | null
          updated_at: string | null
        }
        Insert: {
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          genres?: string[] | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          payment_code?: string | null
          payment_handle?: string | null
          payment_method?: string | null
          price_per_10k?: number | null
          updated_at?: string | null
        }
        Update: {
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          genres?: string[] | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          payment_code?: string | null
          payment_handle?: string | null
          payment_method?: string | null
          price_per_10k?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_records: {
        Row: {
          artist_id: string
          body: string
          created_at: string | null
          gmail_message_id: string | null
          id: string
          opened_at: string | null
          pipeline_entry_id: string | null
          replied_at: string | null
          sent_at: string | null
          status: string | null
          subject: string
          template_id: string | null
          to_email: string
        }
        Insert: {
          artist_id: string
          body: string
          created_at?: string | null
          gmail_message_id?: string | null
          id?: string
          opened_at?: string | null
          pipeline_entry_id?: string | null
          replied_at?: string | null
          sent_at?: string | null
          status?: string | null
          subject: string
          template_id?: string | null
          to_email: string
        }
        Update: {
          artist_id?: string
          body?: string
          created_at?: string | null
          gmail_message_id?: string | null
          id?: string
          opened_at?: string | null
          pipeline_entry_id?: string | null
          replied_at?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string
          template_id?: string | null
          to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_records_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_records_pipeline_entry_id_fkey"
            columns: ["pipeline_entry_id"]
            isOneToOne: false
            referencedRelation: "pipeline_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_records_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body: string
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          subject: string
          template_type: string | null
          updated_at: string | null
          variables: string[] | null
        }
        Insert: {
          body: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          subject: string
          template_type?: string | null
          updated_at?: string | null
          variables?: string[] | null
        }
        Update: {
          body?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          subject?: string
          template_type?: string | null
          updated_at?: string | null
          variables?: string[] | null
        }
        Relationships: []
      }
      excluded_artists: {
        Row: {
          artist_id: string | null
          artist_name: string | null
          created_at: string | null
          email: string | null
          excluded_by: string | null
          id: string
          notes: string | null
          reason: string
        }
        Insert: {
          artist_id?: string | null
          artist_name?: string | null
          created_at?: string | null
          email?: string | null
          excluded_by?: string | null
          id?: string
          notes?: string | null
          reason?: string
        }
        Update: {
          artist_id?: string | null
          artist_name?: string | null
          created_at?: string | null
          email?: string | null
          excluded_by?: string | null
          id?: string
          notes?: string | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "excluded_artists_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_activities: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string
          id: string
          metadata: Json | null
          pipeline_entry_id: string
          type: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description: string
          id?: string
          metadata?: Json | null
          pipeline_entry_id: string
          type: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string
          id?: string
          metadata?: Json | null
          pipeline_entry_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_activities_pipeline_entry_id_fkey"
            columns: ["pipeline_entry_id"]
            isOneToOne: false
            referencedRelation: "pipeline_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_entries: {
        Row: {
          artist_id: string
          assigned_to: string | null
          completed_at: string | null
          contacted_at: string | null
          created_at: string | null
          deal_value: number | null
          id: string
          lost_reason: string | null
          notes: string | null
          package_type: string | null
          paid_at: string | null
          responded_at: string | null
          stage: string
          stage_entered_at: string | null
          updated_at: string | null
        }
        Insert: {
          artist_id: string
          assigned_to?: string | null
          completed_at?: string | null
          contacted_at?: string | null
          created_at?: string | null
          deal_value?: number | null
          id?: string
          lost_reason?: string | null
          notes?: string | null
          package_type?: string | null
          paid_at?: string | null
          responded_at?: string | null
          stage?: string
          stage_entered_at?: string | null
          updated_at?: string | null
        }
        Update: {
          artist_id?: string
          assigned_to?: string | null
          completed_at?: string | null
          contacted_at?: string | null
          created_at?: string | null
          deal_value?: number | null
          id?: string
          lost_reason?: string | null
          notes?: string | null
          package_type?: string | null
          paid_at?: string | null
          responded_at?: string | null
          stage?: string
          stage_entered_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_entries_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      placements: {
        Row: {
          campaign_id: string
          cost: number | null
          created_at: string | null
          id: string
          notes: string | null
          placed_at: string | null
          playlist_id: string
          removed_at: string | null
          status: string | null
          streams_attributed: number | null
          updated_at: string | null
        }
        Insert: {
          campaign_id: string
          cost?: number | null
          created_at?: string | null
          id?: string
          notes?: string | null
          placed_at?: string | null
          playlist_id: string
          removed_at?: string | null
          status?: string | null
          streams_attributed?: number | null
          updated_at?: string | null
        }
        Update: {
          campaign_id?: string
          cost?: number | null
          created_at?: string | null
          id?: string
          notes?: string | null
          placed_at?: string | null
          playlist_id?: string
          removed_at?: string | null
          status?: string | null
          streams_attributed?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "placements_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placements_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          avg_streams_per_placement: number | null
          country: string | null
          created_at: string | null
          curator_id: string
          follower_count: number | null
          genre: string | null
          id: string
          is_active: boolean | null
          last_verified_at: string | null
          name: string
          notes: string | null
          price_per_placement: number | null
          spotify_playlist_id: string | null
          spotify_url: string | null
          updated_at: string | null
        }
        Insert: {
          avg_streams_per_placement?: number | null
          country?: string | null
          created_at?: string | null
          curator_id: string
          follower_count?: number | null
          genre?: string | null
          id?: string
          is_active?: boolean | null
          last_verified_at?: string | null
          name: string
          notes?: string | null
          price_per_placement?: number | null
          spotify_playlist_id?: string | null
          spotify_url?: string | null
          updated_at?: string | null
        }
        Update: {
          avg_streams_per_placement?: number | null
          country?: string | null
          created_at?: string | null
          curator_id?: string
          follower_count?: number | null
          genre?: string | null
          id?: string
          is_active?: boolean | null
          last_verified_at?: string | null
          name?: string
          notes?: string | null
          price_per_placement?: number | null
          spotify_playlist_id?: string | null
          spotify_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "playlists_curator_id_fkey"
            columns: ["curator_id"]
            isOneToOne: false
            referencedRelation: "curators"
            referencedColumns: ["id"]
          },
        ]
      }
      stream_snapshots: {
        Row: {
          campaign_id: string
          created_at: string | null
          id: string
          listener_count: number | null
          snapshot_date: string
          source: string | null
          stream_count: number
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          id?: string
          listener_count?: number | null
          snapshot_date: string
          source?: string | null
          stream_count: number
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          id?: string
          listener_count?: number | null
          snapshot_date?: string
          source?: string | null
          stream_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "stream_snapshots_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          artist_id: string | null
          campaign_id: string | null
          category: string | null
          created_at: string | null
          created_by: string | null
          curator_id: string | null
          description: string | null
          id: string
          notes: string | null
          payment_method: string | null
          reference_id: string | null
          transaction_date: string
          type: string
        }
        Insert: {
          amount: number
          artist_id?: string | null
          campaign_id?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          curator_id?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          reference_id?: string | null
          transaction_date: string
          type: string
        }
        Update: {
          amount?: number
          artist_id?: string | null
          campaign_id?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          curator_id?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          reference_id?: string | null
          transaction_date?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_curator_id_fkey"
            columns: ["curator_id"]
            isOneToOne: false
            referencedRelation: "curators"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      exclude_artist: {
        Args: {
          p_artist_id: string
          p_email: string
          p_notes?: string
          p_reason?: string
        }
        Returns: undefined
      }
      get_dashboard_stats: { Args: never; Returns: Json }
      is_excluded: { Args: { p_email: string }; Returns: boolean }
      move_pipeline_stage: {
        Args: { entry_id: string; new_stage: string; note?: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
