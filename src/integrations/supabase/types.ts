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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          car_make: string
          car_model: string
          car_year: number
          confirmation_number: string
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string
          id: string
          notes: string | null
          service_ids: string[]
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          car_make?: string
          car_model?: string
          car_year?: number
          confirmation_number: string
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone: string
          id?: string
          notes?: string | null
          service_ids: string[]
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          car_make?: string
          car_model?: string
          car_year?: number
          confirmation_number?: string
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          id?: string
          notes?: string | null
          service_ids?: string[]
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Relationships: []
      }
      completed_services: {
        Row: {
          amount_received: number | null
          appointment_date: string | null
          appointment_id: string | null
          appointment_time: string | null
          car_make: string | null
          car_model: string | null
          car_year: number | null
          confirmation_number: string | null
          created_at: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          discount: number | null
          hours_worked: number | null
          id: string
          is_record_complete: boolean | null
          items_purchased: Json | null
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: string | null
          remaining_balance: number | null
          services_performed: Json | null
          staff_hours: Json | null
          staff_ids: string[] | null
          staff_names: string[] | null
          subtotal: number | null
          taxes: number | null
          total_cost: number | null
          updated_at: string
        }
        Insert: {
          amount_received?: number | null
          appointment_date?: string | null
          appointment_id?: string | null
          appointment_time?: string | null
          car_make?: string | null
          car_model?: string | null
          car_year?: number | null
          confirmation_number?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount?: number | null
          hours_worked?: number | null
          id?: string
          is_record_complete?: boolean | null
          items_purchased?: Json | null
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: string | null
          remaining_balance?: number | null
          services_performed?: Json | null
          staff_hours?: Json | null
          staff_ids?: string[] | null
          staff_names?: string[] | null
          subtotal?: number | null
          taxes?: number | null
          total_cost?: number | null
          updated_at?: string
        }
        Update: {
          amount_received?: number | null
          appointment_date?: string | null
          appointment_id?: string | null
          appointment_time?: string | null
          car_make?: string | null
          car_model?: string | null
          car_year?: number | null
          confirmation_number?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount?: number | null
          hours_worked?: number | null
          id?: string
          is_record_complete?: boolean | null
          items_purchased?: Json | null
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: string | null
          remaining_balance?: number | null
          services_performed?: Json | null
          staff_hours?: Json | null
          staff_ids?: string[] | null
          staff_names?: string[] | null
          subtotal?: number | null
          taxes?: number | null
          total_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "completed_services_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_codes: {
        Row: {
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          used: boolean
        }
        Insert: {
          code: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          used?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          used?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          created_at: string
          description: string
          duration_minutes: number
          id: string
          is_active: boolean
          name: string
          price_range: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          duration_minutes: number
          id?: string
          is_active?: boolean
          name: string
          price_range: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name?: string
          price_range?: string
          updated_at?: string
        }
        Relationships: []
      }
      staff: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      staff_paychecks: {
        Row: {
          created_at: string
          hourly_rate: number
          id: string
          notes: string | null
          paid_date: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          period_end: string
          period_start: string
          staff_email: string | null
          staff_id: string
          staff_name: string
          status: string
          total_amount: number
          total_hours: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          hourly_rate?: number
          id?: string
          notes?: string | null
          paid_date?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          period_end: string
          period_start: string
          staff_email?: string | null
          staff_id: string
          staff_name: string
          status?: string
          total_amount?: number
          total_hours?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          hourly_rate?: number
          id?: string
          notes?: string | null
          paid_date?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          period_end?: string
          period_start?: string
          staff_email?: string | null
          staff_id?: string
          staff_name?: string
          status?: string
          total_amount?: number
          total_hours?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_paychecks_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      clean_expired_reset_codes: { Args: never; Returns: undefined }
      generate_confirmation_number: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      appointment_status: "pending" | "in_progress" | "complete" | "cancelled"
      payment_method: "cash" | "visa" | "mastercard" | "etransfer" | "other"
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
      app_role: ["admin", "user"],
      appointment_status: ["pending", "in_progress", "complete", "cancelled"],
      payment_method: ["cash", "visa", "mastercard", "etransfer", "other"],
    },
  },
} as const
