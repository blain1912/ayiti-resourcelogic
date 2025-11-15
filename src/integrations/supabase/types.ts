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
      employee_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizational_units: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
          parent_id: string | null
          type: Database["public"]["Enums"]["unit_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
          parent_id?: string | null
          type: Database["public"]["Enums"]["unit_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          parent_id?: string | null
          type?: Database["public"]["Enums"]["unit_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizational_units_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizational_units_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "organizational_units"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          custom_domain: string | null
          id: string
          max_units: number
          max_users: number
          name: string
          subscription_expires_at: string | null
          subscription_started_at: string | null
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          type: Database["public"]["Enums"]["organization_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_domain?: string | null
          id?: string
          max_units?: number
          max_users?: number
          name: string
          subscription_expires_at?: string | null
          subscription_started_at?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          type: Database["public"]["Enums"]["organization_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_domain?: string | null
          id?: string
          max_units?: number
          max_users?: number
          name?: string
          subscription_expires_at?: string | null
          subscription_started_at?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          type?: Database["public"]["Enums"]["organization_type"]
          updated_at?: string
        }
        Relationships: []
      }
      positions: {
        Row: {
          category_id: string
          created_at: string
          id: string
          name: string
          organization_id: string
          salary: number
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          name: string
          organization_id: string
          salary: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          salary?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "positions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "employee_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "positions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      professor_grades: {
        Row: {
          created_at: string
          description: string | null
          grade: Database["public"]["Enums"]["professor_grade"]
          id: string
          organization_id: string
          salary: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          grade: Database["public"]["Enums"]["professor_grade"]
          id?: string
          organization_id: string
          salary: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          grade?: Database["public"]["Enums"]["professor_grade"]
          id?: string
          organization_id?: string
          salary?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professor_grades_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          adresse_departement: string | null
          adresse_rue: string | null
          adresse_ville: string | null
          approval_status: string | null
          cin: string | null
          code_budgetaire: string | null
          code_postal: string | null
          contact_urgence_lien: string | null
          contact_urgence_nom: string | null
          contact_urgence_prenom: string | null
          contact_urgence_tel: string | null
          contact_urgence_whatsapp: string | null
          created_at: string
          date_naissance: string | null
          email: string | null
          employee_category: string | null
          employee_status: Database["public"]["Enums"]["employee_status"] | null
          employment_type: Database["public"]["Enums"]["employment_type"] | null
          etat_civil: string | null
          full_name: string | null
          groupe_sanguin: string | null
          id: string
          lieu_naissance: string | null
          nationalite: string | null
          nif: string | null
          nom: string | null
          organization_id: string | null
          photo_url: string | null
          position_id: string | null
          prenom: string | null
          professor_grade: Database["public"]["Enums"]["professor_grade"] | null
          profile_completed: boolean | null
          religion: string | null
          sexe: string | null
          tel_1: string | null
          tel_2: string | null
          unit_id: string | null
          updated_at: string
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          adresse_departement?: string | null
          adresse_rue?: string | null
          adresse_ville?: string | null
          approval_status?: string | null
          cin?: string | null
          code_budgetaire?: string | null
          code_postal?: string | null
          contact_urgence_lien?: string | null
          contact_urgence_nom?: string | null
          contact_urgence_prenom?: string | null
          contact_urgence_tel?: string | null
          contact_urgence_whatsapp?: string | null
          created_at?: string
          date_naissance?: string | null
          email?: string | null
          employee_category?: string | null
          employee_status?:
            | Database["public"]["Enums"]["employee_status"]
            | null
          employment_type?:
            | Database["public"]["Enums"]["employment_type"]
            | null
          etat_civil?: string | null
          full_name?: string | null
          groupe_sanguin?: string | null
          id?: string
          lieu_naissance?: string | null
          nationalite?: string | null
          nif?: string | null
          nom?: string | null
          organization_id?: string | null
          photo_url?: string | null
          position_id?: string | null
          prenom?: string | null
          professor_grade?:
            | Database["public"]["Enums"]["professor_grade"]
            | null
          profile_completed?: boolean | null
          religion?: string | null
          sexe?: string | null
          tel_1?: string | null
          tel_2?: string | null
          unit_id?: string | null
          updated_at?: string
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          adresse_departement?: string | null
          adresse_rue?: string | null
          adresse_ville?: string | null
          approval_status?: string | null
          cin?: string | null
          code_budgetaire?: string | null
          code_postal?: string | null
          contact_urgence_lien?: string | null
          contact_urgence_nom?: string | null
          contact_urgence_prenom?: string | null
          contact_urgence_tel?: string | null
          contact_urgence_whatsapp?: string | null
          created_at?: string
          date_naissance?: string | null
          email?: string | null
          employee_category?: string | null
          employee_status?:
            | Database["public"]["Enums"]["employee_status"]
            | null
          employment_type?:
            | Database["public"]["Enums"]["employment_type"]
            | null
          etat_civil?: string | null
          full_name?: string | null
          groupe_sanguin?: string | null
          id?: string
          lieu_naissance?: string | null
          nationalite?: string | null
          nif?: string | null
          nom?: string | null
          organization_id?: string | null
          photo_url?: string | null
          position_id?: string | null
          prenom?: string | null
          professor_grade?:
            | Database["public"]["Enums"]["professor_grade"]
            | null
          profile_completed?: boolean | null
          religion?: string | null
          sexe?: string | null
          tel_1?: string | null
          tel_2?: string | null
          unit_id?: string | null
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "organizational_units"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_unit_limit: { Args: { _organization_id: string }; Returns: boolean }
      check_user_limit: { Args: { _organization_id: string }; Returns: boolean }
      has_admin_role: {
        Args: { _organization_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _organization_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "user"
        | "directeur_general"
        | "directeur_administratif"
        | "directeur_rh"
        | "employe"
      employee_status:
        | "actif"
        | "conge_annuel"
        | "conge_maladie"
        | "conge_maternite"
        | "conge_etudes"
        | "mis_a_disposition"
        | "transfere"
        | "renvoye"
        | "decede"
      employment_type: "permanent" | "contractuel" | "journalier" | "professeur"
      organization_type:
        | "ministere"
        | "direction_generale"
        | "organisme_autonome"
        | "organisme_deconcentre"
      professor_grade:
        | "assistant"
        | "adjoint"
        | "associe"
        | "titulaire"
        | "emerite"
      subscription_tier: "free" | "pro" | "enterprise"
      unit_type:
        | "direction_generale"
        | "direction_technique"
        | "service"
        | "section"
        | "departement"
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
        "admin",
        "user",
        "directeur_general",
        "directeur_administratif",
        "directeur_rh",
        "employe",
      ],
      employee_status: [
        "actif",
        "conge_annuel",
        "conge_maladie",
        "conge_maternite",
        "conge_etudes",
        "mis_a_disposition",
        "transfere",
        "renvoye",
        "decede",
      ],
      employment_type: ["permanent", "contractuel", "journalier", "professeur"],
      organization_type: [
        "ministere",
        "direction_generale",
        "organisme_autonome",
        "organisme_deconcentre",
      ],
      professor_grade: [
        "assistant",
        "adjoint",
        "associe",
        "titulaire",
        "emerite",
      ],
      subscription_tier: ["free", "pro", "enterprise"],
      unit_type: [
        "direction_generale",
        "direction_technique",
        "service",
        "section",
        "departement",
      ],
    },
  },
} as const
