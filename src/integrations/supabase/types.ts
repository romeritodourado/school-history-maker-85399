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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never