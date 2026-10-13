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
          comment_reply: string | null
          created_at: string
          dm_buttons: NonNullable<Json>
          dm_message: string
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
          require_follow: boolean
          status: string
          updated_at: string
          workspace_id: string
          zernio_automation_id: string
        }
        ComputedFields: never
        Insert: {
          comment_reply?: string | null
          created_at?: string
          dm_buttons?: NonNullable<Json>
          dm_message: string
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
          require_follow?: boolean
          status: string
          updated_at?: string
          workspace_id: string
          zernio_automation_id: string
        }
        Update: {
          comment_reply?: string | null
          created_at?: string
          dm_buttons?: NonNullable<Json>
          dm_message?: string
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
          require_follow?: boolean
          status?: string
          updated_at?: string
          workspace_id?: string
          zernio_automation_id?: string
        }
        Relationships: [
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
            foreignKeyName: "automations_workspace_id_fkey"
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
          profile_picture_url: string | null
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
          profile_picture_url?: string | null
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
          profile_picture_url?: string | null
          status?: string
          updated_at?: string
          username?: string
          workspace_id?: string
          zernio_account_id?: string
        }
        Relationships: [
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
