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
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json
          id?: string
          user_id?: string
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
      cup_competitions: {
        Row: {
          continent: string | null
          country: string | null
          created_at: string | null
          cup_type: string
          current_round: number | null
          format: string | null
          id: string
          name: string
          season_month: number | null
          season_year: number | null
          status: string | null
          tier: string | null
          total_rounds: number | null
        }
        Insert: {
          continent?: string | null
          country?: string | null
          created_at?: string | null
          cup_type?: string
          current_round?: number | null
          format?: string | null
          id?: string
          name: string
          season_month?: number | null
          season_year?: number | null
          status?: string | null
          tier?: string | null
          total_rounds?: number | null
        }
        Update: {
          continent?: string | null
          country?: string | null
          created_at?: string | null
          cup_type?: string
          current_round?: number | null
          format?: string | null
          id?: string
          name?: string
          season_month?: number | null
          season_year?: number | null
          status?: string | null
          tier?: string | null
          total_rounds?: number | null
        }
        Relationships: []
      }
      cup_matches: {
        Row: {
          away_goals: number | null
          away_team_id: string | null
          created_at: string | null
          cup_id: string
          home_goals: number | null
          home_team_id: string | null
          id: string
          leg: number | null
          match_data: Json | null
          played_at: string | null
          round: number
          scheduled_at: string | null
          status: string | null
        }
        Insert: {
          away_goals?: number | null
          away_team_id?: string | null
          created_at?: string | null
          cup_id: string
          home_goals?: number | null
          home_team_id?: string | null
          id?: string
          leg?: number | null
          match_data?: Json | null
          played_at?: string | null
          round?: number
          scheduled_at?: string | null
          status?: string | null
        }
        Update: {
          away_goals?: number | null
          away_team_id?: string | null
          created_at?: string | null
          cup_id?: string
          home_goals?: number | null
          home_team_id?: string | null
          id?: string
          leg?: number | null
          match_data?: Json | null
          played_at?: string | null
          round?: number
          scheduled_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cup_matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "cup_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cup_matches_cup_id_fkey"
            columns: ["cup_id"]
            isOneToOne: false
            referencedRelation: "cup_competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cup_matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "cup_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      cup_teams: {
        Row: {
          bot_name: string | null
          bot_strength: number | null
          club_logo: string | null
          club_name: string
          created_at: string | null
          cup_id: string
          eliminated: boolean | null
          id: string
          is_bot: boolean | null
          seed: number | null
          user_id: string | null
        }
        Insert: {
          bot_name?: string | null
          bot_strength?: number | null
          club_logo?: string | null
          club_name: string
          created_at?: string | null
          cup_id: string
          eliminated?: boolean | null
          id?: string
          is_bot?: boolean | null
          seed?: number | null
          user_id?: string | null
        }
        Update: {
          bot_name?: string | null
          bot_strength?: number | null
          club_logo?: string | null
          club_name?: string
          created_at?: string | null
          cup_id?: string
          eliminated?: boolean | null
          id?: string
          is_bot?: boolean | null
          seed?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cup_teams_cup_id_fkey"
            columns: ["cup_id"]
            isOneToOne: false
            referencedRelation: "cup_competitions"
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
          created_at: string
          id: string
          last_match_timestamp: string | null
          save_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          club_data: Json
          created_at?: string
          id?: string
          last_match_timestamp?: string | null
          save_name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          club_data?: Json
          created_at?: string
          id?: string
          last_match_timestamp?: string | null
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
          away_user_id: string
          created_at: string
          home_goals: number | null
          home_joined: boolean
          home_user_id: string
          id: string
          league_id: string
          lobby_opened_at: string | null
          match_data: Json | null
          played_at: string | null
          round: number
          status: string
        }
        Insert: {
          auto_sim_at?: string | null
          away_goals?: number | null
          away_joined?: boolean
          away_user_id: string
          created_at?: string
          home_goals?: number | null
          home_joined?: boolean
          home_user_id: string
          id?: string
          league_id: string
          lobby_opened_at?: string | null
          match_data?: Json | null
          played_at?: string | null
          round?: number
          status?: string
        }
        Update: {
          auto_sim_at?: string | null
          away_goals?: number | null
          away_joined?: boolean
          away_user_id?: string
          created_at?: string
          home_goals?: number | null
          home_joined?: boolean
          home_user_id?: string
          id?: string
          league_id?: string
          lobby_opened_at?: string | null
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
          budget: number
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
          budget?: number
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
          budget?: number
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
      live_matches: {
        Row: {
          away_goals: number
          away_strength: number
          away_team: string
          competition: string
          created_at: string
          current_minute: number
          duration_seconds: number
          events: Json
          finished_at: string | null
          home_goals: number
          home_players: Json
          home_strength: number
          home_team: string
          id: string
          is_home: boolean
          match_id: string
          player_ratings: Json
          roster_locked_at: string | null
          stadium_capacity: number
          stadium_name: string
          started_at: string
          stats: Json
          status: string
          tactics: Json
          user_id: string
        }
        Insert: {
          away_goals?: number
          away_strength?: number
          away_team: string
          competition?: string
          created_at?: string
          current_minute?: number
          duration_seconds?: number
          events?: Json
          finished_at?: string | null
          home_goals?: number
          home_players?: Json
          home_strength?: number
          home_team: string
          id?: string
          is_home?: boolean
          match_id: string
          player_ratings?: Json
          roster_locked_at?: string | null
          stadium_capacity?: number
          stadium_name?: string
          started_at?: string
          stats?: Json
          status?: string
          tactics?: Json
          user_id: string
        }
        Update: {
          away_goals?: number
          away_strength?: number
          away_team?: string
          competition?: string
          created_at?: string
          current_minute?: number
          duration_seconds?: number
          events?: Json
          finished_at?: string | null
          home_goals?: number
          home_players?: Json
          home_strength?: number
          home_team?: string
          id?: string
          is_home?: boolean
          match_id?: string
          player_ratings?: Json
          roster_locked_at?: string | null
          stadium_capacity?: number
          stadium_name?: string
          started_at?: string
          stats?: Json
          status?: string
          tactics?: Json
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
          player_age: number
          player_data: Json
          player_name: string
          player_overall: number
          player_position: string
          salary: number
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
          player_age: number
          player_data: Json
          player_name: string
          player_overall: number
          player_position?: string
          salary?: number
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
          player_age?: number
          player_data?: Json
          player_name?: string
          player_overall?: number
          player_position?: string
          salary?: number
          seller_club_name?: string
          seller_id?: string
          seller_shield?: Json | null
          status?: string
        }
        Relationships: []
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
      newspaper_entries: {
        Row: {
          category: string
          created_at: string
          id: string
          is_event: boolean
          narration: string | null
          text: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          is_event?: boolean
          narration?: string | null
          text: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_event?: boolean
          narration?: string | null
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
          last_training_processed_at: string | null
          tutorial_completed: boolean
          user_id: string
          viewed_awards_season: number | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          last_training_processed_at?: string | null
          tutorial_completed?: boolean
          user_id: string
          viewed_awards_season?: number | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
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
            foreignKeyName: "season_calendar_cup_id_fkey"
            columns: ["cup_id"]
            isOneToOne: false
            referencedRelation: "cup_competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_calendar_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "multiplayer_leagues"
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
          created_at: string
          data: Json | null
          icon: string
          id: string
          message: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          icon?: string
          id?: string
          message: string
          read_at?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          icon?: string
          id?: string
          message?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auto_assign_league: {
        Args: { _club_name: string; _country: string; _user_id: string }
        Returns: string
      }
      end_season_redistribute: {
        Args: { _league_id: string }
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_league_member: {
        Args: { _league_id: string; _user_id: string }
        Returns: boolean
      }
      process_season_transition: {
        Args: { _country: string }
        Returns: undefined
      }
      qualify_international_teams: {
        Args: { _continent: string; _season_year: number }
        Returns: Json
      }
      redistribute_beginners: { Args: { _country: string }; Returns: undefined }
      version_compare: { Args: { v1: string; v2: string }; Returns: number }
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
