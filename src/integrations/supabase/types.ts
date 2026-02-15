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
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          league_id: string
          sender_name: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          league_id: string
          sender_name: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          league_id?: string
          sender_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "multiplayer_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      game_saves: {
        Row: {
          club_data: Json
          created_at: string
          id: string
          save_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          club_data: Json
          created_at?: string
          id?: string
          save_name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          club_data?: Json
          created_at?: string
          id?: string
          save_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      global_chat_messages: {
        Row: {
          club_name: string
          content: string
          created_at: string
          id: string
          sender_name: string
          user_id: string
        }
        Insert: {
          club_name?: string
          content: string
          created_at?: string
          id?: string
          sender_name: string
          user_id: string
        }
        Update: {
          club_name?: string
          content?: string
          created_at?: string
          id?: string
          sender_name?: string
          user_id?: string
        }
        Relationships: []
      }
      league_matches: {
        Row: {
          away_goals: number | null
          away_user_id: string
          created_at: string
          home_goals: number | null
          home_user_id: string
          id: string
          league_id: string
          match_data: Json | null
          played_at: string | null
          round: number
          status: string
        }
        Insert: {
          away_goals?: number | null
          away_user_id: string
          created_at?: string
          home_goals?: number | null
          home_user_id: string
          id?: string
          league_id: string
          match_data?: Json | null
          played_at?: string | null
          round?: number
          status?: string
        }
        Update: {
          away_goals?: number | null
          away_user_id?: string
          created_at?: string
          home_goals?: number | null
          home_user_id?: string
          id?: string
          league_id?: string
          match_data?: Json | null
          played_at?: string | null
          round?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_matches_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "multiplayer_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      league_members: {
        Row: {
          club_logo: string
          club_name: string
          draws: number
          goals_against: number
          goals_for: number
          id: string
          joined_at: string
          league_id: string
          losses: number
          played: number
          points: number
          reputation: number
          user_id: string
          wins: number
        }
        Insert: {
          club_logo?: string
          club_name?: string
          draws?: number
          goals_against?: number
          goals_for?: number
          id?: string
          joined_at?: string
          league_id: string
          losses?: number
          played?: number
          points?: number
          reputation?: number
          user_id: string
          wins?: number
        }
        Update: {
          club_logo?: string
          club_name?: string
          draws?: number
          goals_against?: number
          goals_for?: number
          id?: string
          joined_at?: string
          league_id?: string
          losses?: number
          played?: number
          points?: number
          reputation?: number
          user_id?: string
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "league_members_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "multiplayer_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      league_squads: {
        Row: {
          id: string
          league_id: string
          squad_data: Json
          tactics_data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          league_id: string
          squad_data?: Json
          tactics_data?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          league_id?: string
          squad_data?: Json
          tactics_data?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_squads_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "multiplayer_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      multiplayer_leagues: {
        Row: {
          code: string
          created_at: string
          current_round: number
          id: string
          max_members: number
          name: string
          owner_id: string
          season: number
          season_status: string
          status: string
        }
        Insert: {
          code: string
          created_at?: string
          current_round?: number
          id?: string
          max_members?: number
          name: string
          owner_id: string
          season?: number
          season_status?: string
          status?: string
        }
        Update: {
          code?: string
          created_at?: string
          current_round?: number
          id?: string
          max_members?: number
          name?: string
          owner_id?: string
          season?: number
          season_status?: string
          status?: string
        }
        Relationships: []
      }
      player_auctions: {
        Row: {
          created_at: string
          current_bid: number
          current_bidder_id: string | null
          current_bidder_name: string | null
          expires_at: string
          id: string
          min_price: number
          player_age: number
          player_data: Json
          player_name: string
          player_overall: number
          seller_club_name: string
          seller_id: string
          status: string
        }
        Insert: {
          created_at?: string
          current_bid?: number
          current_bidder_id?: string | null
          current_bidder_name?: string | null
          expires_at?: string
          id?: string
          min_price: number
          player_age: number
          player_data: Json
          player_name: string
          player_overall: number
          seller_club_name?: string
          seller_id: string
          status?: string
        }
        Update: {
          created_at?: string
          current_bid?: number
          current_bidder_id?: string | null
          current_bidder_name?: string | null
          expires_at?: string
          id?: string
          min_price?: number
          player_age?: number
          player_data?: Json
          player_name?: string
          player_overall?: number
          seller_club_name?: string
          seller_id?: string
          status?: string
        }
        Relationships: []
      }
      premium_users: {
        Row: {
          activated_at: string
          id: string
          pix_transaction_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          activated_at?: string
          id?: string
          pix_transaction_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          activated_at?: string
          id?: string
          pix_transaction_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      private_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          league_id: string
          read: boolean
          receiver_id: string
          sender_id: string
          sender_name: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          league_id: string
          read?: boolean
          receiver_id: string
          sender_id: string
          sender_name: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          league_id?: string
          read?: boolean
          receiver_id?: string
          sender_id?: string
          sender_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "private_messages_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "multiplayer_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      rivalries: {
        Row: {
          created_at: string
          draws: number
          id: string
          intensity: string
          league_id: string
          matches_played: number
          user_a: string
          user_a_wins: number
          user_b: string
          user_b_wins: number
        }
        Insert: {
          created_at?: string
          draws?: number
          id?: string
          intensity?: string
          league_id: string
          matches_played?: number
          user_a: string
          user_a_wins?: number
          user_b: string
          user_b_wins?: number
        }
        Update: {
          created_at?: string
          draws?: number
          id?: string
          intensity?: string
          league_id?: string
          matches_played?: number
          user_a?: string
          user_a_wins?: number
          user_b?: string
          user_b_wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "rivalries_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "multiplayer_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_proposals: {
        Row: {
          created_at: string
          id: string
          league_id: string
          loan_duration: number | null
          message: string | null
          player_data: Json | null
          player_name: string
          price: number
          proposal_type: string
          receiver_id: string
          sender_id: string
          sender_name: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          league_id: string
          loan_duration?: number | null
          message?: string | null
          player_data?: Json | null
          player_name: string
          price?: number
          proposal_type?: string
          receiver_id: string
          sender_id: string
          sender_name: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          league_id?: string
          loan_duration?: number | null
          message?: string | null
          player_data?: Json | null
          player_name?: string
          price?: number
          proposal_type?: string
          receiver_id?: string
          sender_id?: string
          sender_name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_proposals_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "multiplayer_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
