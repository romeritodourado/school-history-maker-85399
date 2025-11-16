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
      academic_years: {
        Row: {
          calendar_year: number
          city: string
          class_name: string | null
          created_at: string | null
          grade_level: string
          id: string
          reclassified: boolean | null
          school_name: string
          school_period_end: string | null
          school_period_start: string | null
          shift: string | null
          state: string
          student_id: string
          trimester_shift: string | null
          trimester_year: string | null
        }
        Insert: {
          calendar_year: number
          city?: string
          class_name?: string | null
          created_at?: string | null
          grade_level: string
          id?: string
          reclassified?: boolean | null
          school_name?: string
          school_period_end?: string | null
          school_period_start?: string | null
          shift?: string | null
          state?: string
          student_id: string
          trimester_shift?: string | null
          trimester_year?: string | null
        }
        Update: {
          calendar_year?: number
          city?: string
          class_name?: string | null
          created_at?: string | null
          grade_level?: string
          id?: string
          reclassified?: boolean | null
          school_name?: string
          school_period_end?: string | null
          school_period_start?: string | null
          shift?: string | null
          state?: string
          student_id?: string
          trimester_shift?: string | null
          trimester_year?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_years_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      annual_grades: {
        Row: {
          absences: number | null
          academic_year_id: string
          category: string | null
          created_at: string | null
          grade: number | null
          id: string
          student_id: string
          subject_name: string
          workload: number | null
        }
        Insert: {
          absences?: number | null
          academic_year_id: string
          category?: string | null
          created_at?: string | null
          grade?: number | null
          id?: string
          student_id: string
          subject_name: string
          workload?: number | null
        }
        Update: {
          absences?: number | null
          academic_year_id?: string
          category?: string | null
          created_at?: string | null
          grade?: number | null
          id?: string
          student_id?: string
          subject_name?: string
          workload?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "annual_grades_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "annual_grades_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          school_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          school_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          school_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          address: string | null
          city: string
          created_at: string
          director_id: string | null
          id: string
          inep_code: string | null
          name: string
          state: string
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string
          created_at?: string
          director_id?: string | null
          id?: string
          inep_code?: string | null
          name: string
          state?: string
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string
          created_at?: string
          director_id?: string | null
          id?: string
          inep_code?: string | null
          name?: string
          state?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      signatures: {
        Row: {
          algorithm: string
          created_at: string
          id: string
          ip_address: string | null
          pdf_hash: string
          school_id: string
          signed_at: string
          transcript_id: string
          user_id: string
        }
        Insert: {
          algorithm?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          pdf_hash: string
          school_id: string
          signed_at?: string
          transcript_id: string
          user_id: string
        }
        Update: {
          algorithm?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          pdf_hash?: string
          school_id?: string
          signed_at?: string
          transcript_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "signatures_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          birth_date: string
          birth_place: string
          birth_state: string
          completion_year: number | null
          created_at: string | null
          father_name: string | null
          full_name: string
          grade_series: string | null
          id: string
          mother_name: string
          observations: string | null
          school_id: string | null
          signed_at: string | null
          status: string
          student_status: string | null
          transcript_status: string | null
          updated_at: string | null
        }
        Insert: {
          birth_date: string
          birth_place: string
          birth_state?: string
          completion_year?: number | null
          created_at?: string | null
          father_name?: string | null
          full_name: string
          grade_series?: string | null
          id?: string
          mother_name: string
          observations?: string | null
          school_id?: string | null
          signed_at?: string | null
          status?: string
          student_status?: string | null
          transcript_status?: string | null
          updated_at?: string | null
        }
        Update: {
          birth_date?: string
          birth_place?: string
          birth_state?: string
          completion_year?: number | null
          created_at?: string | null
          father_name?: string | null
          full_name?: string
          grade_series?: string | null
          id?: string
          mother_name?: string
          observations?: string | null
          school_id?: string | null
          signed_at?: string | null
          status?: string
          student_status?: string | null
          transcript_status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      trimester_grades: {
        Row: {
          absences: number | null
          academic_year_id: string
          created_at: string | null
          grade: number | null
          id: string
          subject_name: string
          trimester: number
        }
        Insert: {
          absences?: number | null
          academic_year_id: string
          created_at?: string | null
          grade?: number | null
          id?: string
          subject_name: string
          trimester: number
        }
        Update: {
          absences?: number | null
          academic_year_id?: string
          created_at?: string | null
          grade?: number | null
          id?: string
          subject_name?: string
          trimester?: number
        }
        Relationships: [
          {
            foreignKeyName: "trimester_grades_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
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
      workload_configurations: {
        Row: {
          academic_year: number
          category: string
          created_at: string
          grade_level: string
          id: string
          subject_name: string
          updated_at: string
          workload: number
        }
        Insert: {
          academic_year: number
          category: string
          created_at?: string
          grade_level: string
          id?: string
          subject_name: string
          updated_at?: string
          workload: number
        }
        Update: {
          academic_year?: number
          category?: string
          created_at?: string
          grade_level?: string
          id?: string
          subject_name?: string
          updated_at?: string
          workload?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_school_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      promote_to_superadmin: {
        Args: { user_email: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "superadmin"
        | "adminrede"
        | "diretor"
        | "secretario"
        | "assistente"
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
      app_role: [
        "superadmin",
        "adminrede",
        "diretor",
        "secretario",
        "assistente",
      ],
    },
  },
} as const