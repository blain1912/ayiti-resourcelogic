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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      absence_authorizations: {
        Row: {
          approver_profile_id: string | null
          attachment_url: string | null
          authorization_type: string
          comment: string | null
          created_at: string
          date: string
          end_time: string | null
          id: string
          organization_id: string
          profile_id: string
          reason: string
          requested_by: string | null
          review_comment: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_time: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approver_profile_id?: string | null
          attachment_url?: string | null
          authorization_type?: string
          comment?: string | null
          created_at?: string
          date: string
          end_time?: string | null
          id?: string
          organization_id: string
          profile_id: string
          reason: string
          requested_by?: string | null
          review_comment?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_time?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approver_profile_id?: string | null
          attachment_url?: string | null
          authorization_type?: string
          comment?: string | null
          created_at?: string
          date?: string
          end_time?: string | null
          id?: string
          organization_id?: string
          profile_id?: string
          reason?: string
          requested_by?: string | null
          review_comment?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_time?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "absence_authorizations_approver_profile_id_fkey"
            columns: ["approver_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absence_authorizations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absence_authorizations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      account_audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          details: Json
          id: string
          new_value: string | null
          old_value: string | null
          organization_id: string
          profile_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          new_value?: string | null
          old_value?: string | null
          organization_id: string
          profile_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          new_value?: string | null
          old_value?: string | null
          organization_id?: string
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_audit_log_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          check_in_time: string | null
          check_out_time: string | null
          created_at: string
          date: string
          expected_time: string | null
          id: string
          late_minutes: number
          marked_by: string
          method: string
          notes: string | null
          organization_id: string
          profile_id: string
          status: string
          time: string | null
          tolerance_minutes: number | null
          updated_at: string
        }
        Insert: {
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string
          date: string
          expected_time?: string | null
          id?: string
          late_minutes?: number
          marked_by: string
          method?: string
          notes?: string | null
          organization_id: string
          profile_id: string
          status: string
          time?: string | null
          tolerance_minutes?: number | null
          updated_at?: string
        }
        Update: {
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string
          date?: string
          expected_time?: string | null
          id?: string
          late_minutes?: number
          marked_by?: string
          method?: string
          notes?: string | null
          organization_id?: string
          profile_id?: string
          status?: string
          time?: string | null
          tolerance_minutes?: number | null
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
      attendance_audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          id: string
          method: string | null
          new_value: Json | null
          old_value: Json | null
          organization_id: string
          profile_id: string | null
          reason: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          method?: string | null
          new_value?: Json | null
          old_value?: Json | null
          organization_id: string
          profile_id?: string | null
          reason?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          method?: string | null
          new_value?: Json | null
          old_value?: Json | null
          organization_id?: string
          profile_id?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_audit_log_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_correction_requests: {
        Row: {
          created_at: string
          date: string
          id: string
          justification: string | null
          organization_id: string
          profile_id: string
          proposed_time: string | null
          punch_type: string
          reason: string
          requested_by: string | null
          review_comment: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          justification?: string | null
          organization_id: string
          profile_id: string
          proposed_time?: string | null
          punch_type?: string
          reason: string
          requested_by?: string | null
          review_comment?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          justification?: string | null
          organization_id?: string
          profile_id?: string
          proposed_time?: string | null
          punch_type?: string
          reason?: string
          requested_by?: string | null
          review_comment?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_correction_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_correction_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_holidays: {
        Row: {
          created_at: string
          created_by: string | null
          date: string
          id: string
          label: string
          notes: string | null
          organization_id: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date: string
          id?: string
          label: string
          notes?: string | null
          organization_id: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          label?: string
          notes?: string | null
          organization_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_holidays_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_punches: {
        Row: {
          created_at: string
          date: string
          expected_time: string | null
          id: string
          is_deleted: boolean
          late_minutes: number
          method: string
          notes: string | null
          organization_id: string
          profile_id: string
          punch_time: string
          punch_type: string
          punched_at: string
          recorded_by: string | null
          token_id: string | null
          tolerance_minutes: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date?: string
          expected_time?: string | null
          id?: string
          is_deleted?: boolean
          late_minutes?: number
          method?: string
          notes?: string | null
          organization_id: string
          profile_id: string
          punch_time?: string
          punch_type?: string
          punched_at?: string
          recorded_by?: string | null
          token_id?: string | null
          tolerance_minutes?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          expected_time?: string | null
          id?: string
          is_deleted?: boolean
          late_minutes?: number
          method?: string
          notes?: string | null
          organization_id?: string
          profile_id?: string
          punch_time?: string
          punch_type?: string
          punched_at?: string
          recorded_by?: string | null
          token_id?: string | null
          tolerance_minutes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_punches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_punches_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_punches_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "attendance_qr_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_qr_tokens: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          label: string | null
          organization_id: string
          profile_id: string | null
          revoked_at: string | null
          scope: string
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
          organization_id: string
          profile_id?: string | null
          revoked_at?: string | null
          scope: string
          status?: string
          token?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
          organization_id?: string
          profile_id?: string | null
          revoked_at?: string | null
          scope?: string
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_qr_tokens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_qr_tokens_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_settings: {
        Row: {
          anti_double_seconds: number
          central_qr_enabled: boolean
          created_at: string
          individual_qr_enabled: boolean
          manual_enabled: boolean
          organization_id: string
          telework_enabled: boolean
          updated_at: string
        }
        Insert: {
          anti_double_seconds?: number
          central_qr_enabled?: boolean
          created_at?: string
          individual_qr_enabled?: boolean
          manual_enabled?: boolean
          organization_id: string
          telework_enabled?: boolean
          updated_at?: string
        }
        Update: {
          anti_double_seconds?: number
          central_qr_enabled?: boolean
          created_at?: string
          individual_qr_enabled?: boolean
          manual_enabled?: boolean
          organization_id?: string
          telework_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
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
      correspondence_approvals: {
        Row: {
          approver_id: string | null
          comment: string | null
          created_at: string
          decided_at: string | null
          id: string
          organization_id: string
          record_id: string
          status: string
          step_label: string
          step_order: number
          step_role: string
        }
        Insert: {
          approver_id?: string | null
          comment?: string | null
          created_at?: string
          decided_at?: string | null
          id?: string
          organization_id: string
          record_id: string
          status?: string
          step_label: string
          step_order: number
          step_role: string
        }
        Update: {
          approver_id?: string | null
          comment?: string | null
          created_at?: string
          decided_at?: string | null
          id?: string
          organization_id?: string
          record_id?: string
          status?: string
          step_label?: string
          step_order?: number
          step_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "correspondence_approvals_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "correspondence_approvals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "correspondence_approvals_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "correspondence_records"
            referencedColumns: ["id"]
          },
        ]
      }
      correspondence_audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          organization_id: string
          performed_by: string
          record_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          organization_id: string
          performed_by: string
          record_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          organization_id?: string
          performed_by?: string
          record_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "correspondence_audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "correspondence_audit_log_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "correspondence_records"
            referencedColumns: ["id"]
          },
        ]
      }
      correspondence_counters: {
        Row: {
          category_prefix: string
          created_at: string
          id: string
          last_number: number
          organization_id: string
          updated_at: string
          year: number
        }
        Insert: {
          category_prefix: string
          created_at?: string
          id?: string
          last_number?: number
          organization_id: string
          updated_at?: string
          year?: number
        }
        Update: {
          category_prefix?: string
          created_at?: string
          id?: string
          last_number?: number
          organization_id?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "correspondence_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      correspondence_records: {
        Row: {
          body: string
          category: Database["public"]["Enums"]["correspondence_category"]
          category_label: string | null
          created_at: string
          document_type: string | null
          id: string
          is_locked: boolean
          organization_id: string
          recipient_id: string
          reference_number: string | null
          sent_at: string
          sent_by: string
          signature_name: string | null
          signature_title: string | null
          signed_at: string | null
          status: string
          subject: string | null
          template_id: string | null
          title: string
          updated_at: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          body: string
          category: Database["public"]["Enums"]["correspondence_category"]
          category_label?: string | null
          created_at?: string
          document_type?: string | null
          id?: string
          is_locked?: boolean
          organization_id: string
          recipient_id: string
          reference_number?: string | null
          sent_at?: string
          sent_by: string
          signature_name?: string | null
          signature_title?: string | null
          signed_at?: string | null
          status?: string
          subject?: string | null
          template_id?: string | null
          title: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          body?: string
          category?: Database["public"]["Enums"]["correspondence_category"]
          category_label?: string | null
          created_at?: string
          document_type?: string | null
          id?: string
          is_locked?: boolean
          organization_id?: string
          recipient_id?: string
          reference_number?: string | null
          sent_at?: string
          sent_by?: string
          signature_name?: string | null
          signature_title?: string | null
          signed_at?: string | null
          status?: string
          subject?: string | null
          template_id?: string | null
          title?: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "correspondence_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "correspondence_records_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "correspondence_records_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "correspondence_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      correspondence_templates: {
        Row: {
          body: string
          category: Database["public"]["Enums"]["correspondence_category"]
          category_label: string | null
          created_at: string
          created_by: string
          document_type: string
          id: string
          is_active: boolean
          organization_id: string
          subject: string | null
          title: string
          updated_at: string
          variables: string[] | null
        }
        Insert: {
          body: string
          category?: Database["public"]["Enums"]["correspondence_category"]
          category_label?: string | null
          created_at?: string
          created_by: string
          document_type?: string
          id?: string
          is_active?: boolean
          organization_id: string
          subject?: string | null
          title: string
          updated_at?: string
          variables?: string[] | null
        }
        Update: {
          body?: string
          category?: Database["public"]["Enums"]["correspondence_category"]
          category_label?: string | null
          created_at?: string
          created_by?: string
          document_type?: string
          id?: string
          is_active?: boolean
          organization_id?: string
          subject?: string | null
          title?: string
          updated_at?: string
          variables?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "correspondence_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      emargement_documents: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          organization_id: string
          period_label: string | null
          upload_date: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          organization_id: string
          period_label?: string | null
          upload_date?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          organization_id?: string
          period_label?: string | null
          upload_date?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "emargement_documents_organization_id_fkey"
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
      hr_audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          comment: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          new_value: Json | null
          old_value: Json | null
          organization_id: string
          profile_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          comment?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          organization_id: string
          profile_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          comment?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          organization_id?: string
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_audit_log_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_labels: {
        Row: {
          created_at: string
          labels: Json
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          labels?: Json
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          labels?: Json
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "institution_labels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
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
      late_notification_settings: {
        Row: {
          created_at: string
          enabled: boolean
          enabled_roles: string[]
          extra_recipient_ids: string[]
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          enabled_roles?: string[]
          extra_recipient_ids?: string[]
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          enabled_roles?: string[]
          extra_recipient_ids?: string[]
          organization_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      leave_approvals: {
        Row: {
          approver_profile_id: string | null
          approver_user_id: string | null
          comment: string | null
          created_at: string
          decided_at: string | null
          id: string
          leave_request_id: string
          organization_id: string
          status: string
          step_label: string
          step_order: number
          step_role: string | null
          updated_at: string
        }
        Insert: {
          approver_profile_id?: string | null
          approver_user_id?: string | null
          comment?: string | null
          created_at?: string
          decided_at?: string | null
          id?: string
          leave_request_id: string
          organization_id: string
          status?: string
          step_label: string
          step_order?: number
          step_role?: string | null
          updated_at?: string
        }
        Update: {
          approver_profile_id?: string | null
          approver_user_id?: string | null
          comment?: string | null
          created_at?: string
          decided_at?: string | null
          id?: string
          leave_request_id?: string
          organization_id?: string
          status?: string
          step_label?: string
          step_order?: number
          step_role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_approvals_approver_profile_id_fkey"
            columns: ["approver_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_approvals_leave_request_id_fkey"
            columns: ["leave_request_id"]
            isOneToOne: false
            referencedRelation: "leave_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_approvals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balances: {
        Row: {
          carried_over_days: number
          created_at: string
          employee_id: string
          id: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          leave_type_id: string | null
          organization_id: string
          reserved_days: number
          total_days: number
          updated_at: string
          used_days: number
          year: number
        }
        Insert: {
          carried_over_days?: number
          created_at?: string
          employee_id: string
          id?: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          leave_type_id?: string | null
          organization_id: string
          reserved_days?: number
          total_days?: number
          updated_at?: string
          used_days?: number
          year?: number
        }
        Update: {
          carried_over_days?: number
          created_at?: string
          employee_id?: string
          id?: string
          leave_type?: Database["public"]["Enums"]["leave_type"]
          leave_type_id?: string | null
          organization_id?: string
          reserved_days?: number
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
            foreignKeyName: "leave_balances_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
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
          attachment_url: string | null
          comment: string | null
          created_at: string
          current_step: number
          days_count: number | null
          employee_id: string
          end_date: string
          half_day_end: boolean
          half_day_start: boolean
          id: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          leave_type_id: string | null
          organization_id: string
          reason: string | null
          review_comment: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string
          status: Database["public"]["Enums"]["leave_status"]
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          attachment_url?: string | null
          comment?: string | null
          created_at?: string
          current_step?: number
          days_count?: number | null
          employee_id: string
          end_date: string
          half_day_end?: boolean
          half_day_start?: boolean
          id?: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          leave_type_id?: string | null
          organization_id: string
          reason?: string | null
          review_comment?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["leave_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          attachment_url?: string | null
          comment?: string | null
          created_at?: string
          current_step?: number
          days_count?: number | null
          employee_id?: string
          end_date?: string
          half_day_end?: boolean
          half_day_start?: boolean
          id?: string
          leave_type?: Database["public"]["Enums"]["leave_type"]
          leave_type_id?: string | null
          organization_id?: string
          reason?: string | null
          review_comment?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["leave_status"]
          submitted_at?: string | null
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
            foreignKeyName: "leave_requests_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
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
      leave_types: {
        Row: {
          accrual_mode: string
          allows_carry_over: boolean
          annual_entitlement_days: number | null
          applicable_sexe: string | null
          carry_over_expires_months: number | null
          code: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          is_paid: boolean
          label: string
          legacy_enum: string | null
          max_duration_days: number | null
          organization_id: string
          requires_justification: boolean
          updated_at: string
        }
        Insert: {
          accrual_mode?: string
          allows_carry_over?: boolean
          annual_entitlement_days?: number | null
          applicable_sexe?: string | null
          carry_over_expires_months?: number | null
          code: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_paid?: boolean
          label: string
          legacy_enum?: string | null
          max_duration_days?: number | null
          organization_id: string
          requires_justification?: boolean
          updated_at?: string
        }
        Update: {
          accrual_mode?: string
          allows_carry_over?: boolean
          annual_entitlement_days?: number | null
          applicable_sexe?: string | null
          carry_over_expires_months?: number | null
          code?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_paid?: boolean
          label?: string
          legacy_enum?: string | null
          max_duration_days?: number | null
          organization_id?: string
          requires_justification?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      mission_participants: {
        Row: {
          created_at: string
          id: string
          mission_id: string
          organization_id: string
          profile_id: string
          role_in_mission: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          mission_id: string
          organization_id: string
          profile_id: string
          role_in_mission?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          mission_id?: string
          organization_id?: string
          profile_id?: string
          role_in_mission?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mission_participants_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_participants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      missions: {
        Row: {
          authorized_by: string | null
          city: string | null
          country: string | null
          created_at: string
          created_by: string | null
          destination: string | null
          end_date: string
          end_time: string | null
          id: string
          lead_profile_id: string | null
          observations: string | null
          organization_id: string
          place: string | null
          reference: string | null
          start_date: string
          start_time: string | null
          status: string
          subject: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          authorized_by?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          destination?: string | null
          end_date: string
          end_time?: string | null
          id?: string
          lead_profile_id?: string | null
          observations?: string | null
          organization_id: string
          place?: string | null
          reference?: string | null
          start_date: string
          start_time?: string | null
          status?: string
          subject: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          authorized_by?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          destination?: string | null
          end_date?: string
          end_time?: string | null
          id?: string
          lead_profile_id?: string | null
          observations?: string | null
          organization_id?: string
          place?: string | null
          reference?: string | null
          start_date?: string
          start_time?: string | null
          status?: string
          subject?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "missions_lead_profile_id_fkey"
            columns: ["lead_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missions_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "organizational_units"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          organization_id: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          organization_id: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          organization_id?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_documents: {
        Row: {
          category: string
          created_at: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          organization_id: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          category?: string
          created_at?: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          organization_id: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          category?: string
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          organization_id?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizational_units: {
        Row: {
          code: string | null
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          manager_profile_id: string | null
          name: string
          organization_id: string
          parent_id: string | null
          type: Database["public"]["Enums"]["unit_type"]
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          manager_profile_id?: string | null
          name: string
          organization_id: string
          parent_id?: string | null
          type: Database["public"]["Enums"]["unit_type"]
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          manager_profile_id?: string | null
          name?: string
          organization_id?: string
          parent_id?: string | null
          type?: Database["public"]["Enums"]["unit_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizational_units_manager_profile_id_fkey"
            columns: ["manager_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
          acronym: string | null
          address: string | null
          approval_status: string
          badge_border_style: string | null
          badge_footer_text: string | null
          badge_header_text: string | null
          badge_template: string | null
          badge_validity_months: number | null
          city: string | null
          country: string | null
          created_at: string
          custom_domain: string | null
          default_signer_name: string | null
          default_signer_title: string | null
          document_city: string | null
          document_header_text: string | null
          head_name: string | null
          head_title: string | null
          host_city: string | null
          host_country: string | null
          id: string
          institutional_email: string | null
          late_threshold_time: string
          leave_policy: Json
          letterhead_url: string | null
          logo_url: string | null
          max_units: number
          max_users: number
          name: string
          notes: string | null
          parent_organization_id: string | null
          pdf_font_size: number | null
          pdf_line_height: number | null
          pdf_margin: number | null
          pdf_vertical_align: string | null
          phone: string | null
          primary_color: string | null
          representation_type: string | null
          represented_country: string | null
          secondary_color: string | null
          subscription_expires_at: string | null
          subscription_started_at: string | null
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          type: Database["public"]["Enums"]["organization_type"]
          updated_at: string
          website: string | null
        }
        Insert: {
          accent_color?: string | null
          acronym?: string | null
          address?: string | null
          approval_status?: string
          badge_border_style?: string | null
          badge_footer_text?: string | null
          badge_header_text?: string | null
          badge_template?: string | null
          badge_validity_months?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          custom_domain?: string | null
          default_signer_name?: string | null
          default_signer_title?: string | null
          document_city?: string | null
          document_header_text?: string | null
          head_name?: string | null
          head_title?: string | null
          host_city?: string | null
          host_country?: string | null
          id?: string
          institutional_email?: string | null
          late_threshold_time?: string
          leave_policy?: Json
          letterhead_url?: string | null
          logo_url?: string | null
          max_units?: number
          max_users?: number
          name: string
          notes?: string | null
          parent_organization_id?: string | null
          pdf_font_size?: number | null
          pdf_line_height?: number | null
          pdf_margin?: number | null
          pdf_vertical_align?: string | null
          phone?: string | null
          primary_color?: string | null
          representation_type?: string | null
          represented_country?: string | null
          secondary_color?: string | null
          subscription_expires_at?: string | null
          subscription_started_at?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          type: Database["public"]["Enums"]["organization_type"]
          updated_at?: string
          website?: string | null
        }
        Update: {
          accent_color?: string | null
          acronym?: string | null
          address?: string | null
          approval_status?: string
          badge_border_style?: string | null
          badge_footer_text?: string | null
          badge_header_text?: string | null
          badge_template?: string | null
          badge_validity_months?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          custom_domain?: string | null
          default_signer_name?: string | null
          default_signer_title?: string | null
          document_city?: string | null
          document_header_text?: string | null
          head_name?: string | null
          head_title?: string | null
          host_city?: string | null
          host_country?: string | null
          id?: string
          institutional_email?: string | null
          late_threshold_time?: string
          leave_policy?: Json
          letterhead_url?: string | null
          logo_url?: string | null
          max_units?: number
          max_users?: number
          name?: string
          notes?: string | null
          parent_organization_id?: string | null
          pdf_font_size?: number | null
          pdf_line_height?: number | null
          pdf_margin?: number | null
          pdf_vertical_align?: string | null
          phone?: string | null
          primary_color?: string | null
          representation_type?: string | null
          represented_country?: string | null
          secondary_color?: string | null
          subscription_expires_at?: string | null
          subscription_started_at?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          type?: Database["public"]["Enums"]["organization_type"]
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_parent_organization_id_fkey"
            columns: ["parent_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_payments: {
        Row: {
          autres_retenues: number
          aval: number
          cas_fdu: number
          cfgdct: number
          code_employe: string | null
          confirmed_by: string | null
          created_at: string
          emargement_document_id: string | null
          id: string
          isr: number
          montant_brut: number
          montant_net: number
          nif: string | null
          no_cheque: string | null
          nom_complet: string
          notes: string | null
          organization_id: string
          payment_date: string | null
          payment_method: string | null
          payment_reference: string | null
          pension: number
          period: string
          poste: string | null
          profile_id: string | null
          remboursement: number
          status: string
          updated_at: string
        }
        Insert: {
          autres_retenues?: number
          aval?: number
          cas_fdu?: number
          cfgdct?: number
          code_employe?: string | null
          confirmed_by?: string | null
          created_at?: string
          emargement_document_id?: string | null
          id?: string
          isr?: number
          montant_brut?: number
          montant_net?: number
          nif?: string | null
          no_cheque?: string | null
          nom_complet: string
          notes?: string | null
          organization_id: string
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          pension?: number
          period: string
          poste?: string | null
          profile_id?: string | null
          remboursement?: number
          status?: string
          updated_at?: string
        }
        Update: {
          autres_retenues?: number
          aval?: number
          cas_fdu?: number
          cfgdct?: number
          code_employe?: string | null
          confirmed_by?: string | null
          created_at?: string
          emargement_document_id?: string | null
          id?: string
          isr?: number
          montant_brut?: number
          montant_net?: number
          nif?: string | null
          no_cheque?: string | null
          nom_complet?: string
          notes?: string | null
          organization_id?: string
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          pension?: number
          period?: string
          poste?: string | null
          profile_id?: string | null
          remboursement?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_payments_emargement_document_id_fkey"
            columns: ["emargement_document_id"]
            isOneToOne: false
            referencedRelation: "emargement_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_payments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pension_requests: {
        Row: {
          age_years: number | null
          comments: string | null
          created_at: string
          documents: Json
          dpc_reference: string | null
          drh_comment: string | null
          eligibility_notes: string | null
          employee_id: string
          id: string
          is_eligible: boolean | null
          organization_id: string
          request_date: string
          reviewed_at: string | null
          reviewed_by: string | null
          service_years: number | null
          status: Database["public"]["Enums"]["pension_request_status"]
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          age_years?: number | null
          comments?: string | null
          created_at?: string
          documents?: Json
          dpc_reference?: string | null
          drh_comment?: string | null
          eligibility_notes?: string | null
          employee_id: string
          id?: string
          is_eligible?: boolean | null
          organization_id: string
          request_date?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          service_years?: number | null
          status?: Database["public"]["Enums"]["pension_request_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          age_years?: number | null
          comments?: string | null
          created_at?: string
          documents?: Json
          dpc_reference?: string | null
          drh_comment?: string | null
          eligibility_notes?: string | null
          employee_id?: string
          id?: string
          is_eligible?: boolean | null
          organization_id?: string
          request_date?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          service_years?: number | null
          status?: Database["public"]["Enums"]["pension_request_status"]
          submitted_at?: string | null
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
          category_id: string | null
          code: string | null
          created_at: string
          description: string | null
          id: string
          is_template: boolean | null
          is_vacant: boolean
          level: string | null
          name: string
          notes: string | null
          organization_id: string | null
          reports_to_position_id: string | null
          responsibilities: string | null
          salary: number
          status: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_template?: boolean | null
          is_vacant?: boolean
          level?: string | null
          name: string
          notes?: string | null
          organization_id?: string | null
          reports_to_position_id?: string | null
          responsibilities?: string | null
          salary: number
          status?: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_template?: boolean | null
          is_vacant?: boolean
          level?: string | null
          name?: string
          notes?: string | null
          organization_id?: string | null
          reports_to_position_id?: string | null
          responsibilities?: string | null
          salary?: number
          status?: string
          unit_id?: string | null
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
          {
            foreignKeyName: "positions_reports_to_position_id_fkey"
            columns: ["reports_to_position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "positions_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "organizational_units"
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
          account_status: string
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
          invitation_expires_at: string | null
          invitation_sent_at: string | null
          invited_by: string | null
          lieu_naissance: string | null
          nationalite: string | null
          nif: string | null
          niveau_etudes: string | null
          nom: string | null
          organization_id: string | null
          photo_url: string | null
          position_id: string | null
          prenom: string | null
          professor_code_budgetaire: string | null
          professor_date_entree_fonction: string | null
          professor_grade: Database["public"]["Enums"]["professor_grade"] | null
          professor_salary: number | null
          profile_completed: boolean | null
          religion: string | null
          sexe: string | null
          tel_1: string | null
          tel_2: string | null
          unit_id: string | null
          updated_at: string
          user_id: string | null
          whatsapp: string | null
        }
        Insert: {
          account_status?: string
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
          invitation_expires_at?: string | null
          invitation_sent_at?: string | null
          invited_by?: string | null
          lieu_naissance?: string | null
          nationalite?: string | null
          nif?: string | null
          niveau_etudes?: string | null
          nom?: string | null
          organization_id?: string | null
          photo_url?: string | null
          position_id?: string | null
          prenom?: string | null
          professor_code_budgetaire?: string | null
          professor_date_entree_fonction?: string | null
          professor_grade?:
            | Database["public"]["Enums"]["professor_grade"]
            | null
          professor_salary?: number | null
          profile_completed?: boolean | null
          religion?: string | null
          sexe?: string | null
          tel_1?: string | null
          tel_2?: string | null
          unit_id?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          account_status?: string
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
          invitation_expires_at?: string | null
          invitation_sent_at?: string | null
          invited_by?: string | null
          lieu_naissance?: string | null
          nationalite?: string | null
          nif?: string | null
          niveau_etudes?: string | null
          nom?: string | null
          organization_id?: string | null
          photo_url?: string | null
          position_id?: string | null
          prenom?: string | null
          professor_code_budgetaire?: string | null
          professor_date_entree_fonction?: string | null
          professor_grade?:
            | Database["public"]["Enums"]["professor_grade"]
            | null
          professor_salary?: number | null
          profile_completed?: boolean | null
          religion?: string | null
          sexe?: string | null
          tel_1?: string | null
          tel_2?: string | null
          unit_id?: string | null
          updated_at?: string
          user_id?: string | null
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
      social_benefits_payments: {
        Row: {
          amount: number
          base_amount: number
          benefit_type: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          organization_id: string
          payment_date: string | null
          payment_method: string | null
          percentage: number | null
          period: string
          profile_id: string
          reference: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          base_amount?: number
          benefit_type: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          payment_date?: string | null
          payment_method?: string | null
          percentage?: number | null
          period: string
          profile_id: string
          reference?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          base_amount?: number
          benefit_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          payment_date?: string | null
          payment_method?: string | null
          percentage?: number | null
          period?: string
          profile_id?: string
          reference?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      social_benefits_settings: {
        Row: {
          created_at: string
          gratifications: Json
          organization_id: string
          ti_kat_enabled: boolean
          ti_kat_fixed_amount: number
          ti_kat_label: string
          ti_kat_percentage: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          gratifications?: Json
          organization_id: string
          ti_kat_enabled?: boolean
          ti_kat_fixed_amount?: number
          ti_kat_label?: string
          ti_kat_percentage?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          gratifications?: Json
          organization_id?: string
          ti_kat_enabled?: boolean
          ti_kat_fixed_amount?: number
          ti_kat_label?: string
          ti_kat_percentage?: number
          updated_at?: string
        }
        Relationships: []
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
      staff_assignments: {
        Row: {
          assignment_kind: string
          comment: string | null
          created_at: string
          created_by: string | null
          decision_reference: string | null
          end_date: string | null
          id: string
          is_current: boolean
          organization_id: string
          position_id: string | null
          profile_id: string
          start_date: string
          supervisor_profile_id: string | null
          unit_id: string | null
          updated_at: string
          workload_percentage: number | null
        }
        Insert: {
          assignment_kind?: string
          comment?: string | null
          created_at?: string
          created_by?: string | null
          decision_reference?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean
          organization_id: string
          position_id?: string | null
          profile_id: string
          start_date: string
          supervisor_profile_id?: string | null
          unit_id?: string | null
          updated_at?: string
          workload_percentage?: number | null
        }
        Update: {
          assignment_kind?: string
          comment?: string | null
          created_at?: string
          created_by?: string | null
          decision_reference?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean
          organization_id?: string
          position_id?: string | null
          profile_id?: string
          start_date?: string
          supervisor_profile_id?: string | null
          unit_id?: string | null
          updated_at?: string
          workload_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_assignments_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_assignments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_assignments_supervisor_profile_id_fkey"
            columns: ["supervisor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_assignments_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "organizational_units"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_movements: {
        Row: {
          assignment_id: string | null
          created_at: string
          created_by: string
          decision_reference: string | null
          effective_date: string
          employee_code: string | null
          employee_id: string
          employee_name: string
          from_category: string | null
          from_position: string | null
          from_unit: string | null
          id: string
          movement_type: string
          notes: string | null
          organization_id: string
          previous_assignment_id: string | null
          to_category: string | null
          to_position: string | null
          to_unit: string | null
          updated_at: string
        }
        Insert: {
          assignment_id?: string | null
          created_at?: string
          created_by: string
          decision_reference?: string | null
          effective_date: string
          employee_code?: string | null
          employee_id: string
          employee_name: string
          from_category?: string | null
          from_position?: string | null
          from_unit?: string | null
          id?: string
          movement_type: string
          notes?: string | null
          organization_id: string
          previous_assignment_id?: string | null
          to_category?: string | null
          to_position?: string | null
          to_unit?: string | null
          updated_at?: string
        }
        Update: {
          assignment_id?: string | null
          created_at?: string
          created_by?: string
          decision_reference?: string | null
          effective_date?: string
          employee_code?: string | null
          employee_id?: string
          employee_name?: string
          from_category?: string | null
          from_position?: string | null
          from_unit?: string | null
          id?: string
          movement_type?: string
          notes?: string | null
          organization_id?: string
          previous_assignment_id?: string | null
          to_category?: string | null
          to_position?: string | null
          to_unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_movements_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "staff_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_movements_previous_assignment_id_fkey"
            columns: ["previous_assignment_id"]
            isOneToOne: false
            referencedRelation: "staff_assignments"
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
      teacher_schedule_slots: {
        Row: {
          created_at: string
          created_by: string | null
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean
          organization_id: string
          profile_id: string
          start_time: string
          subject: string | null
          updated_at: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean
          organization_id: string
          profile_id: string
          start_time: string
          subject?: string | null
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean
          organization_id?: string
          profile_id?: string
          start_time?: string
          subject?: string | null
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: []
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
      work_schedules: {
        Row: {
          arrival_time: string
          break_end: string | null
          break_start: string | null
          created_at: string
          created_by: string | null
          departure_time: string
          id: string
          is_active: boolean
          name: string
          organization_id: string
          profile_id: string | null
          scope: string
          tolerance_minutes: number
          unit_id: string | null
          updated_at: string
          work_days: number[]
        }
        Insert: {
          arrival_time?: string
          break_end?: string | null
          break_start?: string | null
          created_at?: string
          created_by?: string | null
          departure_time?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id: string
          profile_id?: string | null
          scope?: string
          tolerance_minutes?: number
          unit_id?: string | null
          updated_at?: string
          work_days?: number[]
        }
        Update: {
          arrival_time?: string
          break_end?: string | null
          break_start?: string | null
          created_at?: string
          created_by?: string | null
          departure_time?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          profile_id?: string | null
          scope?: string
          tolerance_minutes?: number
          unit_id?: string | null
          updated_at?: string
          work_days?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "work_schedules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_schedules_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_schedules_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "organizational_units"
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
      check_previous_steps_approved: {
        Args: { _record_id: string; _step_order: number }
        Returns: boolean
      }
      check_unit_limit: { Args: { _organization_id: string }; Returns: boolean }
      check_user_limit: { Args: { _organization_id: string }; Returns: boolean }
      current_profile_id: { Args: { _user_id: string }; Returns: string }
      generate_correspondence_reference: {
        Args: {
          _category: string
          _document_type: string
          _organization_id: string
        }
        Returns: string
      }
      has_admin_role: {
        Args: { _organization_id: string; _user_id: string }
        Returns: boolean
      }
      has_hr_access: {
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
      hr_day_status: {
        Args: { _date: string; _profile_id: string }
        Returns: Json
      }
      hr_detect_conflicts: {
        Args: {
          _end: string
          _exclude_id?: string
          _profile_id: string
          _start: string
        }
        Returns: Json
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      storage_path_in_user_org: {
        Args: { _path: string; _user_id: string }
        Returns: boolean
      }
      user_in_organization: {
        Args: { _organization_id: string; _user_id: string }
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
        | "approbateur_conges"
        | "secretaire"
        | "secretaire_academique"
      application_status:
        | "pending"
        | "reviewing"
        | "shortlisted"
        | "interview"
        | "offered"
        | "accepted"
        | "rejected"
      correspondence_category:
        | "attestation_travail"
        | "certificat_travail"
        | "lettre_recommandation"
        | "note_service"
        | "decision"
        | "convocation"
        | "mise_en_demeure"
        | "avertissement"
        | "felicitations"
        | "autre"
        | "contrat_service"
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
      leave_status:
        | "pending"
        | "approved"
        | "rejected"
        | "cancelled"
        | "draft"
        | "in_review"
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
        | "institution_publique"
        | "ambassade"
        | "consulat_general"
        | "consulat"
        | "mission_permanente"
        | "mission_diplomatique"
        | "autre"
      pension_request_status:
        | "brouillon"
        | "soumis_drh"
        | "valide_drh"
        | "transmis_dpc"
        | "en_instruction"
        | "accordee"
        | "rejetee"
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
        | "cabinet"
        | "bureau"
        | "unite"
        | "autre"
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
        "secretaire",
        "secretaire_academique",
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
      correspondence_category: [
        "attestation_travail",
        "certificat_travail",
        "lettre_recommandation",
        "note_service",
        "decision",
        "convocation",
        "mise_en_demeure",
        "avertissement",
        "felicitations",
        "autre",
        "contrat_service",
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
      leave_status: [
        "pending",
        "approved",
        "rejected",
        "cancelled",
        "draft",
        "in_review",
      ],
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
        "institution_publique",
        "ambassade",
        "consulat_general",
        "consulat",
        "mission_permanente",
        "mission_diplomatique",
        "autre",
      ],
      pension_request_status: [
        "brouillon",
        "soumis_drh",
        "valide_drh",
        "transmis_dpc",
        "en_instruction",
        "accordee",
        "rejetee",
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
        "cabinet",
        "bureau",
        "unite",
        "autre",
      ],
    },
  },
} as const
