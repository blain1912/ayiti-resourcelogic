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
      attendance: {
        Row: {
          created_at: string
          date: string
          id: string
          marked_by: string
          notes: string | null
          organization_id: string
          profile_id: string
          status: string
          time: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          marked_by: string
          notes?: string | null
          organization_id: string
          profile_id: string
          status: string
          time?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          marked_by?: string
          notes?: string | null
          organization_id?: string
          profile_id?: string
          status?: string
          time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      badge_templates: {
        Row: {
          created_at: string
          id: string
          is_default: boolean | null
          name: string
          organization_id: string
          template_data: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          name: string
          organization_id: string
          template_data?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          organization_id?: string
          template_data?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "badge_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_categories: {
        Row: {
          created_at: string
          id: string
          is_template: boolean | null
          name: string
          organization_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_template?: boolean | null
          name: string
          organization_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_template?: boolean | null
          name?: string
          organization_id?: string | null
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
      employee_documents: {
        Row: {
          created_at: string
          document_type: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          organization_id: string
          profile_id: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          document_type: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          organization_id: string
          profile_id: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          document_type?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          organization_id?: string
          profile_id?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_documents_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_criteria: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          is_template: boolean | null
          name: string
          organization_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_template?: boolean | null
          name: string
          organization_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_template?: boolean | null
          name?: string
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_criteria_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_scores: {
        Row: {
          created_at: string
          criteria_id: string
          evaluation_id: string
          id: string
          recommendations: string | null
          score: Database["public"]["Enums"]["evaluation_rating"] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          criteria_id: string
          evaluation_id: string
          id?: string
          recommendations?: string | null
          score?: Database["public"]["Enums"]["evaluation_rating"] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          criteria_id?: string
          evaluation_id?: string
          id?: string
          recommendations?: string | null
          score?: Database["public"]["Enums"]["evaluation_rating"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_scores_criteria_id_fkey"
            columns: ["criteria_id"]
            isOneToOne: false
            referencedRelation: "evaluation_criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_scores_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          created_at: string
          employee_comments: string | null
          employee_id: string
          evaluation_date: string | null
          evaluation_year: number
          evaluator_comments: string | null
          evaluator_id: string
          global_rating: Database["public"]["Enums"]["evaluation_rating"] | null
          id: string
          job_description: string | null
          organization_id: string
          status: Database["public"]["Enums"]["evaluation_status"]
          supervisor_comments: string | null
          supervisor_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_comments?: string | null
          employee_id: string
          evaluation_date?: string | null
          evaluation_year: number
          evaluator_comments?: string | null
          evaluator_id: string
          global_rating?:
            | Database["public"]["Enums"]["evaluation_rating"]
            | null
          id?: string
          job_description?: string | null
          organization_id: string
          status?: Database["public"]["Enums"]["evaluation_status"]
          supervisor_comments?: string | null
          supervisor_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_comments?: string | null
          employee_id?: string
          evaluation_date?: string | null
          evaluation_year?: number
          evaluator_comments?: string | null
          evaluator_id?: string
          global_rating?:
            | Database["public"]["Enums"]["evaluation_rating"]
            | null
          id?: string
          job_description?: string | null
          organization_id?: string
          status?: Database["public"]["Enums"]["evaluation_status"]
          supervisor_comments?: string | null
          supervisor_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_evaluator_id_fkey"
            columns: ["evaluator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      greeting_card_requests: {
        Row: {
          created_at: string
          custom_message: string | null
          id: string
          occasion: Database["public"]["Enums"]["greeting_card_occasion"]
          organization_id: string
          recipient_id: string
          requester_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["greeting_card_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_message?: string | null
          id?: string
          occasion: Database["public"]["Enums"]["greeting_card_occasion"]
          organization_id: string
          recipient_id: string
          requester_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["greeting_card_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_message?: string | null
          id?: string
          occasion?: Database["public"]["Enums"]["greeting_card_occasion"]
          organization_id?: string
          recipient_id?: string
          requester_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["greeting_card_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "greeting_card_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "greeting_card_requests_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "greeting_card_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "greeting_card_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      greeting_card_templates: {
        Row: {
          background_color: string | null
          created_at: string
          id: string
          is_default: boolean | null
          message_template: string
          occasion: Database["public"]["Enums"]["greeting_card_occasion"]
          organization_id: string | null
          text_color: string | null
          title: string
          updated_at: string
        }
        Insert: {
          background_color?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          message_template: string
          occasion: Database["public"]["Enums"]["greeting_card_occasion"]
          organization_id?: string | null
          text_color?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          background_color?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          message_template?: string
          occasion?: Database["public"]["Enums"]["greeting_card_occasion"]
          organization_id?: string | null
          text_color?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "greeting_card_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      greeting_cards_sent: {
        Row: {
          created_at: string
          custom_message: string | null
          id: string
          occasion: Database["public"]["Enums"]["greeting_card_occasion"]
          organization_id: string
          recipient_id: string
          request_id: string | null
          sent_at: string
          sent_by: string
          sent_via: string[]
          template_id: string | null
        }
        Insert: {
          created_at?: string
          custom_message?: string | null
          id?: string
          occasion: Database["public"]["Enums"]["greeting_card_occasion"]
          organization_id: string
          recipient_id: string
          request_id?: string | null
          sent_at?: string
          sent_by: string
          sent_via?: string[]
          template_id?: string | null
        }
        Update: {
          created_at?: string
          custom_message?: string | null
          id?: string
          occasion?: Database["public"]["Enums"]["greeting_card_occasion"]
          organization_id?: string
          recipient_id?: string
          request_id?: string | null
          sent_at?: string
          sent_by?: string
          sent_via?: string[]
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "greeting_cards_sent_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "greeting_cards_sent_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "greeting_cards_sent_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "greeting_card_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "greeting_cards_sent_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "greeting_cards_sent_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "greeting_card_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          applicant_cv_url: string | null
          applicant_email: string | null
          applicant_name: string | null
          applicant_phone: string | null
          cover_letter: string | null
          created_at: string
          id: string
          job_posting_id: string
          notes: string | null
          organization_id: string
          profile_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
        }
        Insert: {
          applicant_cv_url?: string | null
          applicant_email?: string | null
          applicant_name?: string | null
          applicant_phone?: string | null
          cover_letter?: string | null
          created_at?: string
          id?: string
          job_posting_id: string
          notes?: string | null
          organization_id: string
          profile_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Update: {
          applicant_cv_url?: string | null
          applicant_email?: string | null
          applicant_name?: string | null
          applicant_phone?: string | null
          cover_letter?: string | null
          created_at?: string
          id?: string
          job_posting_id?: string
          notes?: string | null
          organization_id?: string
          profile_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_job_posting_id_fkey"
            columns: ["job_posting_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_postings: {
        Row: {
          created_at: string
          created_by: string | null
          deadline: string | null
          description: string | null
          id: string
          number_of_positions: number
          organization_id: string
          position_id: string | null
          recruitment_type: Database["public"]["Enums"]["recruitment_type"]
          requirements: string | null
          salary_max: number | null
          salary_min: number | null
          status: Database["public"]["Enums"]["job_posting_status"]
          title: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          number_of_positions?: number
          organization_id: string
          position_id?: string | null
          recruitment_type?: Database["public"]["Enums"]["recruitment_type"]
          requirements?: string | null
          salary_max?: number | null
          salary_min?: number | null
          status?: Database["public"]["Enums"]["job_posting_status"]
          title: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          number_of_positions?: number
          organization_id?: string
          position_id?: string | null
          recruitment_type?: Database["public"]["Enums"]["recruitment_type"]
          requirements?: string | null
          salary_max?: number | null
          salary_min?: number | null
          status?: Database["public"]["Enums"]["job_posting_status"]
          title?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_postings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_postings_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_postings_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "organizational_units"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balances: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          organization_id: string
          total_days: number
          updated_at: string
          used_days: number
          year: number
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          organization_id: string
          total_days?: number
          updated_at?: string
          used_days?: number
          year?: number
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          leave_type?: Database["public"]["Enums"]["leave_type"]
          organization_id?: string
          total_days?: number
          updated_at?: string
          used_days?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          created_at: string
          employee_id: string
          end_date: string
          id: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          organization_id: string
          reason: string | null
          review_comment: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string
          status: Database["public"]["Enums"]["leave_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          end_date: string
          id?: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          organization_id: string
          reason?: string | null
          review_comment?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["leave_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          end_date?: string
          id?: string
          leave_type?: Database["public"]["Enums"]["leave_type"]
          organization_id?: string
          reason?: string | null
          review_comment?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["leave_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_payments: {
        Row: {
          amount: number
          cheque_number: string | null
          created_at: string
          id: string
          months_paid: number
          notes: string | null
          organization_id: string
          payment_date: string
          payment_method: string
          processed_by: string | null
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
        }
        Insert: {
          amount: number
          cheque_number?: string | null
          created_at?: string
          id?: string
          months_paid?: number
          notes?: string | null
          organization_id: string
          payment_date: string
          payment_method: string
          processed_by?: string | null
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
        }
        Update: {
          amount?: number
          cheque_number?: string | null
          created_at?: string
          id?: string
          months_paid?: number
          notes?: string | null
          organization_id?: string
          payment_date?: string
          payment_method?: string
          processed_by?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_payments_organization_id_fkey"
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
          accent_color: string | null
          approval_status: string
          badge_border_style: string | null
          badge_footer_text: string | null
          badge_header_text: string | null
          badge_template: string | null
          badge_validity_months: number | null
          created_at: string
          custom_domain: string | null
          id: string
          logo_url: string | null
          max_units: number
          max_users: number
          name: string
          primary_color: string | null
          secondary_color: string | null
          subscription_expires_at: string | null
          subscription_started_at: string | null
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          type: Database["public"]["Enums"]["organization_type"]
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          approval_status?: string
          badge_border_style?: string | null
          badge_footer_text?: string | null
          badge_header_text?: string | null
          badge_template?: string | null
          badge_validity_months?: number | null
          created_at?: string
          custom_domain?: string | null
          id?: string
          logo_url?: string | null
          max_units?: number
          max_users?: number
          name: string
          primary_color?: string | null
          secondary_color?: string | null
          subscription_expires_at?: string | null
          subscription_started_at?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          type: Database["public"]["Enums"]["organization_type"]
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          approval_status?: string
          badge_border_style?: string | null
          badge_footer_text?: string | null
          badge_header_text?: string | null
          badge_template?: string | null
          badge_validity_months?: number | null
          created_at?: string
          custom_domain?: string | null
          id?: string
          logo_url?: string | null
          max_units?: number
          max_users?: number
          name?: string
          primary_color?: string | null
          secondary_color?: string | null
          subscription_expires_at?: string | null
          subscription_started_at?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          type?: Database["public"]["Enums"]["organization_type"]
          updated_at?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      positions: {
        Row: {
          category_id: string
          created_at: string
          id: string
          is_template: boolean | null
          name: string
          organization_id: string | null
          salary: number
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          is_template?: boolean | null
          name: string
          organization_id?: string | null
          salary: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          is_template?: boolean | null
          name?: string
          organization_id?: string | null
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
          date_entree_fonction: string | null
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
          date_entree_fonction?: string | null
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
          date_entree_fonction?: string | null
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
      special_schedule_assignments: {
        Row: {
          created_at: string
          end_time: string
          id: string
          notes: string | null
          organization_id: string
          profile_id: string
          schedule_id: string
          start_time: string
          updated_at: string
          work_days: number[]
        }
        Insert: {
          created_at?: string
          end_time?: string
          id?: string
          notes?: string | null
          organization_id: string
          profile_id: string
          schedule_id: string
          start_time?: string
          updated_at?: string
          work_days?: number[]
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          notes?: string | null
          organization_id?: string
          profile_id?: string
          schedule_id?: string
          start_time?: string
          updated_at?: string
          work_days?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "special_schedule_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_schedule_assignments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_schedule_assignments_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "special_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      special_schedules: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          start_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "special_schedules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          new_tier: Database["public"]["Enums"]["subscription_tier"]
          old_tier: Database["public"]["Enums"]["subscription_tier"] | null
          organization_id: string
          reason: string | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_tier: Database["public"]["Enums"]["subscription_tier"]
          old_tier?: Database["public"]["Enums"]["subscription_tier"] | null
          organization_id: string
          reason?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_tier?: Database["public"]["Enums"]["subscription_tier"]
          old_tier?: Database["public"]["Enums"]["subscription_tier"] | null
          organization_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          organization_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string | null
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
      calculate_leave_days: {
        Args: { end_date: string; start_date: string }
        Returns: number
      }
      can_approve_leaves: {
        Args: { _organization_id: string; _user_id: string }
        Returns: boolean
      }
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
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "user"
        | "directeur_general"
        | "directeur_administratif"
        | "directeur_rh"
        | "employe"
        | "approbateur_conges"
      application_status:
        | "pending"
        | "reviewing"
        | "shortlisted"
        | "interview"
        | "offered"
        | "accepted"
        | "rejected"
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
      evaluation_rating: "1" | "2" | "3" | "4" | "5"
      evaluation_status: "draft" | "submitted" | "reviewed" | "completed"
      greeting_card_occasion:
        | "anniversaire"
        | "deces_parent"
        | "nouvel_an"
        | "fete_meres"
        | "fete_peres"
        | "paques"
        | "saint_valentin"
        | "fete_drapeau"
        | "prompt_retablissement"
        | "accouchement"
        | "mariage"
      greeting_card_status: "pending" | "approved" | "rejected" | "sent"
      job_posting_status: "draft" | "open" | "closed" | "filled"
      leave_status: "pending" | "approved" | "rejected" | "cancelled"
      leave_type:
        | "conge_annuel"
        | "conge_maladie"
        | "conge_maternite"
        | "conge_paternite"
        | "conge_sans_solde"
        | "conge_exceptionnel"
        | "conge_etudes"
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
      recruitment_type: "internal" | "external"
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
        "approbateur_conges",
      ],
      application_status: [
        "pending",
        "reviewing",
        "shortlisted",
        "interview",
        "offered",
        "accepted",
        "rejected",
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
      evaluation_rating: ["1", "2", "3", "4", "5"],
      evaluation_status: ["draft", "submitted", "reviewed", "completed"],
      greeting_card_occasion: [
        "anniversaire",
        "deces_parent",
        "nouvel_an",
        "fete_meres",
        "fete_peres",
        "paques",
        "saint_valentin",
        "fete_drapeau",
        "prompt_retablissement",
        "accouchement",
        "mariage",
      ],
      greeting_card_status: ["pending", "approved", "rejected", "sent"],
      job_posting_status: ["draft", "open", "closed", "filled"],
      leave_status: ["pending", "approved", "rejected", "cancelled"],
      leave_type: [
        "conge_annuel",
        "conge_maladie",
        "conge_maternite",
        "conge_paternite",
        "conge_sans_solde",
        "conge_exceptionnel",
        "conge_etudes",
      ],
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
      recruitment_type: ["internal", "external"],
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
