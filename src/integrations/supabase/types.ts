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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      clips: {
        Row: {
          caption: string | null
          caption_style: string | null
          created_at: string
          custom_prompt: string | null
          end_sec: number | null
          hashtags: string[] | null
          heygen_status: string | null
          heygen_video_id: string | null
          heygen_video_url: string | null
          id: string
          narration_status: string | null
          narration_url: string | null
          narration_voice_id: string | null
          output_url: string | null
          project_id: string
          published_at: string | null
          published_platform: string | null
          reason: string | null
          reframe_status: string | null
          reframe_url: string | null
          share_token: string | null
          start_sec: number | null
          status: string
          thumbnail_url: string | null
          tiktok_post_id: string | null
          title: string
          updated_at: string
          user_id: string
          viral_score: number | null
        }
        Insert: {
          caption?: string | null
          caption_style?: string | null
          created_at?: string
          custom_prompt?: string | null
          end_sec?: number | null
          hashtags?: string[] | null
          heygen_status?: string | null
          heygen_video_id?: string | null
          heygen_video_url?: string | null
          id?: string
          narration_status?: string | null
          narration_url?: string | null
          narration_voice_id?: string | null
          output_url?: string | null
          project_id: string
          published_at?: string | null
          published_platform?: string | null
          reason?: string | null
          reframe_status?: string | null
          reframe_url?: string | null
          share_token?: string | null
          start_sec?: number | null
          status?: string
          thumbnail_url?: string | null
          tiktok_post_id?: string | null
          title: string
          updated_at?: string
          user_id: string
          viral_score?: number | null
        }
        Update: {
          caption?: string | null
          caption_style?: string | null
          created_at?: string
          custom_prompt?: string | null
          end_sec?: number | null
          hashtags?: string[] | null
          heygen_status?: string | null
          heygen_video_id?: string | null
          heygen_video_url?: string | null
          id?: string
          narration_status?: string | null
          narration_url?: string | null
          narration_voice_id?: string | null
          output_url?: string | null
          project_id?: string
          published_at?: string | null
          published_platform?: string | null
          reason?: string | null
          reframe_status?: string | null
          reframe_url?: string | null
          share_token?: string | null
          start_sec?: number | null
          status?: string
          thumbnail_url?: string | null
          tiktok_post_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          viral_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clips_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_events: {
        Row: {
          clip_id: string | null
          created_at: string
          credits_delta: number
          description: string | null
          event_type: string
          id: string
          project_id: string | null
          user_id: string
        }
        Insert: {
          clip_id?: string | null
          created_at?: string
          credits_delta: number
          description?: string | null
          event_type: string
          id?: string
          project_id?: string | null
          user_id: string
        }
        Update: {
          clip_id?: string | null
          created_at?: string
          credits_delta?: number
          description?: string | null
          event_type?: string
          id?: string
          project_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_brl: number
          created_at: string
          credits_granted: number
          id: string
          plan: string
          provider: string
          provider_payment_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_brl: number
          created_at?: string
          credits_granted?: number
          id?: string
          plan: string
          provider: string
          provider_payment_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_brl?: number
          created_at?: string
          credits_granted?: number
          id?: string
          plan?: string
          provider?: string
          provider_payment_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          credits_remaining: number
          credits_total_used: number
          display_name: string | null
          id: string
          plan: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          credits_remaining?: number
          credits_total_used?: number
          display_name?: string | null
          id: string
          plan?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          credits_remaining?: number
          credits_total_used?: number
          display_name?: string | null
          id?: string
          plan?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          duration_sec: number | null
          id: string
          processing_error: string | null
          source_type: string
          source_url: string | null
          status: string
          thumbnail_url: string | null
          title: string
          transcript: string | null
          transcript_data: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_sec?: number | null
          id?: string
          processing_error?: string | null
          source_type?: string
          source_url?: string | null
          status?: string
          thumbnail_url?: string | null
          title: string
          transcript?: string | null
          transcript_data?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_sec?: number | null
          id?: string
          processing_error?: string | null
          source_type?: string
          source_url?: string | null
          status?: string
          thumbnail_url?: string | null
          title?: string
          transcript?: string | null
          transcript_data?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scheduled_posts: {
        Row: {
          clip_id: string
          created_at: string
          error: string | null
          id: string
          platform: string
          published_at: string | null
          scheduled_for: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          clip_id: string
          created_at?: string
          error?: string | null
          id?: string
          platform: string
          published_at?: string | null
          scheduled_for: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          clip_id?: string
          created_at?: string
          error?: string | null
          id?: string
          platform?: string
          published_at?: string | null
          scheduled_for?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tiktok_connections: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string | null
          id: string
          open_id: string | null
          refresh_token: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at?: string | null
          id?: string
          open_id?: string | null
          refresh_token?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          open_id?: string | null
          refresh_token?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
