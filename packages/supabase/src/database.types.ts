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
      api_keys: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          scopes: string[]
          token_hash: string
          token_prefix: string
          workspace_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          last_used_at?: string | null
          name: string
          revoked_at?: string | null
          scopes: string[]
          token_hash: string
          token_prefix: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          scopes?: string[]
          token_hash?: string
          token_prefix?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      automations: {
        Row: {
          account_platform: string
          comment_reply: string | null
          created_at: string
          dm_buttons: NonNullable<Json>
          dm_message: string
          follow_up: Json | null
          id: string
          instagram_account_id: string
          keywords: string[]
          match_mode: string
          name: string
          opening_dm_button: string | null
          opening_dm_message: string | null
          platform_post_id: string | null
          post_caption: string | null
          post_permalink: string | null
          post_scope: string
          product_carousel: Json | null
          require_follow: boolean
          scheduled_post_id: string | null
          status: string
          updated_at: string
          workspace_id: string
          zernio_automation_id: string
        }
        ComputedFields: never
        Insert: {
          account_platform?: string
          comment_reply?: string | null
          created_at?: string
          dm_buttons?: NonNullable<Json>
          dm_message: string
          follow_up?: Json | null
          id?: string
          instagram_account_id: string
          keywords?: string[]
          match_mode: string
          name: string
          opening_dm_button?: string | null
          opening_dm_message?: string | null
          platform_post_id?: string | null
          post_caption?: string | null
          post_permalink?: string | null
          post_scope: string
          product_carousel?: Json | null
          require_follow?: boolean
          scheduled_post_id?: string | null
          status: string
          updated_at?: string
          workspace_id: string
          zernio_automation_id: string
        }
        Update: {
          account_platform?: string
          comment_reply?: string | null
          created_at?: string
          dm_buttons?: NonNullable<Json>
          dm_message?: string
          follow_up?: Json | null
          id?: string
          instagram_account_id?: string
          keywords?: string[]
          match_mode?: string
          name?: string
          opening_dm_button?: string | null
          opening_dm_message?: string | null
          platform_post_id?: string | null
          post_caption?: string | null
          post_permalink?: string | null
          post_scope?: string
          product_carousel?: Json | null
          require_follow?: boolean
          scheduled_post_id?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string
          zernio_automation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automations_account_platform_fkey"
            columns: ["instagram_account_id", "account_platform"]
            isOneToOne: false
            referencedRelation: "instagram_accounts"
            referencedColumns: ["id", "platform"]
          },
          {
            foreignKeyName: "automations_account_workspace_fkey"
            columns: ["workspace_id", "instagram_account_id"]
            isOneToOne: false
            referencedRelation: "instagram_accounts"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "automations_instagram_account_id_fkey"
            columns: ["instagram_account_id"]
            isOneToOne: false
            referencedRelation: "instagram_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automations_scheduled_post_id_fkey"
            columns: ["scheduled_post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_up_jobs: {
        Row: {
          attempts: number
          automation_id: string
          automation_updated_at: string
          conversation_id: string
          created_at: string
          delivery_receipt: Json | null
          due_at: string
          follow_up: NonNullable<Json>
          id: string
          lease_owner: string | null
          lease_until: string | null
          provider_account_id: string
          provider_log_id: string | null
          provider_message_id: string
          reason: string | null
          recipient_id: string
          recipient_name: string | null
          retry_after: string
          sent_at: string | null
          source_sent_at: string
          status: string
          workspace_id: string
        }
        ComputedFields: never
        Insert: {
          attempts?: number
          automation_id: string
          automation_updated_at: string
          conversation_id: string
          created_at?: string
          delivery_receipt?: Json | null
          due_at: string
          follow_up: NonNullable<Json>
          id?: string
          lease_owner?: string | null
          lease_until?: string | null
          provider_account_id: string
          provider_log_id?: string | null
          provider_message_id: string
          reason?: string | null
          recipient_id: string
          recipient_name?: string | null
          retry_after: string
          sent_at?: string | null
          source_sent_at: string
          status?: string
          workspace_id: string
        }
        Update: {
          attempts?: number
          automation_id?: string
          automation_updated_at?: string
          conversation_id?: string
          created_at?: string
          delivery_receipt?: Json | null
          due_at?: string
          follow_up?: NonNullable<Json>
          id?: string
          lease_owner?: string | null
          lease_until?: string | null
          provider_account_id?: string
          provider_log_id?: string | null
          provider_message_id?: string
          reason?: string | null
          recipient_id?: string
          recipient_name?: string | null
          retry_after?: string
          sent_at?: string | null
          source_sent_at?: string
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_jobs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_jobs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_accounts: {
        Row: {
          created_at: string
          disconnect_reason: string | null
          display_name: string | null
          id: string
          platform: string
          profile_picture_url: string | null
          shared_platform_before_sets: boolean
          social_set_id: string
          status: string
          updated_at: string
          username: string
          workspace_id: string
          zernio_account_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          disconnect_reason?: string | null
          display_name?: string | null
          id?: string
          platform?: string
          profile_picture_url?: string | null
          shared_platform_before_sets?: boolean
          social_set_id: string
          status: string
          updated_at?: string
          username: string
          workspace_id: string
          zernio_account_id: string
        }
        Update: {
          created_at?: string
          disconnect_reason?: string | null
          display_name?: string | null
          id?: string
          platform?: string
          profile_picture_url?: string | null
          shared_platform_before_sets?: boolean
          social_set_id?: string
          status?: string
          updated_at?: string
          username?: string
          workspace_id?: string
          zernio_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_accounts_social_set_fkey"
            columns: ["social_set_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "social_sets"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "instagram_accounts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_authorizations: {
        Row: {
          client_id: string
          code_challenge: string
          code_hash: string | null
          created_at: string
          expires_at: string
          id: string
          redirect_uri: string
          state: string | null
          workspace_id: string | null
        }
        ComputedFields: never
        Insert: {
          client_id: string
          code_challenge: string
          code_hash?: string | null
          created_at?: string
          expires_at: string
          id?: string
          redirect_uri: string
          state?: string | null
          workspace_id?: string | null
        }
        Update: {
          client_id?: string
          code_challenge?: string
          code_hash?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          redirect_uri?: string
          state?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oauth_authorizations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "oauth_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oauth_authorizations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_clients: {
        Row: {
          created_at: string
          id: string
          last_used_at: string | null
          name: string
          redirect_uris: string[]
          secret_hash: string | null
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          id?: string
          last_used_at?: string | null
          name: string
          redirect_uris: string[]
          secret_hash?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_used_at?: string | null
          name?: string
          redirect_uris?: string[]
          secret_hash?: string | null
        }
        Relationships: []
      }
      scheduled_posts: {
        Row: {
          caption: string | null
          created_at: string
          error: string | null
          facebook_reel: boolean
          id: string
          instagram_account_id: string
          kind: string
          media: NonNullable<Json>
          permalink: string | null
          platform: string
          platform_post_id: string | null
          published_at: string | null
          scheduled_for: string
          status: string
          trial_graduation_strategy: string | null
          updated_at: string
          workspace_id: string
          youtube_made_for_kids: boolean | null
          youtube_title: string | null
          zernio_post_id: string
        }
        ComputedFields: never
        Insert: {
          caption?: string | null
          created_at?: string
          error?: string | null
          facebook_reel?: boolean
          id?: string
          instagram_account_id: string
          kind: string
          media: NonNullable<Json>
          permalink?: string | null
          platform?: string
          platform_post_id?: string | null
          published_at?: string | null
          scheduled_for: string
          status: string
          trial_graduation_strategy?: string | null
          updated_at?: string
          workspace_id: string
          youtube_made_for_kids?: boolean | null
          youtube_title?: string | null
          zernio_post_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          error?: string | null
          facebook_reel?: boolean
          id?: string
          instagram_account_id?: string
          kind?: string
          media?: NonNullable<Json>
          permalink?: string | null
          platform?: string
          platform_post_id?: string | null
          published_at?: string | null
          scheduled_for?: string
          status?: string
          trial_graduation_strategy?: string | null
          updated_at?: string
          workspace_id?: string
          youtube_made_for_kids?: boolean | null
          youtube_title?: string | null
          zernio_post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_posts_account_platform_fkey"
            columns: ["instagram_account_id", "platform"]
            isOneToOne: false
            referencedRelation: "instagram_accounts"
            referencedColumns: ["id", "platform"]
          },
          {
            foreignKeyName: "scheduled_posts_instagram_account_id_fkey"
            columns: ["instagram_account_id"]
            isOneToOne: false
            referencedRelation: "instagram_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_posts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      social_sets: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          workspace_id: string
          zernio_profile_id: string | null
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          workspace_id: string
          zernio_profile_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          workspace_id?: string
          zernio_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_sets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      upload_links: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          media: Json | null
          uploaded_at: string | null
          workspace_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          media?: Json | null
          uploaded_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          media?: Json | null
          uploaded_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "upload_links_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          error: string | null
          id: string
          payload: NonNullable<Json>
          processed_at: string | null
          received_at: string
          status: string
          type: string
        }
        ComputedFields: never
        Insert: {
          error?: string | null
          id: string
          payload: NonNullable<Json>
          processed_at?: string | null
          received_at?: string
          status: string
          type: string
        }
        Update: {
          error?: string | null
          id?: string
          payload?: NonNullable<Json>
          processed_at?: string | null
          received_at?: string
          status?: string
          type?: string
        }
        Relationships: []
      }
      workspace_billing: {
        Row: {
          billing_interval: string | null
          cancel_at_period_end: boolean | null
          checkout_interval: string | null
          checkout_plan: string | null
          checkout_requested_at: string | null
          checkout_session_id: string | null
          checkout_url: string | null
          created_at: string
          currency: string | null
          current_period_end: string | null
          dodo_customer_id: string
          dodo_subscription_id: string | null
          plan: string | null
          status: string | null
          subscription_created_at: string | null
          updated_at: string
          workspace_id: string
        }
        ComputedFields: never
        Insert: {
          billing_interval?: string | null
          cancel_at_period_end?: boolean | null
          checkout_interval?: string | null
          checkout_plan?: string | null
          checkout_requested_at?: string | null
          checkout_session_id?: string | null
          checkout_url?: string | null
          created_at?: string
          currency?: string | null
          current_period_end?: string | null
          dodo_customer_id: string
          dodo_subscription_id?: string | null
          plan?: string | null
          status?: string | null
          subscription_created_at?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          billing_interval?: string | null
          cancel_at_period_end?: boolean | null
          checkout_interval?: string | null
          checkout_plan?: string | null
          checkout_requested_at?: string | null
          checkout_session_id?: string | null
          checkout_url?: string | null
          created_at?: string
          currency?: string | null
          current_period_end?: string | null
          dodo_customer_id?: string
          dodo_subscription_id?: string | null
          plan?: string | null
          status?: string | null
          subscription_created_at?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_billing_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_operations: {
        Row: {
          owner: string
          started_at: string
          workspace_id: string
        }
        ComputedFields: never
        Insert: {
          owner: string
          started_at?: string
          workspace_id: string
        }
        Update: {
          owner?: string
          started_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_operations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          updated_at: string
          zernio_profile_id: string | null
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          updated_at?: string
          zernio_profile_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
          zernio_profile_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_follow_up_jobs: {
        Args: { p_limit?: number; p_owner: string }
        Returns: {
          attempts: number
          automation_id: string
          automation_updated_at: string
          conversation_id: string
          created_at: string
          delivery_receipt: Json | null
          due_at: string
          follow_up: NonNullable<Json>
          id: string
          lease_owner: string | null
          lease_until: string | null
          provider_account_id: string
          provider_log_id: string | null
          provider_message_id: string
          reason: string | null
          recipient_id: string
          recipient_name: string | null
          retry_after: string
          sent_at: string | null
          source_sent_at: string
          status: string
          workspace_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "follow_up_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_workspace_operation: {
        Args: { p_owner: string; p_workspace_id: string }
        Returns: boolean
      }
      delete_unused_oauth_clients: {
        Args: { registered_before: string }
        Returns: undefined
      }
      process_account_webhook: {
        Args: {
          p_account: Json
          p_id: string
          p_kind: string
          p_payload: Json
          p_type: string
        }
        Returns: string
      }
      process_follow_up_webhook: {
        Args: {
          p_account_id: string
          p_automation_id: string
          p_conversation_id: string
          p_id: string
          p_message_id: string
          p_payload: Json
          p_profile_id: string
          p_recipient_id: string
          p_sent_at: string
          p_type: string
        }
        Returns: string
      }
      release_workspace_operation: {
        Args: { p_owner: string; p_workspace_id: string }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
