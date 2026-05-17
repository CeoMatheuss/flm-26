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
      abuse_alerts: {
        Row: {
          alert_type: string
          created_at: string
          description: string
          details: Json
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          severity: string
          status: string
          title: string
          user_id: string
        }
        Insert: {
          alert_type?: string
          created_at?: string
          description: string
          details?: Json
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          status?: string
          title: string
          user_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          description?: string
          details?: Json
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_finance_logs: {
        Row: {
          admin_id: string | null
          amount: number
          created_at: string | null
          id: string
          reason: string | null
          target_user_id: string | null
        }
        Insert: {
          admin_id?: string | null
          amount: number
          created_at?: string | null
          id?: string
          reason?: string | null
          target_user_id?: string | null
        }
        Update: {
          admin_id?: string | null
          amount?: number
          created_at?: string | null
          id?: string
          reason?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      admin_login_attempts: {
        Row: {
          attempted_at: string
          id: string
          success: boolean
          user_id: string
        }
        Insert: {
          attempted_at?: string
          id?: string
          success?: boolean
          user_id: string
        }
        Update: {
          attempted_at?: string
          id?: string
          success?: boolean
          user_id?: string
        }
        Relationships: []
      }
      admin_logs: {
        Row: {
          action: string
          created_at: string
          details: Json
          id: string
          target_user_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json
          id?: string
          target_user_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json
          id?: string
          target_user_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      auction_bids: {
        Row: {
          amount: number
          auction_id: string
          bidder_id: string
          bidder_name: string
          created_at: string
          id: string
        }
        Insert: {
          amount: number
          auction_id: string
          bidder_id: string
          bidder_name: string
          created_at?: string
          id?: string
        }
        Update: {
          amount?: number
          auction_id?: string
          bidder_id?: string
          bidder_name?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auction_bids_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "player_auctions"
            referencedColumns: ["id"]
          },
        ]
      }
      auction_history: {
        Row: {
          auction_id: string | null
          completed_at: string | null
          final_price: number | null
          id: string
          player_id: string | null
          player_name: string | null
          player_overall: number | null
          seller_club_name: string | null
          seller_id: string | null
          winner_club_name: string | null
          winner_id: string | null
        }
        Insert: {
          auction_id?: string | null
          completed_at?: string | null
          final_price?: number | null
          id?: string
          player_id?: string | null
          player_name?: string | null
          player_overall?: number | null
          seller_club_name?: string | null
          seller_id?: string | null
          winner_club_name?: string | null
          winner_id?: string | null
        }
        Update: {
          auction_id?: string | null
          completed_at?: string | null
          final_price?: number | null
          id?: string
          player_id?: string | null
          player_name?: string | null
          player_overall?: number | null
          seller_club_name?: string | null
          seller_id?: string | null
          winner_club_name?: string | null
          winner_id?: string | null
        }
        Relationships: []
      }
      auth_verification_codes: {
        Row: {
          attempts: number | null
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          used_at: string | null
          user_id: string | null
        }
        Insert: {
          attempts?: number | null
          code: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          used_at?: string | null
          user_id?: string | null
        }
        Update: {
          attempts?: number | null
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          used_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      beta_access_requests: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      beta_whitelist: {
        Row: {
          approved_by: string | null
          created_at: string
          email: string
          id: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      chat_bans: {
        Row: {
          banned_at: string
          banned_by: string
          expires_at: string | null
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          banned_at?: string
          banned_by: string
          expires_at?: string | null
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          banned_at?: string
          banned_by?: string
          expires_at?: string | null
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
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
      club_active_effects: {
        Row: {
          bonus_data: Json | null
          category: string
          club_id: string
          created_at: string | null
          expires_at: string | null
          id: string
          item_id: string
          last_delivery_at: string
          started_at: string | null
        }
        Insert: {
          bonus_data?: Json | null
          category: string
          club_id: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          item_id: string
          last_delivery_at?: string
          started_at?: string | null
        }
        Update: {
          bonus_data?: Json | null
          category?: string
          club_id?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          item_id?: string
          last_delivery_at?: string
          started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "club_active_effects_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_memberships: {
        Row: {
          active_plan_id: string | null
          churn_rate: number | null
          club_id: string
          happiness: number | null
          id: string
          monthly_revenue_cents: number | null
          total_members: number | null
          updated_at: string | null
        }
        Insert: {
          active_plan_id?: string | null
          churn_rate?: number | null
          club_id: string
          happiness?: number | null
          id?: string
          monthly_revenue_cents?: number | null
          total_members?: number | null
          updated_at?: string | null
        }
        Update: {
          active_plan_id?: string | null
          churn_rate?: number | null
          club_id?: string
          happiness?: number | null
          id?: string
          monthly_revenue_cents?: number | null
          total_members?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "club_memberships_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: true
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_shop_products: {
        Row: {
          base_price_cents: number
          category: string
          created_at: string | null
          id: string
          image_url: string | null
          min_level: number
          name: string
        }
        Insert: {
          base_price_cents: number
          category: string
          created_at?: string | null
          id: string
          image_url?: string | null
          min_level?: number
          name: string
        }
        Update: {
          base_price_cents?: number
          category?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          min_level?: number
          name?: string
        }
        Relationships: []
      }
      club_shop_stats: {
        Row: {
          buying_fans: number
          club_id: string
          created_at: string | null
          daily_revenue: number
          daily_sales_avg: number
          id: string
          last_update: string | null
          level: number
          monthly_revenue: number
          popularity: number
          revenue_history: Json
          total_profit: number
          total_revenue: number
          total_sales: number
          updated_at: string | null
          weekly_revenue: number
        }
        Insert: {
          buying_fans?: number
          club_id: string
          created_at?: string | null
          daily_revenue?: number
          daily_sales_avg?: number
          id?: string
          last_update?: string | null
          level?: number
          monthly_revenue?: number
          popularity?: number
          revenue_history?: Json
          total_profit?: number
          total_revenue?: number
          total_sales?: number
          updated_at?: string | null
          weekly_revenue?: number
        }
        Update: {
          buying_fans?: number
          club_id?: string
          created_at?: string | null
          daily_revenue?: number
          daily_sales_avg?: number
          id?: string
          last_update?: string | null
          level?: number
          monthly_revenue?: number
          popularity?: number
          revenue_history?: Json
          total_profit?: number
          total_revenue?: number
          total_sales?: number
          updated_at?: string | null
          weekly_revenue?: number
        }
        Relationships: [
          {
            foreignKeyName: "club_shop_stats_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: true
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_sponsorships: {
        Row: {
          bonus_data: Json | null
          club_id: string
          contract_value_cents: number
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          payment_type: string
          sponsor_name: string
          started_at: string | null
        }
        Insert: {
          bonus_data?: Json | null
          club_id: string
          contract_value_cents: number
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          payment_type: string
          sponsor_name: string
          started_at?: string | null
        }
        Update: {
          bonus_data?: Json | null
          club_id?: string
          contract_value_cents?: number
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          payment_type?: string
          sponsor_name?: string
          started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "club_sponsorships_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_uniform_launches: {
        Row: {
          club_id: string
          config: Json
          hype_score: number | null
          id: string
          initial_fans: number
          initial_reputation: number
          last_sales_update_at: string | null
          launched_at: string
          name: string
          peak_daily_sales: number | null
          total_revenue_cents: number | null
          total_sales_count: number | null
        }
        Insert: {
          club_id: string
          config: Json
          hype_score?: number | null
          id?: string
          initial_fans: number
          initial_reputation: number
          last_sales_update_at?: string | null
          launched_at?: string
          name: string
          peak_daily_sales?: number | null
          total_revenue_cents?: number | null
          total_sales_count?: number | null
        }
        Update: {
          club_id?: string
          config?: Json
          hype_score?: number | null
          id?: string
          initial_fans?: number
          initial_reputation?: number
          last_sales_update_at?: string | null
          launched_at?: string
          name?: string
          peak_daily_sales?: number | null
          total_revenue_cents?: number | null
          total_sales_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "club_uniform_launches_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          budget: number | null
          cash: number | null
          country: string
          created_at: string
          current_uniform_launch_id: string | null
          detail_color: string | null
          engagement_rate: number | null
          fans: number | null
          id: string
          last_youth_generation_at: string | null
          logo_url: string | null
          name: string
          primary_color: string | null
          reputation: number | null
          sales_bonus_multiplier: number | null
          secondary_color: string | null
          shield_config: Json | null
          stadium_name: string | null
          total_members: number | null
          uniform_launches_available: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          budget?: number | null
          cash?: number | null
          country?: string
          created_at?: string
          current_uniform_launch_id?: string | null
          detail_color?: string | null
          engagement_rate?: number | null
          fans?: number | null
          id?: string
          last_youth_generation_at?: string | null
          logo_url?: string | null
          name: string
          primary_color?: string | null
          reputation?: number | null
          sales_bonus_multiplier?: number | null
          secondary_color?: string | null
          shield_config?: Json | null
          stadium_name?: string | null
          total_members?: number | null
          uniform_launches_available?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          budget?: number | null
          cash?: number | null
          country?: string
          created_at?: string
          current_uniform_launch_id?: string | null
          detail_color?: string | null
          engagement_rate?: number | null
          fans?: number | null
          id?: string
          last_youth_generation_at?: string | null
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          reputation?: number | null
          sales_bonus_multiplier?: number | null
          secondary_color?: string | null
          shield_config?: Json | null
          stadium_name?: string | null
          total_members?: number | null
          uniform_launches_available?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clubs_current_uniform_launch_id_fkey"
            columns: ["current_uniform_launch_id"]
            isOneToOne: false
            referencedRelation: "club_uniform_launches"
            referencedColumns: ["id"]
          },
        ]
      }
      continental_qualifications: {
        Row: {
          club_logo: string | null
          club_name: string
          consumed: boolean
          continent: string
          country: string
          id: string
          qualified_at: string
          season_year: number
          source: string
          tier: string
          user_id: string | null
        }
        Insert: {
          club_logo?: string | null
          club_name: string
          consumed?: boolean
          continent: string
          country: string
          id?: string
          qualified_at?: string
          season_year: number
          source: string
          tier: string
          user_id?: string | null
        }
        Update: {
          club_logo?: string | null
          club_name?: string
          consumed?: boolean
          continent?: string
          country?: string
          id?: string
          qualified_at?: string
          season_year?: number
          source?: string
          tier?: string
          user_id?: string | null
        }
        Relationships: []
      }
      countries: {
        Row: {
          code: string
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      country_status: {
        Row: {
          bonus_budget: number | null
          country: string
          is_locked: boolean | null
          max_capacity: number | null
          total_players: number | null
          updated_at: string | null
        }
        Insert: {
          bonus_budget?: number | null
          country: string
          is_locked?: boolean | null
          max_capacity?: number | null
          total_players?: number | null
          updated_at?: string | null
        }
        Update: {
          bonus_budget?: number | null
          country?: string
          is_locked?: boolean | null
          max_capacity?: number | null
          total_players?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      cup_config: {
        Row: {
          created_at: string | null
          cup_type: string | null
          id: string
          prizes: Json | null
        }
        Insert: {
          created_at?: string | null
          cup_type?: string | null
          id?: string
          prizes?: Json | null
        }
        Update: {
          created_at?: string | null
          cup_type?: string | null
          id?: string
          prizes?: Json | null
        }
        Relationships: []
      }
      cup_news: {
        Row: {
          content: string
          created_at: string | null
          cup_id: string | null
          id: string
          image_url: string | null
          metadata: Json | null
          template_key: string | null
          title: string
        }
        Insert: {
          content: string
          created_at?: string | null
          cup_id?: string | null
          id?: string
          image_url?: string | null
          metadata?: Json | null
          template_key?: string | null
          title: string
        }
        Update: {
          content?: string
          created_at?: string | null
          cup_id?: string | null
          id?: string
          image_url?: string | null
          metadata?: Json | null
          template_key?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "cup_news_cup_id_fkey"
            columns: ["cup_id"]
            isOneToOne: false
            referencedRelation: "national_cups"
            referencedColumns: ["id"]
          },
        ]
      }
      cup_player_stats: {
        Row: {
          assists: number | null
          avg_rating: number | null
          clean_sheets: number | null
          created_at: string | null
          cup_id: string | null
          decisive_passes: number | null
          goals: number | null
          goals_conceded: number | null
          id: string
          matches_played: number | null
          minutes_played: number | null
          motm_count: number | null
          player_id: string | null
          player_name: string | null
          red_cards: number | null
          team_id: string | null
          team_name: string | null
          yellow_cards: number | null
        }
        Insert: {
          assists?: number | null
          avg_rating?: number | null
          clean_sheets?: number | null
          created_at?: string | null
          cup_id?: string | null
          decisive_passes?: number | null
          goals?: number | null
          goals_conceded?: number | null
          id?: string
          matches_played?: number | null
          minutes_played?: number | null
          motm_count?: number | null
          player_id?: string | null
          player_name?: string | null
          red_cards?: number | null
          team_id?: string | null
          team_name?: string | null
          yellow_cards?: number | null
        }
        Update: {
          assists?: number | null
          avg_rating?: number | null
          clean_sheets?: number | null
          created_at?: string | null
          cup_id?: string | null
          decisive_passes?: number | null
          goals?: number | null
          goals_conceded?: number | null
          id?: string
          matches_played?: number | null
          minutes_played?: number | null
          motm_count?: number | null
          player_id?: string | null
          player_name?: string | null
          red_cards?: number | null
          team_id?: string | null
          team_name?: string | null
          yellow_cards?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cup_player_stats_cup_id_fkey"
            columns: ["cup_id"]
            isOneToOne: false
            referencedRelation: "national_cups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cup_player_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "world_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cup_player_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "world_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_tournament_matches: {
        Row: {
          away_goals: number | null
          away_team_id: string
          created_at: string
          home_goals: number | null
          home_team_id: string
          id: string
          leg: number
          match_data: Json | null
          played_at: string | null
          round: number
          scheduled_at: string | null
          stage: string | null
          status: string
          tournament_id: string
        }
        Insert: {
          away_goals?: number | null
          away_team_id: string
          created_at?: string
          home_goals?: number | null
          home_team_id: string
          id?: string
          leg?: number
          match_data?: Json | null
          played_at?: string | null
          round?: number
          scheduled_at?: string | null
          stage?: string | null
          status?: string
          tournament_id: string
        }
        Update: {
          away_goals?: number | null
          away_team_id?: string
          created_at?: string
          home_goals?: number | null
          home_team_id?: string
          id?: string
          leg?: number
          match_data?: Json | null
          played_at?: string | null
          round?: number
          scheduled_at?: string | null
          stage?: string | null
          status?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_tournament_matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "custom_tournament_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_tournament_matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "custom_tournament_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_tournament_matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "custom_tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_tournament_teams: {
        Row: {
          bot_name: string | null
          bot_squad: Json | null
          bot_strength: number | null
          club_logo: string | null
          club_name: string
          draws: number
          eliminated: boolean
          goals_against: number
          goals_for: number
          group_letter: string | null
          id: string
          is_bot: boolean
          joined_at: string
          losses: number
          played: number
          points: number
          tournament_id: string
          user_id: string | null
          wins: number
        }
        Insert: {
          bot_name?: string | null
          bot_squad?: Json | null
          bot_strength?: number | null
          club_logo?: string | null
          club_name?: string
          draws?: number
          eliminated?: boolean
          goals_against?: number
          goals_for?: number
          group_letter?: string | null
          id?: string
          is_bot?: boolean
          joined_at?: string
          losses?: number
          played?: number
          points?: number
          tournament_id: string
          user_id?: string | null
          wins?: number
        }
        Update: {
          bot_name?: string | null
          bot_squad?: Json | null
          bot_strength?: number | null
          club_logo?: string | null
          club_name?: string
          draws?: number
          eliminated?: boolean
          goals_against?: number
          goals_for?: number
          group_letter?: string | null
          id?: string
          is_bot?: boolean
          joined_at?: string
          losses?: number
          played?: number
          points?: number
          tournament_id?: string
          user_id?: string | null
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "custom_tournament_teams_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "custom_tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_tournaments: {
        Row: {
          country: string | null
          created_at: string
          created_by: string
          current_round: number
          description: string | null
          format: string
          id: string
          match_duration_seconds: number
          match_interval_hours: number
          match_time: string | null
          max_teams: number
          name: string
          prize_1st: number
          prize_2nd: number
          prize_3rd: number
          rules_text: string | null
          season: number
          start_date: string | null
          status: string
          tie_breaker: string
          total_rounds: number
          two_legs: boolean
          updated_at: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          created_by: string
          current_round?: number
          description?: string | null
          format?: string
          id?: string
          match_duration_seconds?: number
          match_interval_hours?: number
          match_time?: string | null
          max_teams?: number
          name: string
          prize_1st?: number
          prize_2nd?: number
          prize_3rd?: number
          rules_text?: string | null
          season?: number
          start_date?: string | null
          status?: string
          tie_breaker?: string
          total_rounds?: number
          two_legs?: boolean
          updated_at?: string
        }
        Update: {
          country?: string | null
          created_at?: string
          created_by?: string
          current_round?: number
          description?: string | null
          format?: string
          id?: string
          match_duration_seconds?: number
          match_interval_hours?: number
          match_time?: string | null
          max_teams?: number
          name?: string
          prize_1st?: number
          prize_2nd?: number
          prize_3rd?: number
          rules_text?: string | null
          season?: number
          start_date?: string | null
          status?: string
          tie_breaker?: string
          total_rounds?: number
          two_legs?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      daily_training_sessions: {
        Row: {
          created_at: string
          dev_points_earned: number
          fatigue_generated: number
          focus: string
          id: string
          intensity: string
          player_id: string
          session_date: string
          session_slot: number
          training_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dev_points_earned?: number
          fatigue_generated?: number
          focus?: string
          id?: string
          intensity?: string
          player_id: string
          session_date?: string
          session_slot?: number
          training_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dev_points_earned?: number
          fatigue_generated?: number
          focus?: string
          id?: string
          intensity?: string
          player_id?: string
          session_date?: string
          session_slot?: number
          training_type?: string
          user_id?: string
        }
        Relationships: []
      }
      free_agent_offers: {
        Row: {
          agent_id: string
          buyer_club_name: string
          buyer_id: string
          counter_salary: number | null
          created_at: string
          decision_deadline: string
          id: string
          offered_contract_years: number
          offered_salary: number
          rejection_reason: string | null
          resolved_at: string | null
          signing_bonus: number
          status: string
        }
        Insert: {
          agent_id: string
          buyer_club_name: string
          buyer_id: string
          counter_salary?: number | null
          created_at?: string
          decision_deadline?: string
          id?: string
          offered_contract_years?: number
          offered_salary?: number
          rejection_reason?: string | null
          resolved_at?: string | null
          signing_bonus?: number
          status?: string
        }
        Update: {
          agent_id?: string
          buyer_club_name?: string
          buyer_id?: string
          counter_salary?: number | null
          created_at?: string
          decision_deadline?: string
          id?: string
          offered_contract_years?: number
          offered_salary?: number
          rejection_reason?: string | null
          resolved_at?: string | null
          signing_bonus?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "free_agent_offers_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "free_agents_market"
            referencedColumns: ["id"]
          },
        ]
      }
      free_agents_market: {
        Row: {
          available_from: string
          available_until: string
          created_at: string
          id: string
          origin: string
          origin_club_name: string | null
          player_age: number
          player_data: Json
          player_name: string
          player_overall: number
          player_position: string
          visible_stats: Json
        }
        Insert: {
          available_from?: string
          available_until?: string
          created_at?: string
          id?: string
          origin?: string
          origin_club_name?: string | null
          player_age: number
          player_data: Json
          player_name: string
          player_overall: number
          player_position: string
          visible_stats?: Json
        }
        Update: {
          available_from?: string
          available_until?: string
          created_at?: string
          id?: string
          origin?: string
          origin_club_name?: string | null
          player_age?: number
          player_data?: Json
          player_name?: string
          player_overall?: number
          player_position?: string
          visible_stats?: Json
        }
        Relationships: []
      }
      friendly_invites: {
        Row: {
          auto_sim_at: string | null
          away_joined: boolean
          created_at: string
          home_joined: boolean
          home_team_id: string
          id: string
          lobby_opened_at: string | null
          match_date: string
          match_result: Json | null
          receiver_club_name: string
          receiver_id: string
          receiver_stadium: string
          receiver_stadium_capacity: number
          sender_club_name: string
          sender_id: string
          sender_stadium: string
          sender_stadium_capacity: number
          status: string
          tie_breaker: string
          updated_at: string
        }
        Insert: {
          auto_sim_at?: string | null
          away_joined?: boolean
          created_at?: string
          home_joined?: boolean
          home_team_id: string
          id?: string
          lobby_opened_at?: string | null
          match_date: string
          match_result?: Json | null
          receiver_club_name?: string
          receiver_id: string
          receiver_stadium?: string
          receiver_stadium_capacity?: number
          sender_club_name?: string
          sender_id: string
          sender_stadium?: string
          sender_stadium_capacity?: number
          status?: string
          tie_breaker?: string
          updated_at?: string
        }
        Update: {
          auto_sim_at?: string | null
          away_joined?: boolean
          created_at?: string
          home_joined?: boolean
          home_team_id?: string
          id?: string
          lobby_opened_at?: string | null
          match_date?: string
          match_result?: Json | null
          receiver_club_name?: string
          receiver_id?: string
          receiver_stadium?: string
          receiver_stadium_capacity?: number
          sender_club_name?: string
          sender_id?: string
          sender_stadium?: string
          sender_stadium_capacity?: number
          status?: string
          tie_breaker?: string
          updated_at?: string
        }
        Relationships: []
      }
      game_bans: {
        Row: {
          banned_at: string
          banned_by: string
          created_at: string
          duration_months: number
          expires_at: string
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          banned_at?: string
          banned_by: string
          created_at?: string
          duration_months?: number
          expires_at: string
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          banned_at?: string
          banned_by?: string
          created_at?: string
          duration_months?: number
          expires_at?: string
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      game_saves: {
        Row: {
          club_data: Json
          country: string | null
          created_at: string
          game_state: Json | null
          id: string
          last_match_timestamp: string | null
          last_youth_gen_at: string | null
          save_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          club_data: Json
          country?: string | null
          created_at?: string
          game_state?: Json | null
          id?: string
          last_match_timestamp?: string | null
          last_youth_gen_at?: string | null
          save_name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          club_data?: Json
          country?: string | null
          created_at?: string
          game_state?: Json | null
          id?: string
          last_match_timestamp?: string | null
          last_youth_gen_at?: string | null
          save_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      game_updates: {
        Row: {
          ai_summary: string | null
          author_id: string
          created_at: string
          description: string
          features: string[]
          fixes: string[]
          id: string
          published_at: string | null
          status: string
          title: string
          version: string
        }
        Insert: {
          ai_summary?: string | null
          author_id: string
          created_at?: string
          description?: string
          features?: string[]
          fixes?: string[]
          id?: string
          published_at?: string | null
          status?: string
          title: string
          version: string
        }
        Update: {
          ai_summary?: string | null
          author_id?: string
          created_at?: string
          description?: string
          features?: string[]
          fixes?: string[]
          id?: string
          published_at?: string | null
          status?: string
          title?: string
          version?: string
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
      global_chat_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "global_chat_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "global_chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      global_ranking: {
        Row: {
          club_name: string
          created_at: string
          current_competition: string
          draws: number
          games_played: number
          id: string
          last_change: number
          losses: number
          ranking_points: number
          updated_at: string
          user_id: string
          wins: number
        }
        Insert: {
          club_name?: string
          created_at?: string
          current_competition?: string
          draws?: number
          games_played?: number
          id?: string
          last_change?: number
          losses?: number
          ranking_points?: number
          updated_at?: string
          user_id: string
          wins?: number
        }
        Update: {
          club_name?: string
          created_at?: string
          current_competition?: string
          draws?: number
          games_played?: number
          id?: string
          last_change?: number
          losses?: number
          ranking_points?: number
          updated_at?: string
          user_id?: string
          wins?: number
        }
        Relationships: []
      }
      international_competition_clubs: {
        Row: {
          competition_id: string
          eliminated: boolean
          group_label: string | null
          group_position: number | null
          id: string
          team_id: string
        }
        Insert: {
          competition_id: string
          eliminated?: boolean
          group_label?: string | null
          group_position?: number | null
          id?: string
          team_id: string
        }
        Update: {
          competition_id?: string
          eliminated?: boolean
          group_label?: string | null
          group_position?: number | null
          id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "international_competition_clubs_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "international_competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "international_competition_clubs_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "world_league_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      international_competitions: {
        Row: {
          champion_team_id: string | null
          competition_name: string
          continent: string
          created_at: string
          current_round: number
          emoji: string | null
          id: string
          season: number
          status: Database["public"]["Enums"]["world_competition_status"]
          unlocks_in_season: number
          updated_at: string
        }
        Insert: {
          champion_team_id?: string | null
          competition_name: string
          continent: string
          created_at?: string
          current_round?: number
          emoji?: string | null
          id?: string
          season?: number
          status?: Database["public"]["Enums"]["world_competition_status"]
          unlocks_in_season?: number
          updated_at?: string
        }
        Update: {
          champion_team_id?: string | null
          competition_name?: string
          continent?: string
          created_at?: string
          current_round?: number
          emoji?: string | null
          id?: string
          season?: number
          status?: Database["public"]["Enums"]["world_competition_status"]
          unlocks_in_season?: number
          updated_at?: string
        }
        Relationships: []
      }
      international_matches: {
        Row: {
          away_goals: number | null
          away_team_id: string
          bracket_pos: number | null
          competition_id: string
          created_at: string
          home_goals: number | null
          home_team_id: string
          id: string
          kickoff_at: string
          match_data: Json | null
          phase_name: string | null
          played_at: string | null
          round: number
          stage: string | null
          status: Database["public"]["Enums"]["world_match_status"]
        }
        Insert: {
          away_goals?: number | null
          away_team_id: string
          bracket_pos?: number | null
          competition_id: string
          created_at?: string
          home_goals?: number | null
          home_team_id: string
          id?: string
          kickoff_at: string
          match_data?: Json | null
          phase_name?: string | null
          played_at?: string | null
          round: number
          stage?: string | null
          status?: Database["public"]["Enums"]["world_match_status"]
        }
        Update: {
          away_goals?: number | null
          away_team_id?: string
          bracket_pos?: number | null
          competition_id?: string
          created_at?: string
          home_goals?: number | null
          home_team_id?: string
          id?: string
          kickoff_at?: string
          match_data?: Json | null
          phase_name?: string | null
          played_at?: string | null
          round?: number
          stage?: string | null
          status?: Database["public"]["Enums"]["world_match_status"]
        }
        Relationships: [
          {
            foreignKeyName: "international_matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "world_league_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "international_matches_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "international_competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "international_matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "world_league_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_updates: {
        Row: {
          approved: boolean
          approved_at: string | null
          benefits: string[] | null
          content: string
          created_at: string
          id: string
          title: string
          update_type: string
          user_id: string
        }
        Insert: {
          approved?: boolean
          approved_at?: string | null
          benefits?: string[] | null
          content: string
          created_at?: string
          id?: string
          title?: string
          update_type?: string
          user_id: string
        }
        Update: {
          approved?: boolean
          approved_at?: string | null
          benefits?: string[] | null
          content?: string
          created_at?: string
          id?: string
          title?: string
          update_type?: string
          user_id?: string
        }
        Relationships: []
      }
      league_awards: {
        Row: {
          award_type: string
          created_at: string
          id: string
          league_id: string
          player_name: string | null
          season: number
          user_id: string
          value: number
        }
        Insert: {
          award_type: string
          created_at?: string
          id?: string
          league_id: string
          player_name?: string | null
          season?: number
          user_id: string
          value?: number
        }
        Update: {
          award_type?: string
          created_at?: string
          id?: string
          league_id?: string
          player_name?: string | null
          season?: number
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "league_awards_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "multiplayer_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      league_matches: {
        Row: {
          auto_sim_at: string | null
          away_goals: number | null
          away_joined: boolean
          away_team_id: string | null
          away_user_id: string
          created_at: string
          game_state: Json | null
          home_goals: number | null
          home_joined: boolean
          home_team_id: string | null
          home_user_id: string
          id: string
          league_id: string
          lobby_opened_at: string | null
          match_data: Json | null
          played_at: string | null
          round: number
          scheduled_at: string | null
          status: string
        }
        Insert: {
          auto_sim_at?: string | null
          away_goals?: number | null
          away_joined?: boolean
          away_team_id?: string | null
          away_user_id: string
          created_at?: string
          game_state?: Json | null
          home_goals?: number | null
          home_joined?: boolean
          home_team_id?: string | null
          home_user_id: string
          id?: string
          league_id: string
          lobby_opened_at?: string | null
          match_data?: Json | null
          played_at?: string | null
          round?: number
          scheduled_at?: string | null
          status?: string
        }
        Update: {
          auto_sim_at?: string | null
          away_goals?: number | null
          away_joined?: boolean
          away_team_id?: string | null
          away_user_id?: string
          created_at?: string
          game_state?: Json | null
          home_goals?: number | null
          home_joined?: boolean
          home_team_id?: string | null
          home_user_id?: string
          id?: string
          league_id?: string
          lobby_opened_at?: string | null
          match_data?: Json | null
          played_at?: string | null
          round?: number
          scheduled_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "world_league_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "world_league_teams"
            referencedColumns: ["id"]
          },
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
          bot_strength: number | null
          budget: number
          club_logo: string
          club_name: string
          country: string | null
          draws: number
          goals_against: number
          goals_for: number
          id: string
          is_bot: boolean
          joined_at: string
          league_id: string
          losses: number
          played: number
          points: number
          reputation: number
          user_id: string | null
          wins: number
        }
        Insert: {
          bot_strength?: number | null
          budget?: number
          club_logo?: string
          club_name?: string
          country?: string | null
          draws?: number
          goals_against?: number
          goals_for?: number
          id?: string
          is_bot?: boolean
          joined_at?: string
          league_id: string
          losses?: number
          played?: number
          points?: number
          reputation?: number
          user_id?: string | null
          wins?: number
        }
        Update: {
          bot_strength?: number | null
          budget?: number
          club_logo?: string
          club_name?: string
          country?: string | null
          draws?: number
          goals_against?: number
          goals_for?: number
          id?: string
          is_bot?: boolean
          joined_at?: string
          league_id?: string
          losses?: number
          played?: number
          points?: number
          reputation?: number
          user_id?: string | null
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
      league_player_stats: {
        Row: {
          assists: number | null
          clean_sheets: number | null
          created_at: string | null
          decisive_passes: number | null
          goals: number | null
          goals_conceded: number | null
          id: string
          league_id: string | null
          matches_played: number | null
          member_id: string | null
          minutes_played: number | null
          motm_count: number | null
          player_name: string
          red_cards: number | null
          team_name: string
          total_rating: number | null
          updated_at: string | null
          yellow_cards: number | null
        }
        Insert: {
          assists?: number | null
          clean_sheets?: number | null
          created_at?: string | null
          decisive_passes?: number | null
          goals?: number | null
          goals_conceded?: number | null
          id?: string
          league_id?: string | null
          matches_played?: number | null
          member_id?: string | null
          minutes_played?: number | null
          motm_count?: number | null
          player_name: string
          red_cards?: number | null
          team_name: string
          total_rating?: number | null
          updated_at?: string | null
          yellow_cards?: number | null
        }
        Update: {
          assists?: number | null
          clean_sheets?: number | null
          created_at?: string | null
          decisive_passes?: number | null
          goals?: number | null
          goals_conceded?: number | null
          id?: string
          league_id?: string | null
          matches_played?: number | null
          member_id?: string | null
          minutes_played?: number | null
          motm_count?: number | null
          player_name?: string
          red_cards?: number | null
          team_name?: string
          total_rating?: number | null
          updated_at?: string | null
          yellow_cards?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "league_player_stats_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "multiplayer_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_player_stats_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "league_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_player_stats_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "league_standings"
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
      league_waiting_list: {
        Row: {
          country: string
          division: number | null
          enrolled_at: string | null
          id: string
          league_type: string
          status: string
          user_id: string
        }
        Insert: {
          country: string
          division?: number | null
          enrolled_at?: string | null
          id?: string
          league_type?: string
          status?: string
          user_id: string
        }
        Update: {
          country?: string
          division?: number | null
          enrolled_at?: string | null
          id?: string
          league_type?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      live_match_substitutions: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_halftime: boolean
          live_match_id: string
          minute: number
          player_in_id: string
          player_in_name: string
          player_out_id: string
          player_out_name: string
          shared_match_id: string | null
          team_name: string | null
          team_side: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: string
          is_halftime?: boolean
          live_match_id: string
          minute?: number
          player_in_id: string
          player_in_name: string
          player_out_id: string
          player_out_name: string
          shared_match_id?: string | null
          team_name?: string | null
          team_side: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_halftime?: boolean
          live_match_id?: string
          minute?: number
          player_in_id?: string
          player_in_name?: string
          player_out_id?: string
          player_out_name?: string
          shared_match_id?: string | null
          team_name?: string | null
          team_side?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_match_substitutions_live_match_id_fkey"
            columns: ["live_match_id"]
            isOneToOne: false
            referencedRelation: "live_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      live_matches: {
        Row: {
          attendance: number | null
          away_goals: number
          away_strength: number
          away_team: string
          competition: string
          created_at: string
          current_minute: number
          duration_seconds: number
          events: Json
          finished_at: string | null
          game_state: Json | null
          home_goals: number
          home_players: Json
          home_strength: number
          home_team: string
          id: string
          is_home: boolean
          match_id: string
          player_ratings: Json
          roster_locked_at: string | null
          shared_match_id: string | null
          stadium_capacity: number
          stadium_name: string
          started_at: string
          stats: Json
          status: string
          tactics: Json
          ticket_revenue: number | null
          user_id: string
        }
        Insert: {
          attendance?: number | null
          away_goals?: number
          away_strength?: number
          away_team: string
          competition?: string
          created_at?: string
          current_minute?: number
          duration_seconds?: number
          events?: Json
          finished_at?: string | null
          game_state?: Json | null
          home_goals?: number
          home_players?: Json
          home_strength?: number
          home_team: string
          id?: string
          is_home?: boolean
          match_id: string
          player_ratings?: Json
          roster_locked_at?: string | null
          shared_match_id?: string | null
          stadium_capacity?: number
          stadium_name?: string
          started_at?: string
          stats?: Json
          status?: string
          tactics?: Json
          ticket_revenue?: number | null
          user_id: string
        }
        Update: {
          attendance?: number | null
          away_goals?: number
          away_strength?: number
          away_team?: string
          competition?: string
          created_at?: string
          current_minute?: number
          duration_seconds?: number
          events?: Json
          finished_at?: string | null
          game_state?: Json | null
          home_goals?: number
          home_players?: Json
          home_strength?: number
          home_team?: string
          id?: string
          is_home?: boolean
          match_id?: string
          player_ratings?: Json
          roster_locked_at?: string | null
          shared_match_id?: string | null
          stadium_capacity?: number
          stadium_name?: string
          started_at?: string
          stats?: Json
          status?: string
          tactics?: Json
          ticket_revenue?: number | null
          user_id?: string
        }
        Relationships: []
      }
      loan_listings: {
        Row: {
          accepted_at: string | null
          buyer_club_name: string | null
          buyer_id: string | null
          created_at: string
          id: string
          listed_at: string
          loan_fee: number
          open_to_offers: boolean
          player_age: number
          player_data: Json
          player_name: string
          player_overall: number
          player_position: string
          salary: number
          salary_payer: string
          salary_split_pct: number
          seller_club_name: string
          seller_id: string
          seller_shield: Json | null
          status: string
        }
        Insert: {
          accepted_at?: string | null
          buyer_club_name?: string | null
          buyer_id?: string | null
          created_at?: string
          id?: string
          listed_at?: string
          loan_fee?: number
          open_to_offers?: boolean
          player_age: number
          player_data: Json
          player_name: string
          player_overall: number
          player_position?: string
          salary?: number
          salary_payer?: string
          salary_split_pct?: number
          seller_club_name?: string
          seller_id: string
          seller_shield?: Json | null
          status?: string
        }
        Update: {
          accepted_at?: string | null
          buyer_club_name?: string | null
          buyer_id?: string | null
          created_at?: string
          id?: string
          listed_at?: string
          loan_fee?: number
          open_to_offers?: boolean
          player_age?: number
          player_data?: Json
          player_name?: string
          player_overall?: number
          player_position?: string
          salary?: number
          salary_payer?: string
          salary_split_pct?: number
          seller_club_name?: string
          seller_id?: string
          seller_shield?: Json | null
          status?: string
        }
        Relationships: []
      }
      loan_offers: {
        Row: {
          buyer_club_name: string
          buyer_id: string
          counter_loan_fee: number | null
          counter_message: string | null
          counter_salary_payer: string | null
          counter_salary_split_pct: number | null
          created_at: string
          expires_at: string
          id: string
          listing_id: string
          message: string | null
          offered_loan_fee: number
          offered_salary_payer: string
          offered_salary_split_pct: number
          resolved_at: string | null
          seller_id: string
          status: string
          updated_at: string
        }
        Insert: {
          buyer_club_name?: string
          buyer_id: string
          counter_loan_fee?: number | null
          counter_message?: string | null
          counter_salary_payer?: string | null
          counter_salary_split_pct?: number | null
          created_at?: string
          expires_at?: string
          id?: string
          listing_id: string
          message?: string | null
          offered_loan_fee?: number
          offered_salary_payer?: string
          offered_salary_split_pct?: number
          resolved_at?: string | null
          seller_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          buyer_club_name?: string
          buyer_id?: string
          counter_loan_fee?: number | null
          counter_message?: string | null
          counter_salary_payer?: string | null
          counter_salary_split_pct?: number | null
          created_at?: string
          expires_at?: string
          id?: string
          listing_id?: string
          message?: string | null
          offered_loan_fee?: number
          offered_salary_payer?: string
          offered_salary_split_pct?: number
          resolved_at?: string | null
          seller_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_offers_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "loan_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      match_history: {
        Row: {
          away_goals: number
          away_team: string
          competition: string
          created_at: string
          events: Json
          goal_scorers: Json
          home_goals: number
          home_players: Json
          home_team: string
          id: string
          is_home: boolean
          live_match_id: string | null
          man_of_the_match: string | null
          match_type: string
          played_at: string
          player_ratings: Json
          stadium_capacity: number
          stadium_name: string
          stats: Json
          user_id: string
        }
        Insert: {
          away_goals?: number
          away_team: string
          competition?: string
          created_at?: string
          events?: Json
          goal_scorers?: Json
          home_goals?: number
          home_players?: Json
          home_team: string
          id?: string
          is_home?: boolean
          live_match_id?: string | null
          man_of_the_match?: string | null
          match_type?: string
          played_at?: string
          player_ratings?: Json
          stadium_capacity?: number
          stadium_name?: string
          stats?: Json
          user_id: string
        }
        Update: {
          away_goals?: number
          away_team?: string
          competition?: string
          created_at?: string
          events?: Json
          goal_scorers?: Json
          home_goals?: number
          home_players?: Json
          home_team?: string
          id?: string
          is_home?: boolean
          live_match_id?: string | null
          man_of_the_match?: string | null
          match_type?: string
          played_at?: string
          player_ratings?: Json
          stadium_capacity?: number
          stadium_name?: string
          stats?: Json
          user_id?: string
        }
        Relationships: []
      }
      match_reports: {
        Row: {
          away_goals: number
          away_team: string
          competition: string
          created_at: string
          home_goals: number
          home_team: string
          id: string
          match_history_id: string | null
          ranking_impact: number
          report_data: Json
          result: string
          user_id: string
        }
        Insert: {
          away_goals?: number
          away_team: string
          competition?: string
          created_at?: string
          home_goals?: number
          home_team: string
          id?: string
          match_history_id?: string | null
          ranking_impact?: number
          report_data?: Json
          result?: string
          user_id: string
        }
        Update: {
          away_goals?: number
          away_team?: string
          competition?: string
          created_at?: string
          home_goals?: number
          home_team?: string
          id?: string
          match_history_id?: string | null
          ranking_impact?: number
          report_data?: Json
          result?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_reports_match_history_id_fkey"
            columns: ["match_history_id"]
            isOneToOne: false
            referencedRelation: "match_history"
            referencedColumns: ["id"]
          },
        ]
      }
      migration_logs: {
        Row: {
          changes: Json
          created_at: string
          duration_ms: number | null
          error_message: string | null
          from_version: string
          id: string
          status: string
          to_version: string
          user_id: string
        }
        Insert: {
          changes?: Json
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          from_version: string
          id?: string
          status: string
          to_version: string
          user_id: string
        }
        Update: {
          changes?: Json
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          from_version?: string
          id?: string
          status?: string
          to_version?: string
          user_id?: string
        }
        Relationships: []
      }
      mission_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          current_value: number
          id: string
          mission_id: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_value?: number
          id?: string
          mission_id: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_value?: number
          id?: string
          mission_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_progress_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "player_missions"
            referencedColumns: ["id"]
          },
        ]
      }
      multiplayer_leagues: {
        Row: {
          auto_created: boolean
          code: string
          country: string
          created_at: string
          current_round: number
          division: number | null
          division_level: number | null
          id: string
          league_type: string
          match_time: string | null
          max_members: number
          name: string
          owner_id: string
          round_interval_hours: number
          season: number
          season_end: string | null
          season_month: number | null
          season_start: string | null
          season_status: string
          season_year: number | null
          status: string
          tier: string | null
          tier_level: number | null
          total_rounds: number
        }
        Insert: {
          auto_created?: boolean
          code: string
          country?: string
          created_at?: string
          current_round?: number
          division?: number | null
          division_level?: number | null
          id?: string
          league_type?: string
          match_time?: string | null
          max_members?: number
          name: string
          owner_id: string
          round_interval_hours?: number
          season?: number
          season_end?: string | null
          season_month?: number | null
          season_start?: string | null
          season_status?: string
          season_year?: number | null
          status?: string
          tier?: string | null
          tier_level?: number | null
          total_rounds?: number
        }
        Update: {
          auto_created?: boolean
          code?: string
          country?: string
          created_at?: string
          current_round?: number
          division?: number | null
          division_level?: number | null
          id?: string
          league_type?: string
          match_time?: string | null
          max_members?: number
          name?: string
          owner_id?: string
          round_interval_hours?: number
          season?: number
          season_end?: string | null
          season_month?: number | null
          season_start?: string | null
          season_status?: string
          season_year?: number | null
          status?: string
          tier?: string | null
          tier_level?: number | null
          total_rounds?: number
        }
        Relationships: []
      }
      national_cup_matches: {
        Row: {
          aggregate_away_score: number | null
          aggregate_home_score: number | null
          away_penalties: number | null
          away_score: number | null
          away_team_id: string | null
          bracket_pos: number
          created_at: string | null
          cup_id: string
          home_penalties: number | null
          home_score: number | null
          home_team_id: string | null
          id: string
          is_second_leg: boolean | null
          match_data: Json | null
          phase_name: string | null
          round: number
          scheduled_at: string
          stadium: string | null
          status: string
          updated_at: string | null
          winner_team_id: string | null
        }
        Insert: {
          aggregate_away_score?: number | null
          aggregate_home_score?: number | null
          away_penalties?: number | null
          away_score?: number | null
          away_team_id?: string | null
          bracket_pos: number
          created_at?: string | null
          cup_id: string
          home_penalties?: number | null
          home_score?: number | null
          home_team_id?: string | null
          id?: string
          is_second_leg?: boolean | null
          match_data?: Json | null
          phase_name?: string | null
          round: number
          scheduled_at: string
          stadium?: string | null
          status?: string
          updated_at?: string | null
          winner_team_id?: string | null
        }
        Update: {
          aggregate_away_score?: number | null
          aggregate_home_score?: number | null
          away_penalties?: number | null
          away_score?: number | null
          away_team_id?: string | null
          bracket_pos?: number
          created_at?: string | null
          cup_id?: string
          home_penalties?: number | null
          home_score?: number | null
          home_team_id?: string | null
          id?: string
          is_second_leg?: boolean | null
          match_data?: Json | null
          phase_name?: string | null
          round?: number
          scheduled_at?: string
          stadium?: string | null
          status?: string
          updated_at?: string | null
          winner_team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "national_cup_matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "national_cup_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "national_cup_matches_cup_id_fkey"
            columns: ["cup_id"]
            isOneToOne: false
            referencedRelation: "national_cups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "national_cup_matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "national_cup_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "national_cup_matches_winner_team_id_fkey"
            columns: ["winner_team_id"]
            isOneToOne: false
            referencedRelation: "national_cup_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      national_cup_prizes: {
        Row: {
          amount: number
          created_at: string | null
          cup_id: string
          description: string | null
          id: string
          status: string | null
          team_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          cup_id: string
          description?: string | null
          id?: string
          status?: string | null
          team_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          cup_id?: string
          description?: string | null
          id?: string
          status?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "national_cup_prizes_cup_id_fkey"
            columns: ["cup_id"]
            isOneToOne: false
            referencedRelation: "national_cups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "national_cup_prizes_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "national_cup_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      national_cup_teams: {
        Row: {
          club_id: string
          club_logo: string | null
          club_name: string
          created_at: string | null
          cup_id: string
          detail_color: string | null
          division_level: number | null
          eliminated: boolean | null
          id: string
          is_bot: boolean | null
          league_id: string | null
          primary_color: string | null
          prize_money_earned: number | null
          secondary_color: string | null
          seed: number | null
          shield_config: Json | null
          shield_icon: string | null
          shield_pattern: string | null
          shield_shape: string | null
          strength: number | null
          user_id: string | null
        }
        Insert: {
          club_id: string
          club_logo?: string | null
          club_name: string
          created_at?: string | null
          cup_id: string
          detail_color?: string | null
          division_level?: number | null
          eliminated?: boolean | null
          id?: string
          is_bot?: boolean | null
          league_id?: string | null
          primary_color?: string | null
          prize_money_earned?: number | null
          secondary_color?: string | null
          seed?: number | null
          shield_config?: Json | null
          shield_icon?: string | null
          shield_pattern?: string | null
          shield_shape?: string | null
          strength?: number | null
          user_id?: string | null
        }
        Update: {
          club_id?: string
          club_logo?: string | null
          club_name?: string
          created_at?: string | null
          cup_id?: string
          detail_color?: string | null
          division_level?: number | null
          eliminated?: boolean | null
          id?: string
          is_bot?: boolean | null
          league_id?: string | null
          primary_color?: string | null
          prize_money_earned?: number | null
          secondary_color?: string | null
          seed?: number | null
          shield_config?: Json | null
          shield_icon?: string | null
          shield_pattern?: string | null
          shield_shape?: string | null
          strength?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "national_cup_teams_cup_id_fkey"
            columns: ["cup_id"]
            isOneToOne: false
            referencedRelation: "national_cups"
            referencedColumns: ["id"]
          },
        ]
      }
      national_cups: {
        Row: {
          country_code: string
          created_at: string | null
          current_round: number
          id: string
          kickoff_time: string | null
          name: string
          prize_pool: Json | null
          prizes_paid_current_round: number | null
          season: number
          season_start_date: string | null
          status: string
          total_rounds: number
          total_teams: number | null
          updated_at: string | null
          winner_team_id: string | null
        }
        Insert: {
          country_code: string
          created_at?: string | null
          current_round?: number
          id?: string
          kickoff_time?: string | null
          name: string
          prize_pool?: Json | null
          prizes_paid_current_round?: number | null
          season?: number
          season_start_date?: string | null
          status?: string
          total_rounds?: number
          total_teams?: number | null
          updated_at?: string | null
          winner_team_id?: string | null
        }
        Update: {
          country_code?: string
          created_at?: string | null
          current_round?: number
          id?: string
          kickoff_time?: string | null
          name?: string
          prize_pool?: Json | null
          prizes_paid_current_round?: number | null
          season?: number
          season_start_date?: string | null
          status?: string
          total_rounds?: number
          total_teams?: number | null
          updated_at?: string | null
          winner_team_id?: string | null
        }
        Relationships: []
      }
      newspaper_entries: {
        Row: {
          category: string
          created_at: string
          id: string
          image_key: string | null
          image_url: string | null
          importance: number | null
          is_event: boolean
          metadata: Json | null
          narration: string | null
          template_key: string | null
          text: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          image_key?: string | null
          image_url?: string | null
          importance?: number | null
          is_event?: boolean
          metadata?: Json | null
          narration?: string | null
          template_key?: string | null
          text: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          image_key?: string | null
          image_url?: string | null
          importance?: number | null
          is_event?: boolean
          metadata?: Json | null
          narration?: string | null
          template_key?: string | null
          text?: string
          user_id?: string
        }
        Relationships: []
      }
      newspaper_reactions: {
        Row: {
          created_at: string
          emoji: string
          entry_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          entry_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          entry_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "newspaper_reactions_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "newspaper_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_read_state: {
        Row: {
          id: string
          notification_key: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          notification_key: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          notification_key?: string
          read_at?: string
          user_id?: string
        }
        Relationships: []
      }
      open_friendly_slots: {
        Row: {
          club_name: string
          created_at: string
          id: string
          stadium_capacity: number
          stadium_name: string
          status: string
          user_id: string
        }
        Insert: {
          club_name?: string
          created_at?: string
          id?: string
          stadium_capacity?: number
          stadium_name?: string
          status?: string
          user_id: string
        }
        Update: {
          club_name?: string
          created_at?: string
          id?: string
          stadium_capacity?: number
          stadium_name?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_orders: {
        Row: {
          amount_cents: number
          created_at: string | null
          delivered: boolean | null
          external_reference: string | null
          id: string
          item_id: string
          metadata: Json | null
          payment_id: string | null
          payment_method: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string | null
          delivered?: boolean | null
          external_reference?: string | null
          id?: string
          item_id: string
          metadata?: Json | null
          payment_id?: string | null
          payment_method?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string | null
          delivered?: boolean | null
          external_reference?: string | null
          id?: string
          item_id?: string
          metadata?: Json | null
          payment_id?: string | null
          payment_method?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_payment_orders_item_id"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_orders_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_webhooks_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          payload: Json | null
          processed: boolean | null
          resource_id: string | null
          topic: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          payload?: Json | null
          processed?: boolean | null
          resource_id?: string | null
          topic?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          payload?: Json | null
          processed?: boolean | null
          resource_id?: string | null
          topic?: string | null
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
          is_system: boolean
          min_price: number
          player_age: number
          player_data: Json
          player_id: string | null
          player_name: string
          player_overall: number
          rarity: string | null
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
          is_system?: boolean
          min_price: number
          player_age: number
          player_data: Json
          player_id?: string | null
          player_name: string
          player_overall: number
          rarity?: string | null
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
          is_system?: boolean
          min_price?: number
          player_age?: number
          player_data?: Json
          player_id?: string | null
          player_name?: string
          player_overall?: number
          rarity?: string | null
          seller_club_name?: string
          seller_id?: string
          status?: string
        }
        Relationships: []
      }
      player_development_points: {
        Row: {
          accumulated_points: number
          attribute: string
          created_at: string
          id: string
          player_id: string
          threshold: number
          updated_at: string
          user_id: string
        }
        Insert: {
          accumulated_points?: number
          attribute: string
          created_at?: string
          id?: string
          player_id: string
          threshold?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          accumulated_points?: number
          attribute?: string
          created_at?: string
          id?: string
          player_id?: string
          threshold?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      player_missions: {
        Row: {
          category: string
          created_at: string
          description: string
          icon: string
          id: string
          reward_amount: number
          target_value: number
          title: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          reward_amount?: number
          target_value?: number
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          reward_amount?: number
          target_value?: number
          title?: string
        }
        Relationships: []
      }
      player_negotiations: {
        Row: {
          club_id: string
          created_at: string | null
          id: string
          offered_duration: number
          offered_salary: number
          player_id: string
          player_name: string
          response_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          club_id: string
          created_at?: string | null
          id?: string
          offered_duration: number
          offered_salary: number
          player_id: string
          player_name: string
          response_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          club_id?: string
          created_at?: string | null
          id?: string
          offered_duration?: number
          offered_salary?: number
          player_id?: string
          player_name?: string
          response_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_negotiations_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      premium_sponsorships: {
        Row: {
          activated_at: string
          active: boolean
          completed_at: string | null
          created_at: string
          daily_value: number
          id: string
          last_payout_at: string | null
          payout_days: number
          plan_id: string
          plan_name: string
          received_value: number
          total_value: number
          updated_at: string
          user_id: string
        }
        Insert: {
          activated_at?: string
          active?: boolean
          completed_at?: string | null
          created_at?: string
          daily_value: number
          id?: string
          last_payout_at?: string | null
          payout_days: number
          plan_id: string
          plan_name: string
          received_value?: number
          total_value: number
          updated_at?: string
          user_id: string
        }
        Update: {
          activated_at?: string
          active?: boolean
          completed_at?: string | null
          created_at?: string
          daily_value?: number
          id?: string
          last_payout_at?: string | null
          payout_days?: number
          plan_id?: string
          plan_name?: string
          received_value?: number
          total_value?: number
          updated_at?: string
          user_id?: string
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
      prize_configurations: {
        Row: {
          amount: number
          competition_id: string | null
          competition_type: string
          created_at: string | null
          id: string
          rank_or_phase: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          competition_id?: string | null
          competition_type: string
          created_at?: string | null
          id?: string
          rank_or_phase: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          competition_id?: string | null
          competition_type?: string
          created_at?: string | null
          id?: string
          rank_or_phase?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          last_daily_shop_bonus_at: string | null
          last_training_processed_at: string | null
          tutorial_completed: boolean
          user_id: string
          viewed_awards_season: number | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          last_daily_shop_bonus_at?: string | null
          last_training_processed_at?: string | null
          tutorial_completed?: boolean
          user_id: string
          viewed_awards_season?: number | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          last_daily_shop_bonus_at?: string | null
          last_training_processed_at?: string | null
          tutorial_completed?: boolean
          user_id?: string
          viewed_awards_season?: number | null
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
      scout_missions: {
        Row: {
          created_at: string | null
          ends_at: string
          id: string
          reward_multiplier: number
          risk: number
          scout_id: string
          starts_at: string | null
          status: Database["public"]["Enums"]["mission_status"]
          target_position: string | null
          type: Database["public"]["Enums"]["mission_type"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          ends_at: string
          id?: string
          reward_multiplier?: number
          risk?: number
          scout_id: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["mission_status"]
          target_position?: string | null
          type: Database["public"]["Enums"]["mission_type"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          ends_at?: string
          id?: string
          reward_multiplier?: number
          risk?: number
          scout_id?: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["mission_status"]
          target_position?: string | null
          type?: Database["public"]["Enums"]["mission_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scout_missions_scout_id_fkey"
            columns: ["scout_id"]
            isOneToOne: false
            referencedRelation: "scouts"
            referencedColumns: ["id"]
          },
        ]
      }
      scout_reports: {
        Row: {
          accuracy: number
          created_at: string | null
          id: string
          mission_id: string
          player_data: Json
          status: string
          user_id: string
        }
        Insert: {
          accuracy: number
          created_at?: string | null
          id?: string
          mission_id: string
          player_data: Json
          status?: string
          user_id: string
        }
        Update: {
          accuracy?: number
          created_at?: string | null
          id?: string
          mission_id?: string
          player_data?: Json
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scout_reports_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "scout_missions"
            referencedColumns: ["id"]
          },
        ]
      }
      scouts: {
        Row: {
          avatar_url: string | null
          country: string
          created_at: string | null
          efficiency: number
          id: string
          is_busy: boolean
          is_free_agent: boolean | null
          last_mission_completed_at: string | null
          level: Database["public"]["Enums"]["scout_level"]
          market_available_at: string | null
          name: string
          seasons_remaining: number | null
          specialization: Database["public"]["Enums"]["scout_specialization"]
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          country: string
          created_at?: string | null
          efficiency?: number
          id?: string
          is_busy?: boolean
          is_free_agent?: boolean | null
          last_mission_completed_at?: string | null
          level?: Database["public"]["Enums"]["scout_level"]
          market_available_at?: string | null
          name: string
          seasons_remaining?: number | null
          specialization?: Database["public"]["Enums"]["scout_specialization"]
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          country?: string
          created_at?: string | null
          efficiency?: number
          id?: string
          is_busy?: boolean
          is_free_agent?: boolean | null
          last_mission_completed_at?: string | null
          level?: Database["public"]["Enums"]["scout_level"]
          market_available_at?: string | null
          name?: string
          seasons_remaining?: number | null
          specialization?: Database["public"]["Enums"]["scout_specialization"]
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      season_awards: {
        Row: {
          ai_image_url: string | null
          ai_narrative: string | null
          award_type: string
          club_logo: string | null
          club_name: string | null
          created_at: string | null
          id: string
          player_name: string | null
          player_overall: number | null
          player_position: string | null
          scope: string
          scope_id: string | null
          score: number | null
          season: number
          stats: Json | null
          team_of_season: Json | null
          user_id: string | null
        }
        Insert: {
          ai_image_url?: string | null
          ai_narrative?: string | null
          award_type: string
          club_logo?: string | null
          club_name?: string | null
          created_at?: string | null
          id?: string
          player_name?: string | null
          player_overall?: number | null
          player_position?: string | null
          scope: string
          scope_id?: string | null
          score?: number | null
          season: number
          stats?: Json | null
          team_of_season?: Json | null
          user_id?: string | null
        }
        Update: {
          ai_image_url?: string | null
          ai_narrative?: string | null
          award_type?: string
          club_logo?: string | null
          club_name?: string | null
          created_at?: string | null
          id?: string
          player_name?: string | null
          player_overall?: number | null
          player_position?: string | null
          scope?: string
          scope_id?: string | null
          score?: number | null
          season?: number
          stats?: Json | null
          team_of_season?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      season_calendar: {
        Row: {
          country: string
          created_at: string | null
          cup_id: string | null
          day: number
          id: string
          league_id: string | null
          match_time: string | null
          match_type: string | null
          round: number | null
          season_month: number
          season_year: number
          status: string | null
        }
        Insert: {
          country: string
          created_at?: string | null
          cup_id?: string | null
          day: number
          id?: string
          league_id?: string | null
          match_time?: string | null
          match_type?: string | null
          round?: number | null
          season_month: number
          season_year: number
          status?: string | null
        }
        Update: {
          country?: string
          created_at?: string | null
          cup_id?: string | null
          day?: number
          id?: string
          league_id?: string | null
          match_time?: string | null
          match_type?: string | null
          round?: number | null
          season_month?: number
          season_year?: number
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "season_calendar_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "multiplayer_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      security_rate_limits: {
        Row: {
          action_type: string
          attempt_count: number | null
          id: string
          last_attempt: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          attempt_count?: number | null
          id?: string
          last_attempt?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          attempt_count?: number | null
          id?: string
          last_attempt?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      shop_inventory: {
        Row: {
          created_at: string | null
          id: string
          item_id: string
          metadata: Json | null
          quantity: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_id: string
          metadata?: Json | null
          quantity?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          item_id?: string
          metadata?: Json | null
          quantity?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_inventory_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_items: {
        Row: {
          active: boolean | null
          bonus_data: Json | null
          category: string
          created_at: string | null
          description: string | null
          duration_days: number | null
          id: string
          image_url: string | null
          min_fans: number | null
          name: string
          price_cents: number
          rarity: string | null
        }
        Insert: {
          active?: boolean | null
          bonus_data?: Json | null
          category: string
          created_at?: string | null
          description?: string | null
          duration_days?: number | null
          id: string
          image_url?: string | null
          min_fans?: number | null
          name: string
          price_cents: number
          rarity?: string | null
        }
        Update: {
          active?: boolean | null
          bonus_data?: Json | null
          category?: string
          created_at?: string | null
          description?: string | null
          duration_days?: number | null
          id?: string
          image_url?: string | null
          min_fans?: number | null
          name?: string
          price_cents?: number
          rarity?: string | null
        }
        Relationships: []
      }
      shop_products: {
        Row: {
          active: boolean | null
          bonus_data: Json | null
          category: string
          created_at: string
          description: string | null
          duration_days: number | null
          id: string
          min_fans_required: number | null
          name: string
          price_cents: number
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          bonus_data?: Json | null
          category: string
          created_at?: string
          description?: string | null
          duration_days?: number | null
          id: string
          min_fans_required?: number | null
          name: string
          price_cents?: number
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          bonus_data?: Json | null
          category?: string
          created_at?: string
          description?: string | null
          duration_days?: number | null
          id?: string
          min_fans_required?: number | null
          name?: string
          price_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      shop_purchases: {
        Row: {
          activated_at: string
          created_at: string
          expires_at: string | null
          id: string
          last_bonus_claim_at: string | null
          product_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activated_at?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          last_bonus_claim_at?: string | null
          product_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activated_at?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          last_bonus_claim_at?: string | null
          product_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_purchases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          admin_response: string | null
          category: string
          created_at: string
          id: string
          message: string
          responded_at: string | null
          responded_by: string | null
          status: string
          subject: string
          updated_at: string
          user_email: string | null
          user_id: string
          user_name: string
        }
        Insert: {
          admin_response?: string | null
          category?: string
          created_at?: string
          id?: string
          message: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_email?: string | null
          user_id: string
          user_name: string
        }
        Update: {
          admin_response?: string | null
          category?: string
          created_at?: string
          id?: string
          message?: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_email?: string | null
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      suspicious_activity: {
        Row: {
          activity_type: string
          created_at: string
          description: string
          details: Json
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          severity: string
          status: string
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          description: string
          details?: Json
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          severity?: string
          status?: string
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string
          details?: Json
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          severity?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      tournament_prizes_history: {
        Row: {
          amount: number
          club_id: string | null
          competition_id: string | null
          competition_name: string | null
          competition_type: string
          created_at: string | null
          id: string
          phase_or_rank: string | null
          season_month: number | null
          season_year: number | null
        }
        Insert: {
          amount: number
          club_id?: string | null
          competition_id?: string | null
          competition_name?: string | null
          competition_type: string
          created_at?: string | null
          id?: string
          phase_or_rank?: string | null
          season_month?: number | null
          season_year?: number | null
        }
        Update: {
          amount?: number
          club_id?: string | null
          competition_id?: string | null
          competition_name?: string | null
          competition_type?: string
          created_at?: string | null
          id?: string
          phase_or_rank?: string | null
          season_month?: number | null
          season_year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_prizes_history_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
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
      transfer_listings: {
        Row: {
          asking_price: number
          buyer_club_name: string | null
          buyer_id: string | null
          cooldown_until: string | null
          created_at: string
          id: string
          league_id: string | null
          listed_at: string
          player_age: number
          player_data: Json
          player_name: string
          player_overall: number
          player_position: string
          seller_club_name: string
          seller_id: string
          seller_shield: Json | null
          sold_at: string | null
          status: string
          transfer_count: number
        }
        Insert: {
          asking_price: number
          buyer_club_name?: string | null
          buyer_id?: string | null
          cooldown_until?: string | null
          created_at?: string
          id?: string
          league_id?: string | null
          listed_at?: string
          player_age: number
          player_data: Json
          player_name: string
          player_overall: number
          player_position?: string
          seller_club_name?: string
          seller_id: string
          seller_shield?: Json | null
          sold_at?: string | null
          status?: string
          transfer_count?: number
        }
        Update: {
          asking_price?: number
          buyer_club_name?: string | null
          buyer_id?: string | null
          cooldown_until?: string | null
          created_at?: string
          id?: string
          league_id?: string | null
          listed_at?: string
          player_age?: number
          player_data?: Json
          player_name?: string
          player_overall?: number
          player_position?: string
          seller_club_name?: string
          seller_id?: string
          seller_shield?: Json | null
          sold_at?: string | null
          status?: string
          transfer_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "transfer_listings_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "multiplayer_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      transfer_log: {
        Row: {
          created_at: string
          from_club_name: string
          from_user_id: string
          id: string
          player_name: string
          player_overall: number
          price: number
          salary: number
          to_club_name: string
          to_user_id: string
          transfer_type: string
        }
        Insert: {
          created_at?: string
          from_club_name?: string
          from_user_id: string
          id?: string
          player_name: string
          player_overall: number
          price: number
          salary?: number
          to_club_name?: string
          to_user_id: string
          transfer_type?: string
        }
        Update: {
          created_at?: string
          from_club_name?: string
          from_user_id?: string
          id?: string
          player_name?: string
          player_overall?: number
          price?: number
          salary?: number
          to_club_name?: string
          to_user_id?: string
          transfer_type?: string
        }
        Relationships: []
      }
      transfer_offers: {
        Row: {
          bonus_assists: number
          bonus_games: number
          bonus_goals: number
          bonus_titles: number
          buyer_club_name: string
          buyer_id: string
          created_at: string
          decision_deadline: string | null
          decision_status: string | null
          id: string
          listing_id: string
          offered_contract_years: number
          offered_price: number
          offered_salary: number
          rejection_reason: string | null
          responded_at: string | null
          signing_bonus: number
          status: string
        }
        Insert: {
          bonus_assists?: number
          bonus_games?: number
          bonus_goals?: number
          bonus_titles?: number
          buyer_club_name?: string
          buyer_id: string
          created_at?: string
          decision_deadline?: string | null
          decision_status?: string | null
          id?: string
          listing_id: string
          offered_contract_years?: number
          offered_price: number
          offered_salary?: number
          rejection_reason?: string | null
          responded_at?: string | null
          signing_bonus?: number
          status?: string
        }
        Update: {
          bonus_assists?: number
          bonus_games?: number
          bonus_goals?: number
          bonus_titles?: number
          buyer_club_name?: string
          buyer_id?: string
          created_at?: string
          decision_deadline?: string | null
          decision_status?: string | null
          id?: string
          listing_id?: string
          offered_contract_years?: number
          offered_price?: number
          offered_salary?: number
          rejection_reason?: string | null
          responded_at?: string | null
          signing_bonus?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfer_offers_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "transfer_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notifications: {
        Row: {
          category: string | null
          created_at: string
          data: Json | null
          icon: string
          id: string
          link: string | null
          message: string
          priority: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          data?: Json | null
          icon?: string
          id?: string
          link?: string | null
          message: string
          priority?: string | null
          read_at?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          data?: Json | null
          icon?: string
          id?: string
          link?: string | null
          message?: string
          priority?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_presence: {
        Row: {
          is_online: boolean
          last_seen: string
          user_id: string
        }
        Insert: {
          is_online?: boolean
          last_seen?: string
          user_id: string
        }
        Update: {
          is_online?: boolean
          last_seen?: string
          user_id?: string
        }
        Relationships: []
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
      user_versions: {
        Row: {
          created_at: string
          data_version: string
          failed_attempts: number
          game_version: string
          id: string
          last_backup: Json | null
          last_backup_at: string | null
          last_migration_at: string | null
          migration_status: string
          observation_until: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_version?: string
          failed_attempts?: number
          game_version?: string
          id?: string
          last_backup?: Json | null
          last_backup_at?: string | null
          last_migration_at?: string | null
          migration_status?: string
          observation_until?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_version?: string
          failed_attempts?: number
          game_version?: string
          id?: string
          last_backup?: Json | null
          last_backup_at?: string | null
          last_migration_at?: string | null
          migration_status?: string
          observation_until?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      world_countries: {
        Row: {
          flag_emoji: string | null
          id: string
          iso_code: string | null
          name: string
        }
        Insert: {
          flag_emoji?: string | null
          id?: string
          iso_code?: string | null
          name: string
        }
        Update: {
          flag_emoji?: string | null
          id?: string
          iso_code?: string | null
          name?: string
        }
        Relationships: []
      }
      world_divisions: {
        Row: {
          created_at: string | null
          id: string
          league_id: string | null
          level: number
          match_time: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          league_id?: string | null
          level: number
          match_time: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          league_id?: string | null
          level?: number
          match_time?: string
          name?: string
        }
        Relationships: []
      }
      world_league_news: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          id: string
          image_url: string | null
          importance: number | null
          league_id: string | null
          match_id: string | null
          metadata: Json | null
          template_key: string | null
          title: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          importance?: number | null
          league_id?: string | null
          match_id?: string | null
          metadata?: Json | null
          template_key?: string | null
          title: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          importance?: number | null
          league_id?: string | null
          match_id?: string | null
          metadata?: Json | null
          template_key?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "world_league_news_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "world_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "world_league_news_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "world_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      world_league_table: {
        Row: {
          country: string | null
          draws: number | null
          goals_against: number | null
          goals_for: number | null
          id: string
          last_5_games: string | null
          league_id: string | null
          losses: number | null
          played: number | null
          points: number | null
          season_month: number
          season_year: number
          sequence: string | null
          team_id: string | null
          updated_at: string | null
          win_rate: number | null
          wins: number | null
        }
        Insert: {
          country?: string | null
          draws?: number | null
          goals_against?: number | null
          goals_for?: number | null
          id?: string
          last_5_games?: string | null
          league_id?: string | null
          losses?: number | null
          played?: number | null
          points?: number | null
          season_month: number
          season_year: number
          sequence?: string | null
          team_id?: string | null
          updated_at?: string | null
          win_rate?: number | null
          wins?: number | null
        }
        Update: {
          country?: string | null
          draws?: number | null
          goals_against?: number | null
          goals_for?: number | null
          id?: string
          last_5_games?: string | null
          league_id?: string | null
          losses?: number | null
          played?: number | null
          points?: number | null
          season_month?: number
          season_year?: number
          sequence?: string | null
          team_id?: string | null
          updated_at?: string | null
          win_rate?: number | null
          wins?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "world_league_table_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "world_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "world_league_table_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "world_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      world_league_teams: {
        Row: {
          bot_strength: number | null
          club_logo: string | null
          club_name: string
          created_at: string
          draws: number
          goals_against: number
          goals_for: number
          id: string
          is_bot: boolean
          league_id: string
          losses: number
          played: number
          points: number
          shield: Json | null
          updated_at: string
          user_id: string | null
          wins: number
        }
        Insert: {
          bot_strength?: number | null
          club_logo?: string | null
          club_name: string
          created_at?: string
          draws?: number
          goals_against?: number
          goals_for?: number
          id?: string
          is_bot?: boolean
          league_id: string
          losses?: number
          played?: number
          points?: number
          shield?: Json | null
          updated_at?: string
          user_id?: string | null
          wins?: number
        }
        Update: {
          bot_strength?: number | null
          club_logo?: string | null
          club_name?: string
          created_at?: string
          draws?: number
          goals_against?: number
          goals_for?: number
          id?: string
          is_bot?: boolean
          league_id?: string
          losses?: number
          played?: number
          points?: number
          shield?: Json | null
          updated_at?: string
          user_id?: string | null
          wins?: number
        }
        Relationships: []
      }
      world_leagues: {
        Row: {
          active: boolean | null
          country: string | null
          country_id: string | null
          created_at: string | null
          current_round: number | null
          division: number | null
          division_level: number | null
          id: string
          max_teams: number | null
          name: string
          prizes_paid: boolean | null
          season_month: number | null
          season_year: number | null
        }
        Insert: {
          active?: boolean | null
          country?: string | null
          country_id?: string | null
          created_at?: string | null
          current_round?: number | null
          division?: number | null
          division_level?: number | null
          id?: string
          max_teams?: number | null
          name: string
          prizes_paid?: boolean | null
          season_month?: number | null
          season_year?: number | null
        }
        Update: {
          active?: boolean | null
          country?: string | null
          country_id?: string | null
          created_at?: string | null
          current_round?: number | null
          division?: number | null
          division_level?: number | null
          id?: string
          max_teams?: number | null
          name?: string
          prizes_paid?: boolean | null
          season_month?: number | null
          season_year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "world_leagues_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "world_countries"
            referencedColumns: ["id"]
          },
        ]
      }
      world_matches: {
        Row: {
          away_goals: number | null
          away_team_id: string | null
          created_at: string | null
          game_state: Json | null
          home_goals: number | null
          home_team_id: string | null
          id: string
          league_id: string | null
          match_data: Json | null
          played_at: string | null
          round: number
          scheduled_at: string
          season_month: number
          season_year: number
          stadium: string | null
          status: string | null
        }
        Insert: {
          away_goals?: number | null
          away_team_id?: string | null
          created_at?: string | null
          game_state?: Json | null
          home_goals?: number | null
          home_team_id?: string | null
          id?: string
          league_id?: string | null
          match_data?: Json | null
          played_at?: string | null
          round: number
          scheduled_at: string
          season_month: number
          season_year: number
          stadium?: string | null
          status?: string | null
        }
        Update: {
          away_goals?: number | null
          away_team_id?: string | null
          created_at?: string | null
          game_state?: Json | null
          home_goals?: number | null
          home_team_id?: string | null
          id?: string
          league_id?: string | null
          match_data?: Json | null
          played_at?: string | null
          round?: number
          scheduled_at?: string
          season_month?: number
          season_year?: number
          stadium?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "world_matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "world_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "world_matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "world_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "world_matches_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "world_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      world_player_stats: {
        Row: {
          assists: number | null
          avg_rating: number | null
          best_rating: number | null
          clean_sheets: number | null
          created_at: string | null
          decisive_passes: number | null
          goals: number | null
          goals_conceded: number | null
          id: string
          league_id: string
          matches_played: number | null
          minutes_played: number | null
          mvp_count: number | null
          player_id: string
          red_cards: number | null
          season_month: number
          season_year: number
          team_id: string
          updated_at: string | null
          yellow_cards: number | null
        }
        Insert: {
          assists?: number | null
          avg_rating?: number | null
          best_rating?: number | null
          clean_sheets?: number | null
          created_at?: string | null
          decisive_passes?: number | null
          goals?: number | null
          goals_conceded?: number | null
          id?: string
          league_id: string
          matches_played?: number | null
          minutes_played?: number | null
          mvp_count?: number | null
          player_id: string
          red_cards?: number | null
          season_month: number
          season_year: number
          team_id: string
          updated_at?: string | null
          yellow_cards?: number | null
        }
        Update: {
          assists?: number | null
          avg_rating?: number | null
          best_rating?: number | null
          clean_sheets?: number | null
          created_at?: string | null
          decisive_passes?: number | null
          goals?: number | null
          goals_conceded?: number | null
          id?: string
          league_id?: string
          matches_played?: number | null
          minutes_played?: number | null
          mvp_count?: number | null
          player_id?: string
          red_cards?: number | null
          season_month?: number
          season_year?: number
          team_id?: string
          updated_at?: string | null
          yellow_cards?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "world_player_stats_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "world_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "world_player_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "world_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      world_players: {
        Row: {
          age: number | null
          created_at: string | null
          id: string
          name: string
          overall: number | null
          position: string
          team_id: string
        }
        Insert: {
          age?: number | null
          created_at?: string | null
          id?: string
          name: string
          overall?: number | null
          position: string
          team_id: string
        }
        Update: {
          age?: number | null
          created_at?: string | null
          id?: string
          name?: string
          overall?: number | null
          position?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "world_players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "world_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      world_standings: {
        Row: {
          division_id: string | null
          draws: number | null
          goal_difference: number | null
          goals_against: number | null
          goals_for: number | null
          id: string
          losses: number | null
          played: number | null
          points: number | null
          team_id: string | null
          updated_at: string | null
          wins: number | null
        }
        Insert: {
          division_id?: string | null
          draws?: number | null
          goal_difference?: number | null
          goals_against?: number | null
          goals_for?: number | null
          id?: string
          losses?: number | null
          played?: number | null
          points?: number | null
          team_id?: string | null
          updated_at?: string | null
          wins?: number | null
        }
        Update: {
          division_id?: string | null
          draws?: number | null
          goal_difference?: number | null
          goals_against?: number | null
          goals_for?: number | null
          id?: string
          losses?: number | null
          played?: number | null
          points?: number | null
          team_id?: string | null
          updated_at?: string | null
          wins?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "world_standings_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "world_divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      world_teams: {
        Row: {
          country: string | null
          created_at: string | null
          id: string
          is_bot: boolean | null
          league_id: string | null
          logo: string | null
          name: string
          strength: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          id?: string
          is_bot?: boolean | null
          league_id?: string | null
          logo?: string | null
          name: string
          strength?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          id?: string
          is_bot?: boolean | null
          league_id?: string | null
          logo?: string | null
          name?: string
          strength?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "world_teams_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "world_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      youth_prospects: {
        Row: {
          age: number
          attributes: Json
          club_id: string
          contract_status: string | null
          created_at: string
          dominant_foot: string
          energy: number | null
          evolution_history: Json | null
          fatigue: number | null
          height: number | null
          id: string
          interception: number | null
          market_value: number
          months_in_academy: number | null
          morale: number | null
          name: string
          nationality: string
          overall: number
          personality: string
          player_expectation: string | null
          position: string
          potential: number
          rarity: string
          secondary_positions: string[] | null
          stamina_stat: number | null
          tactical_iq: number | null
          training_focus: string | null
          training_intensity: string | null
          updated_at: string
          weight: number | null
        }
        Insert: {
          age: number
          attributes: Json
          club_id: string
          contract_status?: string | null
          created_at?: string
          dominant_foot: string
          energy?: number | null
          evolution_history?: Json | null
          fatigue?: number | null
          height?: number | null
          id?: string
          interception?: number | null
          market_value: number
          months_in_academy?: number | null
          morale?: number | null
          name: string
          nationality: string
          overall: number
          personality: string
          player_expectation?: string | null
          position: string
          potential: number
          rarity: string
          secondary_positions?: string[] | null
          stamina_stat?: number | null
          tactical_iq?: number | null
          training_focus?: string | null
          training_intensity?: string | null
          updated_at?: string
          weight?: number | null
        }
        Update: {
          age?: number
          attributes?: Json
          club_id?: string
          contract_status?: string | null
          created_at?: string
          dominant_foot?: string
          energy?: number | null
          evolution_history?: Json | null
          fatigue?: number | null
          height?: number | null
          id?: string
          interception?: number | null
          market_value?: number
          months_in_academy?: number | null
          morale?: number | null
          name?: string
          nationality?: string
          overall?: number
          personality?: string
          player_expectation?: string | null
          position?: string
          potential?: number
          rarity?: string
          secondary_positions?: string[] | null
          stamina_stat?: number | null
          tactical_iq?: number | null
          training_focus?: string | null
          training_intensity?: string | null
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "youth_prospects_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      league_standings: {
        Row: {
          budget: number | null
          club_logo: string | null
          club_name: string | null
          draws: number | null
          goals_against: number | null
          goals_diff: number | null
          goals_for: number | null
          id: string | null
          joined_at: string | null
          league_id: string | null
          losses: number | null
          played: number | null
          points: number | null
          position: number | null
          reputation: number | null
          user_id: string | null
          wins: number | null
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
    }
    Functions: {
      accept_open_friendly_slot: { Args: { _slot_id: string }; Returns: Json }
      admin_add_money_to_club:
        | {
            Args: { p_amount: number; p_target_user_id: string }
            Returns: Json
          }
        | {
            Args: {
              p_amount: number
              p_reason?: string
              p_target_user_id: string
            }
            Returns: Json
          }
      advance_cup_round: { Args: { _cup_id: string }; Returns: undefined }
      advance_cup_winners: {
        Args: { _cup_id: string; _current_phase: string }
        Returns: undefined
      }
      advance_scout_seasons: { Args: never; Returns: undefined }
      advance_world_system_day: { Args: never; Returns: undefined }
      approve_beta_request: {
        Args: { _request_id: string }
        Returns: undefined
      }
      auto_assign_league: {
        Args: { _club_name: string; _country: string; _user_id: string }
        Returns: string
      }
      auto_simulate_overdue_matches: { Args: never; Returns: undefined }
      award_club_world_cup_prizes: {
        Args: { _cup_id: string }
        Returns: undefined
      }
      batch_upsert_player_stats: {
        Args: {
          _comp_id: string
          _comp_id_field: string
          _table_name: string
          _team_id_field: string
          _updates: Json
        }
        Returns: undefined
      }
      bot_strength_for_division: {
        Args: { _division: number }
        Returns: number
      }
      calculate_league_reward: { Args: { p_pos: number }; Returns: number }
      calculate_match_scheduled_time: {
        Args: { p_date: string; p_league_id: string }
        Returns: string
      }
      calculate_merch_sales: {
        Args: { p_base_amount: number; p_club_id: string }
        Returns: number
      }
      check_and_advance_round: {
        Args: { p_league_id: string }
        Returns: undefined
      }
      check_and_start_league: {
        Args: { _league_id: string }
        Returns: undefined
      }
      check_beta_access: { Args: { _email: string }; Returns: Json }
      check_club_name_available: { Args: { _name: string }; Returns: Json }
      close_expired_auctions: { Args: never; Returns: Json }
      cron_generate_youth_for_all: { Args: never; Returns: Json }
      cwc_update_standings: {
        Args: {
          _ag: number
          _ap: number
          _away_id: string
          _hg: number
          _home_id: string
          _hp: number
        }
        Returns: undefined
      }
      deliver_shop_item: { Args: { p_order_id: string }; Returns: Json }
      end_season_redistribute: {
        Args: { _league_id: string }
        Returns: undefined
      }
      ensure_16_teams: { Args: { _league_id: string }; Returns: undefined }
      ensure_league_full: {
        Args: { target_league_id: string }
        Returns: undefined
      }
      ensure_league_size: { Args: { p_league_id: string }; Returns: undefined }
      ensure_league_teams: {
        Args: { p_league_id: string; p_player_team_id: string }
        Returns: undefined
      }
      ensure_user_version: {
        Args: { _current_version: string; _user_id: string }
        Returns: {
          created_at: string
          data_version: string
          failed_attempts: number
          game_version: string
          id: string
          last_backup: Json | null
          last_backup_at: string | null
          last_migration_at: string | null
          migration_status: string
          observation_until: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_versions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      execute_admin_money_transfer: {
        Args: { p_description: string; p_target_id: string; p_value: number }
        Returns: Json
      }
      expire_shop_effects: { Args: never; Returns: Json }
      fill_league_with_bots: { Args: { _league_id: string }; Returns: number }
      finish_national_cup_award_continental: {
        Args: { _cup_id: string }
        Returns: undefined
      }
      fix_league_forcefully: { Args: { p_league_id: string }; Returns: Json }
      fix_world_leagues_kickoffs: { Args: never; Returns: undefined }
      generate_beginner_cup_fixtures: {
        Args: { _cup_id: string }
        Returns: undefined
      }
      generate_bot_club_name: {
        Args: { _country: string; _idx: number }
        Returns: string
      }
      generate_league_calendar: {
        Args: { p_league_id: string }
        Returns: undefined
      }
      generate_league_fixtures:
        | {
            Args: { _league_id: string; _month: number; _year: number }
            Returns: undefined
          }
        | { Args: { p_league_id: string }; Returns: undefined }
      generate_league_matches: {
        Args: { p_league_id: string }
        Returns: undefined
      }
      generate_league_matches_v2: {
        Args: { p_league_id: string }
        Returns: undefined
      }
      generate_league_matches_v3: {
        Args: { p_league_id: string }
        Returns: undefined
      }
      generate_random_scout: { Args: never; Returns: undefined }
      generate_weekly_scout: { Args: never; Returns: undefined }
      get_auction_start_price: { Args: { ovr: number }; Returns: number }
      get_available_league_for_country: {
        Args: { p_country_id: string }
        Returns: string
      }
      get_club_shields_by_names: {
        Args: { _names: string[] }
        Returns: {
          club_name: string
          shield: Json
        }[]
      }
      get_continent_for_country: { Args: { _country: string }; Returns: string }
      get_cup_name_by_country: {
        Args: { country_code: string }
        Returns: string
      }
      get_division_start_time: { Args: { div_level: number }; Returns: string }
      get_league_match_time: {
        Args: { division_level: number }
        Returns: string
      }
      get_match_commentary: {
        Args: {
          away_goals: number
          away_name: string
          home_goals: number
          home_name: string
          match_data: Json
        }
        Returns: string
      }
      get_or_create_current_league: {
        Args: { p_division_id: string }
        Returns: string
      }
      get_public_club_profile: {
        Args: { _user_id: string }
        Returns: {
          club_logo: string
          club_name: string
          country: string
          fans: number
          members: number
          reputation: number
          stadium: string
          updated_at: string
          user_id: string
        }[]
      }
      get_user_club_shield: { Args: { _user_id: string }; Returns: Json }
      get_user_league_info: {
        Args: { _user_id: string }
        Returns: {
          league_id: string
          league_name: string
          player_team_id: string
          status: string
          team_count: number
        }[]
      }
      get_user_next_match: {
        Args: { _user_id: string }
        Returns: {
          away_team_id: string
          away_team_name: string
          division_name: string
          home_team_id: string
          home_team_name: string
          id: string
          league_id: string
          league_name: string
          round: number
          scheduled_at: string
          status: string
        }[]
      }
      get_user_stadium_info: {
        Args: { _user_id: string }
        Returns: {
          club_name: string
          stadium_level: number
          stadium_name: string
        }[]
      }
      get_user_team_strength: { Args: { _user_id: string }; Returns: number }
      get_user_upcoming_matches: {
        Args: { _limit?: number; _user_id: string }
        Returns: {
          away_club: string
          competition_name: string
          competition_type: string
          home_club: string
          is_home: boolean
          match_id: string
          priority: number
          scheduled_at: string
          stage: string
        }[]
      }
      grant_tournament_prize: {
        Args: {
          p_amount: number
          p_club_id: string
          p_competition_id: string
          p_competition_name: string
          p_competition_type: string
          p_phase_or_rank: string
          p_season_year: number
        }
        Returns: boolean
      }
      handle_team_league_entry: {
        Args: { _country_id: string; _team_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_cup_goals: {
        Args: { p_cup_id: string; p_player_id: string; p_team_id: string }
        Returns: undefined
      }
      initialize_player_league: {
        Args: { p_player_team_id: string }
        Returns: string
      }
      initialize_world_league: {
        Args: { p_league_id: string }
        Returns: undefined
      }
      is_in_national_cup: {
        Args: { _cup_id: string; _user_id: string }
        Returns: boolean
      }
      is_league_member: {
        Args: { _league_id: string; _user_id: string }
        Returns: boolean
      }
      is_live_match_participant: {
        Args: { _live_match_id: string; _user_id: string }
        Returns: boolean
      }
      is_match_participant: {
        Args: { _shared_match_id: string; _user_id: string }
        Returns: boolean
      }
      join_world_league: {
        Args: { _league_id: string; _user_id: string }
        Returns: undefined
      }
      next_sunday_17: { Args: never; Returns: string }
      normalize_country: { Args: { _input: string }; Returns: string }
      notify_upcoming_matches: { Args: never; Returns: undefined }
      place_auction_bid: {
        Args: { _amount: number; _auction_id: string }
        Returns: Json
      }
      process_club_shop_daily: { Args: { p_club_id: string }; Returns: Json }
      process_cup_tick: { Args: { _cup_id: string }; Returns: undefined }
      process_daily_shop_bonuses: { Args: { p_user_id: string }; Returns: Json }
      process_daily_store_updates: { Args: never; Returns: undefined }
      process_expired_auctions: { Args: never; Returns: undefined }
      process_league_waiting_list: {
        Args: { _league_id: string }
        Returns: undefined
      }
      process_season_transition:
        | { Args: never; Returns: undefined }
        | { Args: { _country: string }; Returns: undefined }
      process_tournament_prize: {
        Args: {
          p_amount: number
          p_club_id: string
          p_comp_id: string
          p_comp_name: string
          p_comp_type: string
          p_month: number
          p_phase_rank: string
          p_year: number
        }
        Returns: boolean
      }
      publish_newspaper_event: {
        Args: {
          _category: string
          _image_key: string
          _text: string
          _user_id: string
        }
        Returns: undefined
      }
      qualify_club_world_cup: { Args: { _season_year: number }; Returns: Json }
      qualify_continental_humans: {
        Args: { _continent: string; _season: number; _tier: string }
        Returns: Json
      }
      qualify_international_teams: {
        Args: { _continent: string; _season_year: number }
        Returns: Json
      }
      random_bot_logo: { Args: never; Returns: string }
      rebuild_all_leagues_v3: { Args: never; Returns: undefined }
      rebuild_league_teams_to_16: {
        Args: { p_league_id: string }
        Returns: undefined
      }
      rebuild_league_v6: { Args: never; Returns: undefined }
      recalculate_league_table_from_matches: {
        Args: { p_league_id: string }
        Returns: undefined
      }
      redistribute_beginners: { Args: { _country: string }; Returns: undefined }
      reject_beta_request: { Args: { _request_id: string }; Returns: undefined }
      replace_bot_with_player:
        | {
            Args: {
              _club_logo?: string
              _club_name: string
              _league_id: string
              _user_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              _country_code?: string
              _logo: string
              _team_name: string
              _user_id: string
            }
            Returns: string
          }
      reset_league_structure: {
        Args: { _league_id: string }
        Returns: undefined
      }
      resolve_home_user_for_match: {
        Args: { _match_id: string }
        Returns: string
      }
      seed_initial_world_leagues: { Args: never; Returns: undefined }
      seed_league_data: { Args: { p_league_id: string }; Returns: undefined }
      simulate_cup_match: { Args: { _match_id: string }; Returns: undefined }
      simulate_league_matchday: {
        Args: { p_league_id: string; p_matchday: number }
        Returns: undefined
      }
      simulate_overdue_cup_matches: { Args: never; Returns: undefined }
      simulate_overdue_matches: { Args: never; Returns: undefined }
      start_club_world_cup: { Args: { _season_year: number }; Returns: string }
      start_continental_tournament: {
        Args: {
          _continent: string
          _season?: number
          _start_date?: string
          _tier: string
        }
        Returns: string
      }
      start_national_cup: {
        Args: { _country: string; _season_year: number }
        Returns: string
      }
      sync_all_saves_to_world_system: { Args: never; Returns: undefined }
      sync_beginner_cup: { Args: { _user_id: string }; Returns: undefined }
      sync_league_integrity: { Args: { _user_id: string }; Returns: undefined }
      sync_league_progress: {
        Args: { p_league_id: string }
        Returns: undefined
      }
      sync_league_state: { Args: { _user_id: string }; Returns: Json }
      sync_league_team_count: { Args: never; Returns: undefined }
      sync_match_persistence: {
        Args: { _match_id: string }
        Returns: undefined
      }
      update_club_budget: {
        Args: { p_amount: number; p_description: string; p_user_id: string }
        Returns: undefined
      }
      update_cup_player_stats: {
        Args: {
          p_assists?: number
          p_cup_id: string
          p_goals?: number
          p_player_id: string
          p_rating?: number
          p_team_id: string
        }
        Returns: undefined
      }
      update_league_standings: {
        Args: { _league_id: string }
        Returns: undefined
      }
      upgrade_club_shop: { Args: { p_club_id: string }; Returns: Json }
      upsert_player_stats: {
        Args: {
          _comp_id: string
          _comp_id_field: string
          _player_name: string
          _stats: Json
          _table_name: string
          _team_id: string
          _team_id_field: string
        }
        Returns: undefined
      }
      upsert_world_player_stats: {
        Args: {
          _assists: number
          _goals: number
          _is_mvp: boolean
          _league_id: string
          _player_id: string
          _rating: number
          _team_name: string
        }
        Returns: undefined
      }
      validate_world_league: { Args: { p_league_id: string }; Returns: Json }
      version_compare: { Args: { v1: string; v2: string }; Returns: number }
      world_leagues_apply_fixed_kickoff: { Args: never; Returns: Json }
      world_leagues_kickoff_for: {
        Args: { _country: string; _division: number }
        Returns: {
          h: number
          m: number
        }[]
      }
      world_leagues_redistribute_kickoff: { Args: never; Returns: Json }
      youth_market_value: {
        Args: {
          p_age: number
          p_overall: number
          p_position?: string
          p_potential: number
          p_rarity?: string
        }
        Returns: number
      }
      youth_potential_bounds: {
        Args: { lvl: number }
        Returns: {
          max_pot: number
          min_pot: number
          rare_bonus_max: number
          rare_bonus_min: number
          rare_chance: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      mission_status: "em_andamento" | "concluída" | "cancelada"
      mission_type: "local" | "global" | "posição" | "promessas"
      scout_level: "baixo" | "médio" | "alto" | "elite"
      scout_specialization: "ataque" | "defesa" | "meio" | "jovens" | "geral"
      world_competition_status:
        | "locked"
        | "pending"
        | "in_progress"
        | "finished"
      world_league_status: "pending" | "in_progress" | "finished"
      world_match_status: "scheduled" | "live" | "finished" | "postponed"
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
      mission_status: ["em_andamento", "concluída", "cancelada"],
      mission_type: ["local", "global", "posição", "promessas"],
      scout_level: ["baixo", "médio", "alto", "elite"],
      scout_specialization: ["ataque", "defesa", "meio", "jovens", "geral"],
      world_competition_status: [
        "locked",
        "pending",
        "in_progress",
        "finished",
      ],
      world_league_status: ["pending", "in_progress", "finished"],
      world_match_status: ["scheduled", "live", "finished", "postponed"],
    },
  },
} as const
