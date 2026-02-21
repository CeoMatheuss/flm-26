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
      friendly_invites: {
        Row: {
          created_at: string
          home_team_id: string
          id: string
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
          updated_at: string
        }
        Insert: {
          created_at?: string
          home_team_id: string
          id?: string
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
          updated_at?: string
        }
        Update: {
          created_at?: string
          home_team_id?: string
          id?: string
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
      journal_updates: {
        Row: {
          content: string
          created_at: string
          id: string
          title: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          title?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          title?: string
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
          max_members: number
          name: string
          owner_id: string
          round_interval_hours: number
          season: number
          season_end: string | null
          season_start: string | null
          season_status: string
          status: string
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
          max_members?: number
          name: string
          owner_id: string
          round_interval_hours?: number
          season?: number
          season_end?: string | null
          season_start?: string | null
          season_status?: string
          status?: string
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
          max_members?: number
          name?: string
          owner_id?: string
          round_interval_hours?: number
          season?: number
          season_end?: string | null
          season_start?: string | null
          season_status?: string
          status?: string
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
      redistribute_beginners: { Args: { _country: string }; Returns: undefined }
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
