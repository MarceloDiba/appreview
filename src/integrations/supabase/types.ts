export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string | null
          id: string
          role: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      cached_reviews: {
        Row: {
          author_image: string | null
          author_name: string
          author_uri: string | null
          created_at: string
          external_place_id: string
          google_maps_uri: string | null
          id: string
          rating: number
          review_id: string
          text: string | null
          time: string
        }
        Insert: {
          author_image?: string | null
          author_name: string
          author_uri?: string | null
          created_at?: string
          external_place_id: string
          google_maps_uri?: string | null
          id?: string
          rating: number
          review_id: string
          text?: string | null
          time: string
        }
        Update: {
          author_image?: string | null
          author_name?: string
          author_uri?: string | null
          created_at?: string
          external_place_id?: string
          google_maps_uri?: string | null
          id?: string
          rating?: number
          review_id?: string
          text?: string | null
          time?: string
        }
        Relationships: [
          {
            foreignKeyName: "cached_reviews_external_place_id_fkey"
            columns: ["external_place_id"]
            isOneToOne: false
            referencedRelation: "external_place_info"
            referencedColumns: ["id"]
          },
        ]
      }
      external_place_info: {
        Row: {
          average_rating: number
          created_at: string
          id: string
          last_fetch_time: string | null
          place_id: string
          place_name: string
          total_reviews: number
          updated_at: string
          user_id: string
        }
        Insert: {
          average_rating?: number
          created_at?: string
          id?: string
          last_fetch_time?: string | null
          place_id: string
          place_name: string
          total_reviews?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          average_rating?: number
          created_at?: string
          id?: string
          last_fetch_time?: string | null
          place_id?: string
          place_name?: string
          total_reviews?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      google_review_snapshots: {
        Row: {
          average_rating: number
          captured_at: string
          external_place_id: string
          id: string
          total_reviews: number
          user_id: string
        }
        Insert: {
          average_rating: number
          captured_at?: string
          external_place_id: string
          id?: string
          total_reviews: number
          user_id: string
        }
        Update: {
          average_rating?: number
          captured_at?: string
          external_place_id?: string
          id?: string
          total_reviews?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_review_snapshots_external_place_id_fkey"
            columns: ["external_place_id"]
            isOneToOne: false
            referencedRelation: "external_place_info"
            referencedColumns: ["id"]
          },
        ]
      }
      google_business_connections: {
        Row: {
          created_at: string
          granted_scopes: string[]
          last_error: string | null
          last_synced_at: string | null
          refresh_token_secret_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_scopes?: string[]
          last_error?: string | null
          last_synced_at?: string | null
          refresh_token_secret_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_scopes?: string[]
          last_error?: string | null
          last_synced_at?: string | null
          refresh_token_secret_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      google_business_locations: {
        Row: {
          account_name: string
          created_at: string
          id: string
          is_selected: boolean
          last_synced_at: string | null
          location_name: string
          place_id: string | null
          review_sync_completed_at: string | null
          review_sync_cursor: string | null
          store_code: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name: string
          created_at?: string
          id?: string
          is_selected?: boolean
          last_synced_at?: string | null
          location_name: string
          place_id?: string | null
          review_sync_completed_at?: string | null
          review_sync_cursor?: string | null
          store_code?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string
          created_at?: string
          id?: string
          is_selected?: boolean
          last_synced_at?: string | null
          location_name?: string
          place_id?: string | null
          review_sync_completed_at?: string | null
          review_sync_cursor?: string | null
          store_code?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      google_business_reviews: {
        Row: {
          comment: string | null
          created_at: string
          google_review_name: string
          id: string
          is_anonymous: boolean
          location_id: string
          rating: number
          reply_state: string | null
          reply_text: string | null
          reply_updated_at: string | null
          review_created_at: string | null
          review_updated_at: string | null
          reviewer_name: string | null
          reviewer_photo_url: string | null
          synced_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          google_review_name: string
          id?: string
          is_anonymous?: boolean
          location_id: string
          rating: number
          reply_state?: string | null
          reply_text?: string | null
          reply_updated_at?: string | null
          review_created_at?: string | null
          review_updated_at?: string | null
          reviewer_name?: string | null
          reviewer_photo_url?: string | null
          synced_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          google_review_name?: string
          id?: string
          is_anonymous?: boolean
          location_id?: string
          rating?: number
          reply_state?: string | null
          reply_text?: string | null
          reply_updated_at?: string | null
          review_created_at?: string | null
          review_updated_at?: string | null
          reviewer_name?: string | null
          reviewer_photo_url?: string | null
          synced_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      google_public_reviews_answered: {
        Row: {
          answered_at: string
          review_id: string
          user_id: string
        }
        Insert: {
          answered_at?: string
          review_id: string
          user_id: string
        }
        Update: {
          answered_at?: string
          review_id?: string
          user_id?: string
        }
        Relationships: []
      }
      google_reviews_awaiting_reply: {
        Row: {
          collected_at: string
          comment: string
          expires_at: string
          published_at: string | null
          rating: number
          response_observed: boolean
          review_id: string
          review_url: string | null
          reviewer_name: string | null
          user_id: string
        }
        Insert: {
          collected_at?: string
          comment: string
          expires_at: string
          published_at?: string | null
          rating: number
          response_observed?: boolean
          review_id: string
          review_url?: string | null
          reviewer_name?: string | null
          user_id: string
        }
        Update: {
          collected_at?: string
          comment?: string
          expires_at?: string
          published_at?: string | null
          rating?: number
          response_observed?: boolean
          review_id?: string
          review_url?: string | null
          reviewer_name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      internal_feedback: {
        Row: {
          created_at: string | null
          customer_email: string | null
          customer_name: string | null
          feedback_text: string | null
          id: string
          is_addressed: boolean | null
          rating: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          feedback_text?: string | null
          id?: string
          is_addressed?: boolean | null
          rating?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          feedback_text?: string | null
          id?: string
          is_addressed?: boolean | null
          rating?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      platform_links: {
        Row: {
          business_name: string | null
          created_at: string | null
          display_name: string | null
          id: string
          place_id: string | null
          platform: string
          updated_at: string | null
          url: string
          user_id: string
        }
        Insert: {
          business_name?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          place_id?: string | null
          platform: string
          updated_at?: string | null
          url: string
          user_id: string
        }
        Update: {
          business_name?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          place_id?: string | null
          platform?: string
          updated_at?: string | null
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          business_country: string | null
          business_name: string | null
          created_at: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          subscription_end_date: string | null
          subscription_plan: string | null
          subscription_start_date: string | null
          subscription_status: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          business_country?: string | null
          business_name?: string | null
          created_at?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          subscription_end_date?: string | null
          subscription_plan?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          business_country?: string | null
          business_name?: string | null
          created_at?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          subscription_end_date?: string | null
          subscription_plan?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      qr_codes: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          redirect_url: string
          slug: string
          times_scanned: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          redirect_url: string
          slug: string
          times_scanned?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          redirect_url?: string
          slug?: string
          times_scanned?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          created_at: string | null
          customer_name: string | null
          external_review_id: string | null
          id: string
          platform: string
          rating: number
          response_status: string | null
          response_text: string | null
          review_date: string | null
          review_text: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          customer_name?: string | null
          external_review_id?: string | null
          id?: string
          platform: string
          rating: number
          response_status?: string | null
          response_text?: string | null
          review_date?: string | null
          review_text?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          customer_name?: string | null
          external_review_id?: string | null
          id?: string
          platform?: string
          rating?: number
          response_status?: string | null
          response_text?: string | null
          review_date?: string | null
          review_text?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      review_funnel_events: {
        Row: {
          created_at: string
          event_key: string
          event_type: string
          id: string
          platform: string | null
          qr_code_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_key: string
          event_type: string
          id?: string
          platform?: string | null
          qr_code_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_key?: string
          event_type?: string
          id?: string
          platform?: string | null
          qr_code_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_funnel_events_qr_code_id_fkey"
            columns: ["qr_code_id"]
            isOneToOne: false
            referencedRelation: "qr_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      google_business_reputation_snapshots: {
        Row: {
          average_rating: number
          average_response_hours: number | null
          captured_at: string
          id: string
          location_id: string | null
          rating_breakdown: Json
          reviews_last_30_days: number | null
          source: string
          topics: Json
          total_reviews: number
          unanswered_review_count: number
          user_id: string
          weekly_history: Json | null
        }
        Insert: {
          average_rating: number
          average_response_hours?: number | null
          captured_at?: string
          id?: string
          location_id?: string | null
          rating_breakdown?: Json
          reviews_last_30_days?: number | null
          source?: string
          topics?: Json
          total_reviews: number
          unanswered_review_count?: number
          user_id: string
          weekly_history?: Json | null
        }
        Update: {
          average_rating?: number
          average_response_hours?: number | null
          captured_at?: string
          id?: string
          location_id?: string | null
          rating_breakdown?: Json
          reviews_last_30_days?: number | null
          source?: string
          topics?: Json
          total_reviews?: number
          unanswered_review_count?: number
          user_id?: string
          weekly_history?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "google_business_reputation_snapshots_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "google_business_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at: string | null
          created_at: string | null
          currency: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_name: string | null
          price_per_month: number | null
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at?: string | null
          created_at?: string | null
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_name?: string | null
          price_per_month?: number | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at?: string | null
          created_at?: string | null
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_name?: string | null
          price_per_month?: number | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_public_qr_business: {
        Args: {
          p_identifier: string
        }
        Returns: {
          business_name: string
          google_review_url: string | null
          qr_code_id: string
          qr_name: string
          tripadvisor_review_url: string | null
          user_id: string
        }[]
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
