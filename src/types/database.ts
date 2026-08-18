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
      auction_audit_log: {
        Row: {
          auction_id: string
          auction_round_id: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          participant_id: string | null
        }
        Insert: {
          auction_id: string
          auction_round_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          participant_id?: string | null
        }
        Update: {
          auction_id?: string
          auction_round_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          participant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auction_audit_log_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auction_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_audit_log_auction_round_id_fkey"
            columns: ["auction_round_id"]
            isOneToOne: false
            referencedRelation: "auction_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_audit_log_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "auction_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      auction_participants: {
        Row: {
          auction_id: string
          connection_status: string
          display_name: string
          id: string
          is_active: boolean
          is_host: boolean
          is_ready: boolean
          joined_at: string
          last_seen_at: string | null
          remaining_budget: number
          squad_badge_url: string | null
          squad_name: string
          starting_budget: number
          total_spent: number
        }
        Insert: {
          auction_id: string
          connection_status?: string
          display_name: string
          id?: string
          is_active?: boolean
          is_host?: boolean
          is_ready?: boolean
          joined_at?: string
          last_seen_at?: string | null
          remaining_budget: number
          squad_badge_url?: string | null
          squad_name: string
          starting_budget: number
          total_spent?: number
        }
        Update: {
          auction_id?: string
          connection_status?: string
          display_name?: string
          id?: string
          is_active?: boolean
          is_host?: boolean
          is_ready?: boolean
          joined_at?: string
          last_seen_at?: string | null
          remaining_budget?: number
          squad_badge_url?: string | null
          squad_name?: string
          starting_budget?: number
          total_spent?: number
        }
        Relationships: [
          {
            foreignKeyName: "auction_participants_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auction_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      auction_player_queue: {
        Row: {
          auction_id: string
          completed_at: string | null
          id: string
          player_id: string
          selected_at: string | null
          sequence_number: number
          status: string
        }
        Insert: {
          auction_id: string
          completed_at?: string | null
          id?: string
          player_id: string
          selected_at?: string | null
          sequence_number: number
          status?: string
        }
        Update: {
          auction_id?: string
          completed_at?: string | null
          id?: string
          player_id?: string
          selected_at?: string | null
          sequence_number?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "auction_player_queue_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auction_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_player_queue_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      auction_rounds: {
        Row: {
          auction_id: string
          bidding_locked_at: string | null
          completed_at: string | null
          force_revealed: boolean
          id: string
          minimum_bid: number
          player_id: string
          revealed_at: string | null
          round_number: number
          started_at: string
          status: string
          tie_break_used: boolean
          winner_participant_id: string | null
          winning_bid: number | null
        }
        Insert: {
          auction_id: string
          bidding_locked_at?: string | null
          completed_at?: string | null
          force_revealed?: boolean
          id?: string
          minimum_bid?: number
          player_id: string
          revealed_at?: string | null
          round_number: number
          started_at?: string
          status?: string
          tie_break_used?: boolean
          winner_participant_id?: string | null
          winning_bid?: number | null
        }
        Update: {
          auction_id?: string
          bidding_locked_at?: string | null
          completed_at?: string | null
          force_revealed?: boolean
          id?: string
          minimum_bid?: number
          player_id?: string
          revealed_at?: string | null
          round_number?: number
          started_at?: string
          status?: string
          tie_break_used?: boolean
          winner_participant_id?: string | null
          winning_bid?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "auction_rounds_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auction_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_rounds_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_rounds_winner_participant_id_fkey"
            columns: ["winner_participant_id"]
            isOneToOne: false
            referencedRelation: "auction_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      auction_sessions: {
        Row: {
          auction_name: string
          completed_at: string | null
          created_at: string
          current_player_id: string | null
          current_round: number
          ended_at: string | null
          host_name: string
          host_user_id: string | null
          id: string
          max_participants: number
          min_bid: number
          room_code: string
          started_at: string | null
          starting_budget: number
          status: string
        }
        Insert: {
          auction_name: string
          completed_at?: string | null
          created_at?: string
          current_player_id?: string | null
          current_round?: number
          ended_at?: string | null
          host_name: string
          host_user_id?: string | null
          id?: string
          max_participants: number
          min_bid?: number
          room_code: string
          started_at?: string | null
          starting_budget: number
          status?: string
        }
        Update: {
          auction_name?: string
          completed_at?: string | null
          created_at?: string
          current_player_id?: string | null
          current_round?: number
          ended_at?: string | null
          host_name?: string
          host_user_id?: string | null
          id?: string
          max_participants?: number
          min_bid?: number
          room_code?: string
          started_at?: string | null
          starting_budget?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_current_player"
            columns: ["current_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      auction_transactions: {
        Row: {
          amount: number
          auction_id: string
          auction_round_id: string | null
          balance_after: number
          balance_before: number
          created_at: string
          description: string | null
          id: string
          participant_id: string
          transaction_type: string
        }
        Insert: {
          amount: number
          auction_id: string
          auction_round_id?: string | null
          balance_after: number
          balance_before: number
          created_at?: string
          description?: string | null
          id?: string
          participant_id: string
          transaction_type: string
        }
        Update: {
          amount?: number
          auction_id?: string
          auction_round_id?: string | null
          balance_after?: number
          balance_before?: number
          created_at?: string
          description?: string | null
          id?: string
          participant_id?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "auction_transactions_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auction_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_transactions_auction_round_id_fkey"
            columns: ["auction_round_id"]
            isOneToOne: false
            referencedRelation: "auction_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_transactions_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "auction_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_reveal_records: {
        Row: {
          auction_round_id: string
          id: string
          reveal_reason: string | null
          revealed_at: string
          tie_break_metadata: Json | null
          tie_break_used: boolean
          winner_participant_id: string | null
          winning_bid: number | null
        }
        Insert: {
          auction_round_id: string
          id?: string
          reveal_reason?: string | null
          revealed_at?: string
          tie_break_metadata?: Json | null
          tie_break_used?: boolean
          winner_participant_id?: string | null
          winning_bid?: number | null
        }
        Update: {
          auction_round_id?: string
          id?: string
          reveal_reason?: string | null
          revealed_at?: string
          tie_break_metadata?: Json | null
          tie_break_used?: boolean
          winner_participant_id?: string | null
          winning_bid?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_reveal_records_auction_round_id_fkey"
            columns: ["auction_round_id"]
            isOneToOne: true
            referencedRelation: "auction_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_reveal_records_winner_participant_id_fkey"
            columns: ["winner_participant_id"]
            isOneToOne: false
            referencedRelation: "auction_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      bids: {
        Row: {
          auction_round_id: string
          bid_amount: number
          id: string
          is_valid: boolean
          participant_id: string
          rejection_reason: string | null
          submitted_at: string
        }
        Insert: {
          auction_round_id: string
          bid_amount: number
          id?: string
          is_valid?: boolean
          participant_id: string
          rejection_reason?: string | null
          submitted_at?: string
        }
        Update: {
          auction_round_id?: string
          bid_amount?: number
          id?: string
          is_valid?: boolean
          participant_id?: string
          rejection_reason?: string | null
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bids_auction_round_id_fkey"
            columns: ["auction_round_id"]
            isOneToOne: false
            referencedRelation: "auction_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "auction_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      player_purchases: {
        Row: {
          auction_id: string
          auction_round_id: string
          id: string
          participant_id: string
          player_id: string
          purchase_price: number
          purchased_at: string
        }
        Insert: {
          auction_id: string
          auction_round_id: string
          id?: string
          participant_id: string
          player_id: string
          purchase_price: number
          purchased_at?: string
        }
        Update: {
          auction_id?: string
          auction_round_id?: string
          id?: string
          participant_id?: string
          player_id?: string
          purchase_price?: number
          purchased_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_purchases_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auction_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_purchases_auction_round_id_fkey"
            columns: ["auction_round_id"]
            isOneToOne: true
            referencedRelation: "auction_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_purchases_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "auction_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_purchases_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          club: string | null
          created_at: string
          external_id: string | null
          id: string
          is_active: boolean
          name: string
          nationality: string | null
          overall_rating: number
          photo_url: string | null
          position: string
          position_group: string
          updated_at: string
        }
        Insert: {
          club?: string | null
          created_at?: string
          external_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          nationality?: string | null
          overall_rating: number
          photo_url?: string | null
          position: string
          position_group: string
          updated_at?: string
        }
        Update: {
          club?: string | null
          created_at?: string
          external_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          nationality?: string | null
          overall_rating?: number
          photo_url?: string | null
          position?: string
          position_group?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      squad_rosters: {
        Row: {
          acquired_at: string
          auction_id: string
          id: string
          participant_id: string
          player_id: string
          purchase_id: string
          purchase_price: number
        }
        Insert: {
          acquired_at?: string
          auction_id: string
          id?: string
          participant_id: string
          player_id: string
          purchase_id: string
          purchase_price: number
        }
        Update: {
          acquired_at?: string
          auction_id?: string
          id?: string
          participant_id?: string
          player_id?: string
          purchase_id?: string
          purchase_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "squad_rosters_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auction_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squad_rosters_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "auction_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squad_rosters_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squad_rosters_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "player_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_active_participant_count: {
        Args: { p_auction_id: string }
        Returns: number
      }
      get_round_bid_count: {
        Args: { p_auction_round_id: string }
        Returns: {
          total_bids: number
          valid_bids: number
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
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
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
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
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
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
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
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof Database
}
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
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof Database
}
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
