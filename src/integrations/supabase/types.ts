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
      beginner_cup: {
        Row: {
          created_at: string | null
          id: string
          season_month: number
          season_year: number
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          season_month: number
          season_year: number
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          season_month?: number
          season_year?: number
          status?: string | null
        }
        Relationships: []
      }
      beginner_cup_matches: {
        Row: {
          away_goals: number | null
          away_penalties: number | null
          away_team_id: string | null
          created_at: string | null
          cup_id: string | null
          home_goals: number | null
          home_penalties: number | null
          home_team_id: string | null
          id: string
          phase: string
          played_at: string | null
          scheduled_at: string
          status: string | null
          winner_id: string | null
        }
        Insert: {
          away_goals?: number | null
          away_penalties?: number | null
          away_team_id?: string | null
          created_at?: string | null
          cup_id?: string | null
          home_goals?: number | null
          home_penalties?: number | null
          home_team_id?: string | null
          id?: string
          phase: string
          played_at?: string | null
          scheduled_at: string
          status?: string | null
          winner_id?: string | null
        }
        Update: {
          away_goals?: number | null
          away_penalties?: number | null
          away_team_id?: string | null
          created_at?: string | null
          cup_id?: string | null
          home_goals?: number | null
          home_penalties?: number | null
          home_team_id?: string | null
          id?: string
          phase?: string
          played_at?: string | null
          scheduled_at?: string
          status?: string | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beginner_cup_matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "world_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beginner_cup_matches_cup_id_fkey"
            columns: ["cup_id"]
            isOneToOne: false
            referencedRelation: "beginner_cup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beginner_cup_matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "world_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beginner_cup_matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "world_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      beginner_cup_participants: {
        Row: {
          created_at: string | null
          cup_id: string | null
          id: string
          status: string | null
          team_id: string | null
        }
        Insert: {
          created_at?: string | null
          cup_id?: string | null
          id?: string
          status?: string | null
          team_id?: string | null
        }
        Update: {
          created_at?: string | null
          cup_id?: string | null
          id?: string
          status?: string | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beginner_cup_participants_cup_id_fkey"
            columns: ["cup_id"]
            isOneToOne: false
            referencedRelation: "beginner_cup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beginner_cup_participants_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "world_teams"
            referencedColumns: ["id"]
          },
        ]
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
      club_world_cup_matches: {
        Row: {
          away_goals: number | null
          away_team_id: string | null
          created_at: string
          cup_id: string
          group_letter: string | null
          home_goals: number | null
          home_team_id: string | null
          id: string
          match_data: Json | null
          played_at: string | null
          round: number
          scheduled_at: string
          stage: string
          status: string
        }
        Insert: {
          away_goals?: number | null
          away_team_id?: string | null
          created_at?: string
          cup_id: string
          group_letter?: string | null
          home_goals?: number | null
          home_team_id?: string | null
          id?: string
          match_data?: Json | null
          played_at?: string | null
          round?: number
          scheduled_at: string
          stage: string
          status?: string
        }
        Update: {
          away_goals?: number | null
          away_team_id?: string | null
          created_at?: string
          cup_id?: string
          group_letter?: string | null
          home_goals?: number | null
          home_team_id?: string | null
          id?: string
          match_data?: Json | null
          played_at?: string | null
          round?: number
          scheduled_at?: string
          stage?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_world_cup_matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "club_world_cup_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_world_cup_matches_cup_id_fkey"
            columns: ["cup_id"]
            isOneToOne: false
            referencedRelation: "club_world_cups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_world_cup_matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "club_world_cup_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      club_world_cup_teams: {
        Row: {
          bot_strength: number | null
          club_logo: string | null
          club_name: string
          continent: string | null
          country: string | null
          created_at: string
          cup_id: string
          draws: number
          eliminated: boolean
          goals_against: number
          goals_for: number
          group_letter: string | null
          group_pos: number | null
          id: string
          is_bot: boolean
          losses: number
          played: number
          points: number
          source: string | null
          user_id: string | null
          wins: number
        }
        Insert: {
          bot_strength?: number | null
          club_logo?: string | null
          club_name: string
          continent?: string | null
          country?: string | null
          created_at?: string
          cup_id: string
          draws?: number
          eliminated?: boolean
          goals_against?: number
          goals_for?: number
          group_letter?: string | null
          group_pos?: number | null
          id?: string
          is_bot?: boolean
          losses?: number
          played?: number
          points?: number
          source?: string | null
          user_id?: string | null
          wins?: number
        }
        Update: {
          bot_strength?: number | null
          club_logo?: string | null
          club_name?: string
          continent?: string | null
          country?: string | null
          created_at?: string
          cup_id?: string
          draws?: number
          eliminated?: boolean
          goals_against?: number
          goals_for?: number
          group_letter?: string | null
          group_pos?: number | null
          id?: string
          is_bot?: boolean
          losses?: number
          played?: number
          points?: number
          source?: string | null
          user_id?: string | null
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "club_world_cup_teams_cup_id_fkey"
            columns: ["cup_id"]
            isOneToOne: false
            referencedRelation: "club_world_cups"
            referencedColumns: ["id"]
          },
        ]
      }
      club_world_cups: {
        Row: {
          champion_team_id: string | null
          created_at: string
          current_round: number
          current_stage: string
          id: string
          name: string
          season_year: number
          status: string
        }
        Insert: {
          champion_team_id?: string | null
          created_at?: string
          current_round?: number
          current_stage?: string
          id?: string
          name: string
          season_year: number
          status?: string
        }
        Update: {
          champion_team_id?: string | null
          created_at?: string
          current_round?: number
          current_stage?: string
          id?: string
          name?: string
          season_year?: number
          status?: string
        }
        Relationships: []
      }
      clubs: {
        Row: {
          budget: number | null
          country: string
          created_at: string
          detail_color: string | null
          fans: number | null
          id: string
          logo_url: string | null
          name: string
          primary_color: string | null
          reputation: number | null
          secondary_color: string | null
          stadium_name: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          budget?: number | null
          country?: string
          created_at?: string
          detail_color?: string | null
          fans?: number | null
          id?: string
          logo_url?: string | null
          name: string
          primary_color?: string | null
          reputation?: number | null
          secondary_color?: string | null
          stadium_name?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          budget?: number | null
          country?: string
          created_at?: string
          detail_color?: string | null
          fans?: number | null
          id?: string
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          reputation?: number | null
          secondary_color?: string | null
          stadium_name?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      continental_competitions: {
        Row: {
          champion_team_id: string | null
          continent: string
          created_at: string
          current_round: number | null
          current_stage: string | null
          end_date: string | null
          id: string
          num_groups: number | null
          runner_up_team_id: string | null
          season: number
          season_year: number | null
          start_date: string | null
          status: string
          tier: string
          total_teams: number | null
          updated_at: string
        }
        Insert: {
          champion_team_id?: string | null
          continent: string
          created_at?: string
          current_round?: number | null
          current_stage?: string | null
          end_date?: string | null
          id?: string
          num_groups?: number | null
          runner_up_team_id?: string | null
          season?: number
          season_year?: number | null
          start_date?: string | null
          status?: string
          tier: string
          total_teams?: number | null
          updated_at?: string
        }
        Update: {
          champion_team_id?: string | null
          continent?: string
          created_at?: string
          current_round?: number | null
          current_stage?: string | null
          end_date?: string | null
          id?: string
          num_groups?: number | null
          runner_up_team_id?: string | null
          season?: number
          season_year?: number | null
          start_date?: string | null
          status?: string
          tier?: string
          total_teams?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      continental_matches: {
        Row: {
          aggregate_away: number | null
          aggregate_home: number | null
          away_goals: number | null
          away_goals_pen: number | null
          away_team_id: string | null
          competition_id: string
          created_at: string
          group_label: string | null
          home_goals: number | null
          home_goals_pen: number | null
          home_team_id: string | null
          id: string
          leg: number
          match_data: Json | null
          played_at: string | null
          round: number
          scheduled_at: string
          stage: string
          status: string
        }
        Insert: {
          aggregate_away?: number | null
          aggregate_home?: number | null
          away_goals?: number | null
          away_goals_pen?: number | null
          away_team_id?: string | null
          competition_id: string
          created_at?: string
          group_label?: string | null
          home_goals?: number | null
          home_goals_pen?: number | null
          home_team_id?: string | null
          id?: string
          leg?: number
          match_data?: Json | null
          played_at?: string | null
          round?: number
          scheduled_at: string
          stage: string
          status?: string
        }
        Update: {
          aggregate_away?: number | null
          aggregate_home?: number | null
          away_goals?: number | null
          away_goals_pen?: number | null
          away_team_id?: string | null
          competition_id?: string
          created_at?: string
          group_label?: string | null
          home_goals?: number | null
          home_goals_pen?: number | null
          home_team_id?: string | null
          id?: string
          leg?: number
          match_data?: Json | null
          played_at?: string | null
          round?: number
          scheduled_at?: string
          stage?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "continental_matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "continental_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "continental_matches_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "continental_competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "continental_matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "continental_teams"
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
      continental_teams: {
        Row: {
          bot_strength: number | null
          club_logo: string | null
          club_name: string
          competition_id: string
          country: string
          created_at: string
          eliminated: boolean
          eliminated_in_stage: string | null
          group_draws: number
          group_goals_against: number
          group_goals_for: number
          group_label: string | null
          group_losses: number
          group_points: number
          group_wins: number
          id: string
          is_bot: boolean
          seed: number | null
          source: string
          user_id: string | null
        }
        Insert: {
          bot_strength?: number | null
          club_logo?: string | null
          club_name: string
          competition_id: string
          country: string
          created_at?: string
          eliminated?: boolean
          eliminated_in_stage?: string | null
          group_draws?: number
          group_goals_against?: number
          group_goals_for?: number
          group_label?: string | null
          group_losses?: number
          group_points?: number
          group_wins?: number
          id?: string
          is_bot?: boolean
          seed?: number | null
          source: string
          user_id?: string | null
        }
        Update: {
          bot_strength?: number | null
          club_logo?: string | null
          club_name?: string
          competition_id?: string
          country?: string
          created_at?: string
          eliminated?: boolean
          eliminated_in_stage?: string | null
          group_draws?: number
          group_goals_against?: number
          group_goals_for?: number
          group_label?: string | null
          group_losses?: number
          group_points?: number
          group_wins?: number
          id?: string
          is_bot?: boolean
          seed?: number | null
          source?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "continental_teams_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "continental_competitions"
            referencedColumns: ["id"]
          },
        ]
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
          competition_id: string
          created_at: string
          home_goals: number | null
          home_team_id: string
          id: string
          kickoff_at: string
          match_data: Json | null
          played_at: string | null
          round: number
          stage: string | null
          status: Database["public"]["Enums"]["world_match_status"]
        }
        Insert: {
          away_goals?: number | null
          away_team_id: string
          competition_id: string
          created_at?: string
          home_goals?: number | null
          home_team_id: string
          id?: string
          kickoff_at: string
          match_data?: Json | null
          played_at?: string | null
          round: number
          stage?: string | null
          status?: Database["public"]["Enums"]["world_match_status"]
        }
        Update: {
          away_goals?: number | null
          away_team_id?: string
          competition_id?: string
          created_at?: string
          home_goals?: number | null
          home_team_id?: string
          id?: string
          kickoff_at?: string
          match_data?: Json | null
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
          created_at: string | null
          goals: number | null
          id: string
          league_id: string | null
          matches_played: number | null
          member_id: string | null
          player_name: string
          team_name: string
          total_rating: number | null
          updated_at: string | null
        }
        Insert: {
          assists?: number | null
          created_at?: string | null
          goals?: number | null
          id?: string
          league_id?: string | null
          matches_played?: number | null
          member_id?: string | null
          player_name: string
          team_name: string
          total_rating?: number | null
          updated_at?: string | null
        }
        Update: {
          assists?: number | null
          created_at?: string | null
          goals?: number | null
          id?: string
          league_id?: string | null
          matches_played?: number | null
          member_id?: string | null
          player_name?: string
          team_name?: string
          total_rating?: number | null
          updated_at?: string | null
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
      newspaper_entries: {
        Row: {
          category: string
          created_at: string
          id: string
          image_key: string | null
          is_event: boolean
          narration: string | null
          text: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          image_key?: string | null
          is_event?: boolean
          narration?: string | null
          text: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          image_key?: string | null
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
          is_system: boolean
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
          is_system?: boolean
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
          is_system?: boolean
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
      world_cup_matches: {
        Row: {
          away_goals: number | null
          away_team_id: string
          created_at: string
          cup_id: string
          home_goals: number | null
          home_team_id: string
          id: string
          kickoff_at: string
          match_data: Json | null
          played_at: string | null
          round: number
          stage: string | null
          status: Database["public"]["Enums"]["world_match_status"]
        }
        Insert: {
          away_goals?: number | null
          away_team_id: string
          created_at?: string
          cup_id: string
          home_goals?: number | null
          home_team_id: string
          id?: string
          kickoff_at: string
          match_data?: Json | null
          played_at?: string | null
          round: number
          stage?: string | null
          status?: Database["public"]["Enums"]["world_match_status"]
        }
        Update: {
          away_goals?: number | null
          away_team_id?: string
          created_at?: string
          cup_id?: string
          home_goals?: number | null
          home_team_id?: string
          id?: string
          kickoff_at?: string
          match_data?: Json | null
          played_at?: string | null
          round?: number
          stage?: string | null
          status?: Database["public"]["Enums"]["world_match_status"]
        }
        Relationships: [
          {
            foreignKeyName: "world_cup_matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "world_league_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "world_cup_matches_cup_id_fkey"
            columns: ["cup_id"]
            isOneToOne: false
            referencedRelation: "world_cups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "world_cup_matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "world_league_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      world_cup_tournament: {
        Row: {
          champion_team_id: string | null
          created_at: string
          current_round: number
          edition: number
          id: string
          season: number
          status: Database["public"]["Enums"]["world_competition_status"]
          unlocks_in_season: number
          updated_at: string
        }
        Insert: {
          champion_team_id?: string | null
          created_at?: string
          current_round?: number
          edition: number
          id?: string
          season?: number
          status?: Database["public"]["Enums"]["world_competition_status"]
          unlocks_in_season?: number
          updated_at?: string
        }
        Update: {
          champion_team_id?: string | null
          created_at?: string
          current_round?: number
          edition?: number
          id?: string
          season?: number
          status?: Database["public"]["Enums"]["world_competition_status"]
          unlocks_in_season?: number
          updated_at?: string
        }
        Relationships: []
      }
      world_cup_tournament_clubs: {
        Row: {
          eliminated: boolean
          group_label: string | null
          id: string
          qualification_source: string | null
          team_id: string
          tournament_id: string
        }
        Insert: {
          eliminated?: boolean
          group_label?: string | null
          id?: string
          qualification_source?: string | null
          team_id: string
          tournament_id: string
        }
        Update: {
          eliminated?: boolean
          group_label?: string | null
          id?: string
          qualification_source?: string | null
          team_id?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "world_cup_tournament_clubs_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "world_league_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "world_cup_tournament_clubs_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "world_cup_tournament"
            referencedColumns: ["id"]
          },
        ]
      }
      world_cup_tournament_matches: {
        Row: {
          away_goals: number | null
          away_team_id: string
          created_at: string
          home_goals: number | null
          home_team_id: string
          id: string
          kickoff_at: string
          match_data: Json | null
          played_at: string | null
          round: number
          stage: string | null
          status: Database["public"]["Enums"]["world_match_status"]
          tournament_id: string
        }
        Insert: {
          away_goals?: number | null
          away_team_id: string
          created_at?: string
          home_goals?: number | null
          home_team_id: string
          id?: string
          kickoff_at: string
          match_data?: Json | null
          played_at?: string | null
          round: number
          stage?: string | null
          status?: Database["public"]["Enums"]["world_match_status"]
          tournament_id: string
        }
        Update: {
          away_goals?: number | null
          away_team_id?: string
          created_at?: string
          home_goals?: number | null
          home_team_id?: string
          id?: string
          kickoff_at?: string
          match_data?: Json | null
          played_at?: string | null
          round?: number
          stage?: string | null
          status?: Database["public"]["Enums"]["world_match_status"]
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "world_cup_tournament_matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "world_league_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "world_cup_tournament_matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "world_league_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "world_cup_tournament_matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "world_cup_tournament"
            referencedColumns: ["id"]
          },
        ]
      }
      world_cups: {
        Row: {
          champion_team_id: string | null
          country: string
          created_at: string
          cup_name: string
          current_round: number
          flag_emoji: string | null
          id: string
          season: number
          starts_on_matchday: number
          status: Database["public"]["Enums"]["world_competition_status"]
          updated_at: string
        }
        Insert: {
          champion_team_id?: string | null
          country: string
          created_at?: string
          cup_name: string
          current_round?: number
          flag_emoji?: string | null
          id?: string
          season?: number
          starts_on_matchday?: number
          status?: Database["public"]["Enums"]["world_competition_status"]
          updated_at?: string
        }
        Update: {
          champion_team_id?: string | null
          country?: string
          created_at?: string
          cup_name?: string
          current_round?: number
          flag_emoji?: string | null
          id?: string
          season?: number
          starts_on_matchday?: number
          status?: Database["public"]["Enums"]["world_competition_status"]
          updated_at?: string
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
      world_league_table: {
        Row: {
          country: string | null
          draws: number | null
          goals_against: number | null
          goals_for: number | null
          id: string
          league_id: string | null
          losses: number | null
          played: number | null
          points: number | null
          season_month: number
          season_year: number
          team_id: string | null
          updated_at: string | null
          wins: number | null
        }
        Insert: {
          country?: string | null
          draws?: number | null
          goals_against?: number | null
          goals_for?: number | null
          id?: string
          league_id?: string | null
          losses?: number | null
          played?: number | null
          points?: number | null
          season_month: number
          season_year: number
          team_id?: string | null
          updated_at?: string | null
          wins?: number | null
        }
        Update: {
          country?: string | null
          draws?: number | null
          goals_against?: number | null
          goals_for?: number | null
          id?: string
          league_id?: string | null
          losses?: number | null
          played?: number | null
          points?: number | null
          season_month?: number
          season_year?: number
          team_id?: string | null
          updated_at?: string | null
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
          status: string | null
        }
        Insert: {
          away_goals?: number | null
          away_team_id?: string | null
          created_at?: string | null
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
          status?: string | null
        }
        Update: {
          away_goals?: number | null
          away_team_id?: string | null
          created_at?: string | null
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
      admin_add_money_to_club: {
        Args: { p_amount: number; p_target_user_id: string }
        Returns: Json
      }
      advance_cup_winners: {
        Args: { _cup_id: string; _current_phase: string }
        Returns: undefined
      }
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
      bot_strength_for_division: {
        Args: { _division: number }
        Returns: number
      }
      calculate_league_reward: { Args: { p_pos: number }; Returns: number }
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
      get_club_shields_by_names: {
        Args: { _names: string[] }
        Returns: {
          club_name: string
          shield: Json
        }[]
      }
      get_continent_for_country: { Args: { _country: string }; Returns: string }
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
      initialize_player_league: {
        Args: { p_player_team_id: string }
        Returns: string
      }
      initialize_world_league: {
        Args: { p_league_id: string }
        Returns: undefined
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
      place_auction_bid: {
        Args: { _amount: number; _auction_id: string }
        Returns: Json
      }
      process_season_transition:
        | { Args: never; Returns: undefined }
        | { Args: { _country: string }; Returns: undefined }
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
      qualify_national_cup_teams: { Args: { _country: string }; Returns: Json }
      random_bot_logo: { Args: never; Returns: string }
      rebuild_all_leagues_v3: { Args: never; Returns: undefined }
      rebuild_league_teams_to_16: {
        Args: { p_league_id: string }
        Returns: undefined
      }
      rebuild_league_v6: { Args: never; Returns: undefined }
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
      simulate_cup_match: { Args: { _match_id: string }; Returns: undefined }
      simulate_league_matchday: {
        Args: { p_league_id: string; p_matchday: number }
        Returns: undefined
      }
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
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
