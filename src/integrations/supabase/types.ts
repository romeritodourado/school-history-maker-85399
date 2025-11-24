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
      audit_logs: {
        Row: {
          action: string | null
          actor_id: string | null
          actor_role: Database["public"]["Enums"]["app_role"] | null
          created_at: string | null
          id: string
          payload: Json | null
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          action?: string | null
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["app_role"] | null
          created_at?: string | null
          id?: string
          payload?: Json | null
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          action?: string | null
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["app_role"] | null
          created_at?: string | null
          id?: string
          payload?: Json | null
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      municipalities: {
        Row: {
          cnpj: string | null
          created_at: string | null
          emblem_url: string | null
          id: string
          name: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string | null
          emblem_url?: string | null
          id?: string
          name: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string | null
          emblem_url?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          municipality_id: string | null
          name: string | null
          role: Database["public"]["Enums"]["app_role"]
          school_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          municipality_id?: string | null
          name?: string | null
          role: Database["public"]["Enums"]["app_role"]
          school_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          municipality_id?: string | null
          name?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          school_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipalities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          created_at: string | null
          id: string
          inep: string | null
          municipality_id: string | null
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          inep?: string | null
          municipality_id?: string | null
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          inep?: string | null
          municipality_id?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "schools_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipalities"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          birthdate: string | null
          created_at: string | null
          id: string
          name: string | null
          school_id: string | null
        }
        Insert: {
          birthdate?: string | null
          created_at?: string | null
          id?: string
          name?: string | null
          school_id?: string | null
        }
        Update: {
          birthdate?: string | null
          created_at?: string | null
          id?: string
          name?: string | null
          school_id?: string | null
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
      transcripts: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          municipality_id: string
          school_id: string
          student_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          municipality_id: string
          school_id: string
          student_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          municipality_id?: string
          school_id?: string
          student_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transcripts_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipalities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transcripts_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transcripts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
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
      [_ in never]: never
    }
    Enums: {
      app_role:
        | "super_admin"
        | "municipal_admin"
        | "school_admin"
        | "secretary"
        | "teacher"
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
  ? Database[PublicTableNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicTableNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicTableNameOrOptions]
    : never