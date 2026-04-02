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
      agent_tasks: {
        Row: {
          completed_steps: string[] | null
          created_at: string | null
          current_step_index: number | null
          error_message: string | null
          failed_step: Json | null
          id: string
          input_payload: Json | null
          mode: string
          result_payload: Json | null
          status: string
          steps: Json
          success_message: string | null
          task_type: string
          team_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_steps?: string[] | null
          created_at?: string | null
          current_step_index?: number | null
          error_message?: string | null
          failed_step?: Json | null
          id?: string
          input_payload?: Json | null
          mode?: string
          result_payload?: Json | null
          status?: string
          steps?: Json
          success_message?: string | null
          task_type: string
          team_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_steps?: string[] | null
          created_at?: string | null
          current_step_index?: number | null
          error_message?: string | null
          failed_step?: Json | null
          id?: string
          input_payload?: Json | null
          mode?: string
          result_payload?: Json | null
          status?: string
          steps?: Json
          success_message?: string | null
          task_type?: string
          team_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_action_audit: {
        Row: {
          action_id: string
          command_text: string
          confirmation_required: boolean | null
          confirmation_result: string | null
          conversation_id: string | null
          created_at: string
          entities: Json | null
          id: string
          intent: string
          intent_label: string
          memory_resolution_log: Json | null
          output_record_id: string | null
          output_type: string | null
          status: string
          steps: Json | null
          team_id: string
          user_id: string
        }
        Insert: {
          action_id: string
          command_text: string
          confirmation_required?: boolean | null
          confirmation_result?: string | null
          conversation_id?: string | null
          created_at?: string
          entities?: Json | null
          id?: string
          intent: string
          intent_label: string
          memory_resolution_log?: Json | null
          output_record_id?: string | null
          output_type?: string | null
          status?: string
          steps?: Json | null
          team_id: string
          user_id: string
        }
        Update: {
          action_id?: string
          command_text?: string
          confirmation_required?: boolean | null
          confirmation_result?: string | null
          conversation_id?: string | null
          created_at?: string
          entities?: Json | null
          id?: string
          intent?: string
          intent_label?: string
          memory_resolution_log?: Json | null
          output_record_id?: string | null
          output_type?: string | null
          status?: string
          steps?: Json | null
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_action_audit_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_action_audit_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: []
      }
      ai_user_memory: {
        Row: {
          category: string
          confidence: number | null
          created_at: string | null
          id: string
          key: string
          last_referenced_at: string | null
          source: string | null
          updated_at: string | null
          user_id: string
          value: string
        }
        Insert: {
          category: string
          confidence?: number | null
          created_at?: string | null
          id?: string
          key: string
          last_referenced_at?: string | null
          source?: string | null
          updated_at?: string | null
          user_id: string
          value: string
        }
        Update: {
          category?: string
          confidence?: number | null
          created_at?: string | null
          id?: string
          key?: string
          last_referenced_at?: string | null
          source?: string | null
          updated_at?: string | null
          user_id?: string
          value?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string
          event_name: string
          id: string
          page_url: string | null
          properties: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: string
          page_url?: string | null
          properties?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: string
          page_url?: string | null
          properties?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      burned_accounts: {
        Row: {
          deleted_at: string
          email: string
          id: string
          is_hashed: boolean
          phone: string | null
          reason: string
          referral_code: string | null
          signup_ip: string | null
          stripe_customer_id: string | null
        }
        Insert: {
          deleted_at?: string
          email: string
          id?: string
          is_hashed?: boolean
          phone?: string | null
          reason?: string
          referral_code?: string | null
          signup_ip?: string | null
          stripe_customer_id?: string | null
        }
        Update: {
          deleted_at?: string
          email?: string
          id?: string
          is_hashed?: boolean
          phone?: string | null
          reason?: string
          referral_code?: string | null
          signup_ip?: string | null
          stripe_customer_id?: string | null
        }
        Relationships: []
      }
      cancellation_reasons: {
        Row: {
          created_at: string | null
          detail: string | null
          id: string
          org_id: string
          reason: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          detail?: string | null
          id?: string
          org_id: string
          reason: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          detail?: string | null
          id?: string
          org_id?: string
          reason?: string
          user_id?: string | null
        }
        Relationships: []
      }
      certificates: {
        Row: {
          certificate_data: Json | null
          certificate_number: string
          certificate_type: Database["public"]["Enums"]["certificate_type"]
          created_at: string
          created_by: string | null
          customer_id: string
          expiry_date: string | null
          id: string
          inspector_name: string
          inspector_registration: string | null
          inspector_signature_url: string | null
          issue_date: string
          job_id: string | null
          next_inspection_date: string | null
          pdf_url: string | null
          property_address: string
          property_city: string | null
          property_country: string | null
          property_country_iso2: string | null
          property_line1: string | null
          property_line2: string | null
          property_postal_code: string | null
          property_region: string | null
          property_type: string | null
          status: Database["public"]["Enums"]["certificate_status"]
          team_id: string
          updated_at: string
        }
        Insert: {
          certificate_data?: Json | null
          certificate_number: string
          certificate_type: Database["public"]["Enums"]["certificate_type"]
          created_at?: string
          created_by?: string | null
          customer_id: string
          expiry_date?: string | null
          id?: string
          inspector_name: string
          inspector_registration?: string | null
          inspector_signature_url?: string | null
          issue_date?: string
          job_id?: string | null
          next_inspection_date?: string | null
          pdf_url?: string | null
          property_address: string
          property_city?: string | null
          property_country?: string | null
          property_country_iso2?: string | null
          property_line1?: string | null
          property_line2?: string | null
          property_postal_code?: string | null
          property_region?: string | null
          property_type?: string | null
          status?: Database["public"]["Enums"]["certificate_status"]
          team_id: string
          updated_at?: string
        }
        Update: {
          certificate_data?: Json | null
          certificate_number?: string
          certificate_type?: Database["public"]["Enums"]["certificate_type"]
          created_at?: string
          created_by?: string | null
          customer_id?: string
          expiry_date?: string | null
          id?: string
          inspector_name?: string
          inspector_registration?: string | null
          inspector_signature_url?: string | null
          issue_date?: string
          job_id?: string | null
          next_inspection_date?: string | null
          pdf_url?: string | null
          property_address?: string
          property_city?: string | null
          property_country?: string | null
          property_country_iso2?: string | null
          property_line1?: string | null
          property_line2?: string | null
          property_postal_code?: string | null
          property_region?: string | null
          property_type?: string | null
          status?: Database["public"]["Enums"]["certificate_status"]
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_job_profitability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_jobs_at_risk"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_segment_jobs_at_risk"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "certificates_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      churn_events: {
        Row: {
          created_at: string
          email_sent: boolean
          event_type: string
          id: string
          sent_at: string | null
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_sent?: boolean
          event_type?: string
          id?: string
          sent_at?: string | null
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_sent?: boolean
          event_type?: string
          id?: string
          sent_at?: string | null
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "churn_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "churn_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      comms_audit_log: {
        Row: {
          allowed: boolean
          attempted_at: string
          blocked_reason: string | null
          channel: string
          confirmed_by_user: boolean
          id: string
          manual_send: boolean
          metadata: Json | null
          recipient: string | null
          record_id: string | null
          record_type: string | null
          source_screen: string | null
          team_id: string | null
          template: string | null
          user_id: string | null
        }
        Insert: {
          allowed?: boolean
          attempted_at?: string
          blocked_reason?: string | null
          channel?: string
          confirmed_by_user?: boolean
          id?: string
          manual_send?: boolean
          metadata?: Json | null
          recipient?: string | null
          record_id?: string | null
          record_type?: string | null
          source_screen?: string | null
          team_id?: string | null
          template?: string | null
          user_id?: string | null
        }
        Update: {
          allowed?: boolean
          attempted_at?: string
          blocked_reason?: string | null
          channel?: string
          confirmed_by_user?: boolean
          id?: string
          manual_send?: boolean
          metadata?: Json | null
          recipient?: string | null
          record_id?: string | null
          record_type?: string | null
          source_screen?: string | null
          team_id?: string | null
          template?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      comms_queue: {
        Row: {
          cancelled: boolean
          channel: string
          created_at: string
          customer_id: string
          followup_count: number | null
          id: string
          job_id: string | null
          metadata: Json | null
          quote_id: string | null
          scheduled_for: string
          sent: boolean
          sent_at: string | null
          team_id: string
          template_key: string
        }
        Insert: {
          cancelled?: boolean
          channel?: string
          created_at?: string
          customer_id: string
          followup_count?: number | null
          id?: string
          job_id?: string | null
          metadata?: Json | null
          quote_id?: string | null
          scheduled_for: string
          sent?: boolean
          sent_at?: string | null
          team_id: string
          template_key: string
        }
        Update: {
          cancelled?: boolean
          channel?: string
          created_at?: string
          customer_id?: string
          followup_count?: number | null
          id?: string
          job_id?: string | null
          metadata?: Json | null
          quote_id?: string | null
          scheduled_for?: string
          sent?: boolean
          sent_at?: string | null
          team_id?: string
          template_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "comms_queue_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comms_queue_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comms_queue_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_job_profitability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comms_queue_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_jobs_at_risk"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comms_queue_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_segment_jobs_at_risk"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "comms_queue_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comms_queue_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comms_queue_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      comms_settings: {
        Row: {
          created_at: string
          enquiry_ack_enabled: boolean | null
          id: string
          invoice_reminder_days: number
          invoice_reminder_enabled: boolean
          job_complete_enabled: boolean
          job_complete_hours: number
          on_my_way_enabled: boolean
          payment_receipt_enabled: boolean
          quote_followup_days: number
          quote_followup_enabled: boolean
          require_confirmation_all_comms: boolean
          review_request_enabled: boolean | null
          review_request_hours: number | null
          team_id: string
          updated_at: string
          visit_reminder_enabled: boolean
          visit_reminder_hours: number
        }
        Insert: {
          created_at?: string
          enquiry_ack_enabled?: boolean | null
          id?: string
          invoice_reminder_days?: number
          invoice_reminder_enabled?: boolean
          job_complete_enabled?: boolean
          job_complete_hours?: number
          on_my_way_enabled?: boolean
          payment_receipt_enabled?: boolean
          quote_followup_days?: number
          quote_followup_enabled?: boolean
          require_confirmation_all_comms?: boolean
          review_request_enabled?: boolean | null
          review_request_hours?: number | null
          team_id: string
          updated_at?: string
          visit_reminder_enabled?: boolean
          visit_reminder_hours?: number
        }
        Update: {
          created_at?: string
          enquiry_ack_enabled?: boolean | null
          id?: string
          invoice_reminder_days?: number
          invoice_reminder_enabled?: boolean
          job_complete_enabled?: boolean
          job_complete_hours?: number
          on_my_way_enabled?: boolean
          payment_receipt_enabled?: boolean
          quote_followup_days?: number
          quote_followup_enabled?: boolean
          require_confirmation_all_comms?: boolean
          review_request_enabled?: boolean | null
          review_request_hours?: number | null
          team_id?: string
          updated_at?: string
          visit_reminder_enabled?: boolean
          visit_reminder_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "comms_settings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comms_settings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      company_branding: {
        Row: {
          accent_color: string | null
          bank_details: string | null
          company_address: string | null
          company_city: string | null
          company_country: string | null
          company_country_iso2: string | null
          company_email: string | null
          company_line1: string | null
          company_line2: string | null
          company_name: string | null
          company_phone: string | null
          company_postal_code: string | null
          company_region: string | null
          company_website: string | null
          created_at: string
          footer_message: string | null
          google_review_url: string | null
          id: string
          invoice_custom_sections: Json | null
          invoice_overdue_notice: string | null
          invoice_payment_instructions: string | null
          logo_url: string | null
          payment_terms: string | null
          pdf_style: string
          quote_custom_sections: Json | null
          quote_intro_text: string | null
          quote_show_cover_page: boolean
          quote_validity_note: string | null
          show_logo: boolean | null
          team_id: string
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          bank_details?: string | null
          company_address?: string | null
          company_city?: string | null
          company_country?: string | null
          company_country_iso2?: string | null
          company_email?: string | null
          company_line1?: string | null
          company_line2?: string | null
          company_name?: string | null
          company_phone?: string | null
          company_postal_code?: string | null
          company_region?: string | null
          company_website?: string | null
          created_at?: string
          footer_message?: string | null
          google_review_url?: string | null
          id?: string
          invoice_custom_sections?: Json | null
          invoice_overdue_notice?: string | null
          invoice_payment_instructions?: string | null
          logo_url?: string | null
          payment_terms?: string | null
          pdf_style?: string
          quote_custom_sections?: Json | null
          quote_intro_text?: string | null
          quote_show_cover_page?: boolean
          quote_validity_note?: string | null
          show_logo?: boolean | null
          team_id: string
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          bank_details?: string | null
          company_address?: string | null
          company_city?: string | null
          company_country?: string | null
          company_country_iso2?: string | null
          company_email?: string | null
          company_line1?: string | null
          company_line2?: string | null
          company_name?: string | null
          company_phone?: string | null
          company_postal_code?: string | null
          company_region?: string | null
          company_website?: string | null
          created_at?: string
          footer_message?: string | null
          google_review_url?: string | null
          id?: string
          invoice_custom_sections?: Json | null
          invoice_overdue_notice?: string | null
          invoice_payment_instructions?: string | null
          logo_url?: string | null
          payment_terms?: string | null
          pdf_style?: string
          quote_custom_sections?: Json | null
          quote_intro_text?: string | null
          quote_show_cover_page?: boolean
          quote_validity_note?: string | null
          show_logo?: boolean | null
          team_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      cost_tracking: {
        Row: {
          created_at: string | null
          id: string
          period_end: string
          period_start: string
          profit_margin: number | null
          team_id: string
          voice_cost_estimate: number | null
          voice_minutes_used: number | null
          voice_revenue: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          period_end: string
          period_start: string
          profit_margin?: number | null
          team_id: string
          voice_cost_estimate?: number | null
          voice_minutes_used?: number | null
          voice_revenue?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          period_end?: string
          period_start?: string
          profit_margin?: number | null
          team_id?: string
          voice_cost_estimate?: number | null
          voice_minutes_used?: number | null
          voice_revenue?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_tracking_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_tracking_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      currency_rates: {
        Row: {
          created_at: string
          currency_code: string
          id: string
          rate_from_eur: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency_code: string
          id?: string
          rate_from_eur?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency_code?: string
          id?: string
          rate_from_eur?: number
          updated_at?: string
        }
        Relationships: []
      }
      customer_accounts: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_accounts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_addresses: {
        Row: {
          address: string
          city: string | null
          country: string | null
          country_code: string | null
          country_iso2: string | null
          created_at: string
          customer_id: string
          id: string
          is_default: boolean
          label: string
          latitude: number | null
          line1: string | null
          line2: string | null
          longitude: number | null
          notes: string | null
          postal_code: string | null
          postcode: string | null
          region: string | null
          team_id: string
          updated_at: string
        }
        Insert: {
          address: string
          city?: string | null
          country?: string | null
          country_code?: string | null
          country_iso2?: string | null
          created_at?: string
          customer_id: string
          id?: string
          is_default?: boolean
          label?: string
          latitude?: number | null
          line1?: string | null
          line2?: string | null
          longitude?: number | null
          notes?: string | null
          postal_code?: string | null
          postcode?: string | null
          region?: string | null
          team_id: string
          updated_at?: string
        }
        Update: {
          address?: string
          city?: string | null
          country?: string | null
          country_code?: string | null
          country_iso2?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          is_default?: boolean
          label?: string
          latitude?: number | null
          line1?: string | null
          line2?: string | null
          longitude?: number | null
          notes?: string | null
          postal_code?: string | null
          postcode?: string | null
          region?: string | null
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_addresses_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_addresses_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_payment_scores: {
        Row: {
          avg_days_late: number
          avg_days_to_pay: number
          customer_id: string
          id: string
          last_computed_at: string
          late_payments_count: number
          team_id: string
          total_invoices_paid: number
        }
        Insert: {
          avg_days_late?: number
          avg_days_to_pay?: number
          customer_id: string
          id?: string
          last_computed_at?: string
          late_payments_count?: number
          team_id: string
          total_invoices_paid?: number
        }
        Update: {
          avg_days_late?: number
          avg_days_to_pay?: number
          customer_id?: string
          id?: string
          last_computed_at?: string
          late_payments_count?: number
          team_id?: string
          total_invoices_paid?: number
        }
        Relationships: [
          {
            foreignKeyName: "customer_payment_scores_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_payment_scores_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_payment_scores_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          city: string | null
          client_number: number
          contact_person: string | null
          country: string | null
          country_code: string | null
          country_iso2: string | null
          created_at: string
          email: string | null
          id: string
          latitude: number | null
          line1: string | null
          line2: string | null
          longitude: number | null
          name: string
          notes: string | null
          phone: string | null
          postal_code: string | null
          postcode: string | null
          preferred_contact: string | null
          region: string | null
          team_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          client_number?: number
          contact_person?: string | null
          country?: string | null
          country_code?: string | null
          country_iso2?: string | null
          created_at?: string
          email?: string | null
          id?: string
          latitude?: number | null
          line1?: string | null
          line2?: string | null
          longitude?: number | null
          name: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          postcode?: string | null
          preferred_contact?: string | null
          region?: string | null
          team_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          client_number?: number
          contact_person?: string | null
          country?: string | null
          country_code?: string | null
          country_iso2?: string | null
          created_at?: string
          email?: string | null
          id?: string
          latitude?: number | null
          line1?: string | null
          line2?: string | null
          longitude?: number | null
          name?: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          postcode?: string | null
          preferred_contact?: string | null
          region?: string | null
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_layouts: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          layout_json: Json
          name: string
          team_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          layout_json?: Json
          name?: string
          team_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          layout_json?: Json
          name?: string
          team_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_layouts_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dashboard_layouts_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      drip_queue: {
        Row: {
          created_at: string
          drip_step: number
          email: string
          full_name: string | null
          id: string
          send_at: string
          sent: boolean
          sent_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          drip_step: number
          email: string
          full_name?: string | null
          id?: string
          send_at: string
          sent?: boolean
          sent_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          drip_step?: number
          email?: string
          full_name?: string | null
          id?: string
          send_at?: string
          sent?: boolean
          sent_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      drip_sequences: {
        Row: {
          drip_step: number
          email: string
          id: string
          sent_at: string
          user_id: string
        }
        Insert: {
          drip_step: number
          email: string
          id?: string
          sent_at?: string
          user_id: string
        }
        Update: {
          drip_step?: number
          email?: string
          id?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: []
      }
      early_access_requests: {
        Row: {
          company_name: string
          contact_name: string
          country: string | null
          created_at: string
          email: string
          id: string
          invited_at: string | null
          message: string | null
          notes: string | null
          phone: string | null
          source: string
          status: string
          team_size: string | null
          trade_type: string | null
          updated_at: string
        }
        Insert: {
          company_name: string
          contact_name: string
          country?: string | null
          created_at?: string
          email: string
          id?: string
          invited_at?: string | null
          message?: string | null
          notes?: string | null
          phone?: string | null
          source?: string
          status?: string
          team_size?: string | null
          trade_type?: string | null
          updated_at?: string
        }
        Update: {
          company_name?: string
          contact_name?: string
          country?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_at?: string | null
          message?: string | null
          notes?: string | null
          phone?: string | null
          source?: string
          status?: string
          team_size?: string | null
          trade_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          created_by: string | null
          description: string
          expense_date: string
          id: string
          job_id: string | null
          notes: string | null
          receipt_url: string | null
          team_id: string
          updated_at: string
          vat_amount: number | null
          vendor: string | null
        }
        Insert: {
          amount: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          created_by?: string | null
          description: string
          expense_date?: string
          id?: string
          job_id?: string | null
          notes?: string | null
          receipt_url?: string | null
          team_id: string
          updated_at?: string
          vat_amount?: number | null
          vendor?: string | null
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          created_by?: string | null
          description?: string
          expense_date?: string
          id?: string
          job_id?: string | null
          notes?: string | null
          receipt_url?: string | null
          team_id?: string
          updated_at?: string
          vat_amount?: number | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_job_profitability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_jobs_at_risk"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_segment_jobs_at_risk"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "expenses_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      foreman_ai_preferences: {
        Row: {
          always_create_drafts: boolean
          created_at: string
          default_payment_terms_days: number
          default_tax_rate: number | null
          id: string
          itemised_format: boolean
          labour_materials_split: boolean
          require_confirmation_before_send: boolean
          team_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          always_create_drafts?: boolean
          created_at?: string
          default_payment_terms_days?: number
          default_tax_rate?: number | null
          id?: string
          itemised_format?: boolean
          labour_materials_split?: boolean
          require_confirmation_before_send?: boolean
          team_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          always_create_drafts?: boolean
          created_at?: string
          default_payment_terms_days?: number
          default_tax_rate?: number | null
          id?: string
          itemised_format?: boolean
          labour_materials_split?: boolean
          require_confirmation_before_send?: boolean
          team_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "foreman_ai_preferences_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "foreman_ai_preferences_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_marketing_assets: {
        Row: {
          category: Database["public"]["Enums"]["creatify_category"]
          created_at: string
          id: string
          image_url: string
          prompt: string
          team_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["creatify_category"]
          created_at?: string
          id?: string
          image_url: string
          prompt: string
          team_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["creatify_category"]
          created_at?: string
          id?: string
          image_url?: string
          prompt?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_marketing_assets_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_marketing_assets_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      geofence_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          job_site_id: string | null
          latitude: number | null
          longitude: number | null
          recorded_at: string
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          job_site_id?: string | null
          latitude?: number | null
          longitude?: number | null
          recorded_at: string
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          job_site_id?: string | null
          latitude?: number | null
          longitude?: number | null
          recorded_at?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "geofence_events_job_site_id_fkey"
            columns: ["job_site_id"]
            isOneToOne: false
            referencedRelation: "job_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geofence_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geofence_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      george_conversations: {
        Row: {
          created_at: string
          id: string
          project_id: string | null
          team_id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id?: string | null
          team_id: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string | null
          team_id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "george_conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "george_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "george_conversations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "george_conversations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      george_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "george_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "george_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      george_projects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "george_projects_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "george_projects_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      george_usage_log: {
        Row: {
          conversation_id: string | null
          cost_estimate: number | null
          created_at: string | null
          credits_used: number | null
          duration_seconds: number
          id: string
          skill_used: string | null
          team_id: string
          usage_type: string | null
          user_id: string
        }
        Insert: {
          conversation_id?: string | null
          cost_estimate?: number | null
          created_at?: string | null
          credits_used?: number | null
          duration_seconds?: number
          id?: string
          skill_used?: string | null
          team_id: string
          usage_type?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string | null
          cost_estimate?: number | null
          created_at?: string | null
          credits_used?: number | null
          duration_seconds?: number
          id?: string
          skill_used?: string | null
          team_id?: string
          usage_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "george_usage_log_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "george_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "george_usage_log_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "george_usage_log_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      george_usage_snapshots: {
        Row: {
          created_at: string
          george_voice_seats: number
          id: string
          minutes_limit: number
          minutes_used: number
          period_end: string
          period_start: string
          rollover_minutes: number
          team_id: string
        }
        Insert: {
          created_at?: string
          george_voice_seats?: number
          id?: string
          minutes_limit?: number
          minutes_used?: number
          period_end: string
          period_start: string
          rollover_minutes?: number
          team_id: string
        }
        Update: {
          created_at?: string
          george_voice_seats?: number
          id?: string
          minutes_limit?: number
          minutes_used?: number
          period_end?: string
          period_start?: string
          rollover_minutes?: number
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "george_usage_snapshots_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "george_usage_snapshots_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          quantity: number
          tax_rate: number | null
          total_price: number | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          quantity?: number
          tax_rate?: number | null
          total_price?: number | null
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
          tax_rate?: number | null
          total_price?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_invoice_balances"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          balance_due: number | null
          communication_suppressed: boolean
          created_at: string
          currency: string
          customer_id: string
          delivery_status: string
          discount_type: string
          discount_value: number
          display_number: string
          due_date: string
          id: string
          issue_date: string
          job_id: string | null
          notes: string | null
          portal_token: string | null
          quote_id: string | null
          ref: string
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number | null
          tax_amount: number | null
          tax_rate: number | null
          team_id: string
          total: number | null
          updated_at: string
        }
        Insert: {
          balance_due?: number | null
          communication_suppressed?: boolean
          created_at?: string
          currency?: string
          customer_id: string
          delivery_status?: string
          discount_type?: string
          discount_value?: number
          display_number?: string
          due_date?: string
          id?: string
          issue_date?: string
          job_id?: string | null
          notes?: string | null
          portal_token?: string | null
          quote_id?: string | null
          ref?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          team_id: string
          total?: number | null
          updated_at?: string
        }
        Update: {
          balance_due?: number | null
          communication_suppressed?: boolean
          created_at?: string
          currency?: string
          customer_id?: string
          delivery_status?: string
          discount_type?: string
          discount_value?: number
          display_number?: string
          due_date?: string
          id?: string
          issue_date?: string
          job_id?: string | null
          notes?: string | null
          portal_token?: string | null
          quote_id?: string | null
          ref?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          team_id?: string
          total?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_job_profitability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_jobs_at_risk"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_segment_jobs_at_risk"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "invoices_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      job_materials: {
        Row: {
          created_at: string
          description: string
          id: string
          job_id: string
          quantity: number
          team_id: string
          total: number | null
          unit_cost: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          job_id: string
          quantity?: number
          team_id: string
          total?: number | null
          unit_cost?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          job_id?: string
          quantity?: number
          team_id?: string
          total?: number | null
          unit_cost?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "job_materials_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_materials_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_job_profitability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_materials_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_jobs_at_risk"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_materials_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_segment_jobs_at_risk"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "job_materials_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_materials_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      job_photos: {
        Row: {
          caption: string | null
          id: string
          job_id: string
          photo_url: string
          team_id: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          caption?: string | null
          id?: string
          job_id: string
          photo_url: string
          team_id: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          caption?: string | null
          id?: string
          job_id?: string
          photo_url?: string
          team_id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_photos_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_photos_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_job_profitability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_photos_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_jobs_at_risk"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_photos_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_segment_jobs_at_risk"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "job_photos_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_photos_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      job_reminders: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          job_id: string
          remind_at: string
          reminder_type: string
          sent: boolean
          sent_at: string | null
          team_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          job_id: string
          remind_at: string
          reminder_type?: string
          sent?: boolean
          sent_at?: string | null
          team_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          job_id?: string
          remind_at?: string
          reminder_type?: string
          sent?: boolean
          sent_at?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_reminders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_reminders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_reminders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_job_profitability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_reminders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_jobs_at_risk"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_reminders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_segment_jobs_at_risk"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "job_reminders_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_reminders_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      job_sites: {
        Row: {
          address: string
          city: string | null
          country: string | null
          country_iso2: string | null
          created_at: string | null
          customer_id: string
          geocode_source: string | null
          geofence_radius: number | null
          id: string
          job_id: string
          latitude: number
          line1: string | null
          line2: string | null
          location_confidence: string
          location_valid_for_gps: boolean
          longitude: number
          postal_code: string | null
          region: string | null
          team_id: string
          updated_at: string | null
        }
        Insert: {
          address: string
          city?: string | null
          country?: string | null
          country_iso2?: string | null
          created_at?: string | null
          customer_id: string
          geocode_source?: string | null
          geofence_radius?: number | null
          id?: string
          job_id: string
          latitude: number
          line1?: string | null
          line2?: string | null
          location_confidence?: string
          location_valid_for_gps?: boolean
          longitude: number
          postal_code?: string | null
          region?: string | null
          team_id: string
          updated_at?: string | null
        }
        Update: {
          address?: string
          city?: string | null
          country?: string | null
          country_iso2?: string | null
          created_at?: string | null
          customer_id?: string
          geocode_source?: string | null
          geofence_radius?: number | null
          id?: string
          job_id?: string
          latitude?: number
          line1?: string | null
          line2?: string | null
          location_confidence?: string
          location_valid_for_gps?: boolean
          longitude?: number
          postal_code?: string | null
          region?: string | null
          team_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_sites_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_sites_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_sites_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "v_job_profitability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_sites_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "v_jobs_at_risk"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_sites_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "v_segment_jobs_at_risk"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "job_sites_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_sites_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      job_status_changes: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          job_id: string
          new_status: string
          old_status: string | null
          team_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          job_id: string
          new_status: string
          old_status?: string | null
          team_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          job_id?: string
          new_status?: string
          old_status?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_status_changes_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_status_changes_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_job_profitability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_status_changes_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_jobs_at_risk"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_status_changes_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_segment_jobs_at_risk"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "job_status_changes_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_status_changes_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      job_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          from_status: Database["public"]["Enums"]["job_status"] | null
          id: string
          job_id: string
          team_id: string
          to_status: Database["public"]["Enums"]["job_status"]
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          from_status?: Database["public"]["Enums"]["job_status"] | null
          id?: string
          job_id: string
          team_id: string
          to_status: Database["public"]["Enums"]["job_status"]
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          from_status?: Database["public"]["Enums"]["job_status"] | null
          id?: string
          job_id?: string
          team_id?: string
          to_status?: Database["public"]["Enums"]["job_status"]
        }
        Relationships: [
          {
            foreignKeyName: "job_status_history_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_status_history_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_job_profitability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_status_history_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_jobs_at_risk"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_status_history_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_segment_jobs_at_risk"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "job_status_history_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_status_history_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          actual_cost: number | null
          assigned_to: string | null
          created_at: string
          customer_id: string
          description: string | null
          estimated_value: number | null
          id: string
          labour_cost: number | null
          latitude: number | null
          longitude: number | null
          materials_cost: number | null
          quote_id: string | null
          recurring_job_id: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          status: Database["public"]["Enums"]["job_status"]
          team_id: string
          title: string
          updated_at: string
        }
        Insert: {
          actual_cost?: number | null
          assigned_to?: string | null
          created_at?: string
          customer_id: string
          description?: string | null
          estimated_value?: number | null
          id?: string
          labour_cost?: number | null
          latitude?: number | null
          longitude?: number | null
          materials_cost?: number | null
          quote_id?: string | null
          recurring_job_id?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          team_id: string
          title: string
          updated_at?: string
        }
        Update: {
          actual_cost?: number | null
          assigned_to?: string | null
          created_at?: string
          customer_id?: string
          description?: string | null
          estimated_value?: number | null
          id?: string
          labour_cost?: number | null
          latitude?: number | null
          longitude?: number | null
          materials_cost?: number | null
          quote_id?: string | null
          recurring_job_id?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          team_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_recurring_job_id_fkey"
            columns: ["recurring_job_id"]
            isOneToOne: false
            referencedRelation: "recurring_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          country_iso2: string | null
          created_at: string
          customer_id: string | null
          description: string | null
          email: string | null
          estimated_value: number | null
          follow_up_date: string | null
          id: string
          job_id: string | null
          job_type: string | null
          line1: string | null
          line2: string | null
          name: string
          notes: string | null
          phone: string | null
          postal_code: string | null
          priority: string | null
          quote_id: string | null
          region: string | null
          source: string | null
          status: string
          team_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          country_iso2?: string | null
          created_at?: string
          customer_id?: string | null
          description?: string | null
          email?: string | null
          estimated_value?: number | null
          follow_up_date?: string | null
          id?: string
          job_id?: string | null
          job_type?: string | null
          line1?: string | null
          line2?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          priority?: string | null
          quote_id?: string | null
          region?: string | null
          source?: string | null
          status?: string
          team_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          country_iso2?: string | null
          created_at?: string
          customer_id?: string | null
          description?: string | null
          email?: string | null
          estimated_value?: number | null
          follow_up_date?: string | null
          id?: string
          job_id?: string | null
          job_type?: string | null
          line1?: string | null
          line2?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          priority?: string | null
          quote_id?: string | null
          region?: string | null
          source?: string | null
          status?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_job_profitability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_jobs_at_risk"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_segment_jobs_at_risk"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "leads_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      location_pings: {
        Row: {
          accuracy: number | null
          activity_type: string | null
          battery_level: number | null
          id: string
          is_moving: boolean | null
          latitude: number
          longitude: number
          recorded_at: string
          synced_at: string | null
          team_id: string
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          activity_type?: string | null
          battery_level?: number | null
          id?: string
          is_moving?: boolean | null
          latitude: number
          longitude: number
          recorded_at: string
          synced_at?: string | null
          team_id: string
          user_id: string
        }
        Update: {
          accuracy?: number | null
          activity_type?: string | null
          battery_level?: number | null
          id?: string
          is_moving?: boolean | null
          latitude?: number
          longitude?: number
          recorded_at?: string
          synced_at?: string | null
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_pings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_pings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      materials_catalog: {
        Row: {
          category: string | null
          created_at: string
          default_markup_pct: number
          id: string
          is_active: boolean
          name: string
          sku: string | null
          supplier: string | null
          team_id: string
          unit: string
          unit_cost: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          default_markup_pct?: number
          id?: string
          is_active?: boolean
          name: string
          sku?: string | null
          supplier?: string | null
          team_id: string
          unit?: string
          unit_cost?: number
          unit_price?: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          default_markup_pct?: number
          id?: string
          is_active?: boolean
          name?: string
          sku?: string | null
          supplier?: string | null
          team_id?: string
          unit?: string
          unit_cost?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_catalog_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_catalog_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      mileage_logs: {
        Row: {
          created_at: string
          distance_km: number
          end_latitude: number | null
          end_longitude: number | null
          id: string
          job_id: string | null
          recorded_at: string
          start_latitude: number | null
          start_longitude: number | null
          team_id: string
          time_entry_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          distance_km?: number
          end_latitude?: number | null
          end_longitude?: number | null
          id?: string
          job_id?: string | null
          recorded_at?: string
          start_latitude?: number | null
          start_longitude?: number | null
          team_id: string
          time_entry_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          distance_km?: number
          end_latitude?: number | null
          end_longitude?: number | null
          id?: string
          job_id?: string | null
          recorded_at?: string
          start_latitude?: number | null
          start_longitude?: number | null
          team_id?: string
          time_entry_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mileage_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mileage_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_job_profitability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mileage_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_jobs_at_risk"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mileage_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_segment_jobs_at_risk"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "mileage_logs_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mileage_logs_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mileage_logs_time_entry_id_fkey"
            columns: ["time_entry_id"]
            isOneToOne: false
            referencedRelation: "time_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      mileage_rates: {
        Row: {
          currency: string
          id: string
          rate_per_km: number
          team_id: string
          updated_at: string
        }
        Insert: {
          currency?: string
          id?: string
          rate_per_km?: number
          team_id: string
          updated_at?: string
        }
        Update: {
          currency?: string
          id?: string
          rate_per_km?: number
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mileage_rates_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mileage_rates_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "teams"
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
          team_id: string
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          team_id: string
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          team_id?: string
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      org_invites_v2: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          org_id: string
          role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          org_id: string
          role?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          org_id?: string
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_invites_v2_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members_v2: {
        Row: {
          created_at: string
          id: string
          org_id: string
          role: string
          seat_type: Database["public"]["Enums"]["seat_type"]
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          role?: string
          seat_type?: Database["public"]["Enums"]["seat_type"]
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          role?: string
          seat_type?: Database["public"]["Enums"]["seat_type"]
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_v2_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      orgs_v2: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      payment_reminders: {
        Row: {
          id: string
          invoice_id: string
          reminder_number: number
          reminder_type: string
          sent_at: string
          team_id: string
        }
        Insert: {
          id?: string
          invoice_id: string
          reminder_number?: number
          reminder_type?: string
          sent_at?: string
          team_id: string
        }
        Update: {
          id?: string
          invoice_id?: string
          reminder_number?: number
          reminder_type?: string
          sent_at?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_reminders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reminders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_invoice_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reminders_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reminders_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          notes: string | null
          payment_date: string
          payment_method: string | null
          team_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          team_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_invoice_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_prices_v2: {
        Row: {
          billing_period: string
          created_at: string
          currency: string
          id: string
          plan_id: string
          stripe_price_id: string
        }
        Insert: {
          billing_period: string
          created_at?: string
          currency?: string
          id?: string
          plan_id: string
          stripe_price_id: string
        }
        Update: {
          billing_period?: string
          created_at?: string
          currency?: string
          id?: string
          plan_id?: string
          stripe_price_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_prices_v2_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      plans_v2: {
        Row: {
          code: string
          features: Json
          id: string
          included_seats: number
          is_active: boolean
          name: string
        }
        Insert: {
          code: string
          features?: Json
          id?: string
          included_seats?: number
          is_active?: boolean
          name: string
        }
        Update: {
          code?: string
          features?: Json
          id?: string
          included_seats?: number
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          auto_clock_mode: string
          avatar_url: string | null
          bio: string | null
          business_size: string | null
          company_name: string | null
          country: string | null
          created_at: string
          currency: string
          drip_emails_scheduled: boolean
          email: string | null
          expense_forward_code: string
          full_name: string | null
          george_voice_added_at: string | null
          has_george_voice: boolean | null
          home_address: string | null
          home_city: string | null
          home_country: string | null
          home_country_iso2: string | null
          home_latitude: number | null
          home_line1: string | null
          home_line2: string | null
          home_longitude: number | null
          home_postal_code: string | null
          home_region: string | null
          hourly_rate: number | null
          id: string
          onboarding_completed: boolean
          onboarding_step: number | null
          phone: string | null
          referral_code: string | null
          team_id: string | null
          timezone: string | null
          trade_type: string | null
          updated_at: string
          workflow_mode: string | null
        }
        Insert: {
          auto_clock_mode?: string
          avatar_url?: string | null
          bio?: string | null
          business_size?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          currency?: string
          drip_emails_scheduled?: boolean
          email?: string | null
          expense_forward_code?: string
          full_name?: string | null
          george_voice_added_at?: string | null
          has_george_voice?: boolean | null
          home_address?: string | null
          home_city?: string | null
          home_country?: string | null
          home_country_iso2?: string | null
          home_latitude?: number | null
          home_line1?: string | null
          home_line2?: string | null
          home_longitude?: number | null
          home_postal_code?: string | null
          home_region?: string | null
          hourly_rate?: number | null
          id: string
          onboarding_completed?: boolean
          onboarding_step?: number | null
          phone?: string | null
          referral_code?: string | null
          team_id?: string | null
          timezone?: string | null
          trade_type?: string | null
          updated_at?: string
          workflow_mode?: string | null
        }
        Update: {
          auto_clock_mode?: string
          avatar_url?: string | null
          bio?: string | null
          business_size?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          currency?: string
          drip_emails_scheduled?: boolean
          email?: string | null
          expense_forward_code?: string
          full_name?: string | null
          george_voice_added_at?: string | null
          has_george_voice?: boolean | null
          home_address?: string | null
          home_city?: string | null
          home_country?: string | null
          home_country_iso2?: string | null
          home_latitude?: number | null
          home_line1?: string | null
          home_line2?: string | null
          home_longitude?: number | null
          home_postal_code?: string | null
          home_region?: string | null
          hourly_rate?: number | null
          id?: string
          onboarding_completed?: boolean
          onboarding_step?: number | null
          phone?: string | null
          referral_code?: string | null
          team_id?: string | null
          timezone?: string | null
          trade_type?: string | null
          updated_at?: string
          workflow_mode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      quickbooks_connections: {
        Row: {
          access_token: string
          company_name: string | null
          created_at: string
          id: string
          realm_id: string
          refresh_token: string
          team_id: string
          token_expires_at: string
          updated_at: string
        }
        Insert: {
          access_token: string
          company_name?: string | null
          created_at?: string
          id?: string
          realm_id: string
          refresh_token: string
          team_id: string
          token_expires_at: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          company_name?: string | null
          created_at?: string
          id?: string
          realm_id?: string
          refresh_token?: string
          team_id?: string
          token_expires_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quickbooks_connections_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quickbooks_connections_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_items: {
        Row: {
          created_at: string
          description: string
          id: string
          quantity: number
          quote_id: string
          tax_rate: number | null
          total_price: number | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          quantity?: number
          quote_id: string
          tax_rate?: number | null
          total_price?: number | null
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          quantity?: number
          quote_id?: string
          tax_rate?: number | null
          total_price?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          communication_suppressed: boolean
          created_at: string
          currency: string
          customer_id: string
          delivery_status: string
          discount_type: string
          discount_value: number
          display_number: string
          id: string
          job_id: string | null
          last_viewed_at: string | null
          notes: string | null
          portal_token: string | null
          ref: string
          reminders_enabled: boolean | null
          signature_url: string | null
          signed_at: string | null
          status: Database["public"]["Enums"]["quote_status"]
          subtotal: number | null
          tax_amount: number | null
          tax_rate: number | null
          team_id: string
          total: number | null
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          communication_suppressed?: boolean
          created_at?: string
          currency?: string
          customer_id: string
          delivery_status?: string
          discount_type?: string
          discount_value?: number
          display_number?: string
          id?: string
          job_id?: string | null
          last_viewed_at?: string | null
          notes?: string | null
          portal_token?: string | null
          ref?: string
          reminders_enabled?: boolean | null
          signature_url?: string | null
          signed_at?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          team_id: string
          total?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          communication_suppressed?: boolean
          created_at?: string
          currency?: string
          customer_id?: string
          delivery_status?: string
          discount_type?: string
          discount_value?: number
          display_number?: string
          id?: string
          job_id?: string | null
          last_viewed_at?: string | null
          notes?: string | null
          portal_token?: string | null
          ref?: string
          reminders_enabled?: boolean | null
          signature_url?: string | null
          signed_at?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          team_id?: string
          total?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_job_profitability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_jobs_at_risk"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_segment_jobs_at_risk"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "quotes_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_invoice_items: {
        Row: {
          created_at: string
          description: string
          id: string
          quantity: number
          recurring_invoice_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          quantity?: number
          recurring_invoice_id: string
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          quantity?: number
          recurring_invoice_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "recurring_invoice_items_recurring_invoice_id_fkey"
            columns: ["recurring_invoice_id"]
            isOneToOne: false
            referencedRelation: "recurring_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_invoices: {
        Row: {
          auto_send: boolean
          created_at: string
          customer_id: string
          frequency: string
          id: string
          is_active: boolean
          last_run_date: string | null
          next_run_date: string
          notes: string | null
          tax_rate: number | null
          team_id: string
          updated_at: string
        }
        Insert: {
          auto_send?: boolean
          created_at?: string
          customer_id: string
          frequency?: string
          id?: string
          is_active?: boolean
          last_run_date?: string | null
          next_run_date: string
          notes?: string | null
          tax_rate?: number | null
          team_id: string
          updated_at?: string
        }
        Update: {
          auto_send?: boolean
          created_at?: string
          customer_id?: string
          frequency?: string
          id?: string
          is_active?: boolean
          last_run_date?: string | null
          next_run_date?: string
          notes?: string | null
          tax_rate?: number | null
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_invoices_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_invoices_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_jobs: {
        Row: {
          auto_schedule: boolean
          created_at: string
          customer_id: string
          description: string | null
          estimated_value: number | null
          frequency: string
          id: string
          is_active: boolean
          last_run_date: string | null
          next_run_date: string
          notes: string | null
          preferred_time: string | null
          team_id: string
          title: string
          updated_at: string
        }
        Insert: {
          auto_schedule?: boolean
          created_at?: string
          customer_id: string
          description?: string | null
          estimated_value?: number | null
          frequency?: string
          id?: string
          is_active?: boolean
          last_run_date?: string | null
          next_run_date: string
          notes?: string | null
          preferred_time?: string | null
          team_id: string
          title: string
          updated_at?: string
        }
        Update: {
          auto_schedule?: boolean
          created_at?: string
          customer_id?: string
          description?: string | null
          estimated_value?: number | null
          frequency?: string
          id?: string
          is_active?: boolean
          last_run_date?: string | null
          next_run_date?: string
          notes?: string | null
          preferred_time?: string | null
          team_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_jobs_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_jobs_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          converted_at: string | null
          created_at: string
          id: string
          referral_code: string | null
          referred_email: string
          referred_team_id: string | null
          referred_user_id: string | null
          referrer_team_id: string
          referrer_user_id: string
          reward_applied: boolean
          status: string
        }
        Insert: {
          converted_at?: string | null
          created_at?: string
          id?: string
          referral_code?: string | null
          referred_email: string
          referred_team_id?: string | null
          referred_user_id?: string | null
          referrer_team_id: string
          referrer_user_id: string
          reward_applied?: boolean
          status?: string
        }
        Update: {
          converted_at?: string | null
          created_at?: string
          id?: string
          referral_code?: string | null
          referred_email?: string
          referred_team_id?: string | null
          referred_user_id?: string | null
          referrer_team_id?: string
          referrer_user_id?: string
          reward_applied?: boolean
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_team_id_fkey"
            columns: ["referred_team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referred_team_id_fkey"
            columns: ["referred_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_team_id_fkey"
            columns: ["referrer_team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_team_id_fkey"
            columns: ["referrer_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      subscription_events_v2: {
        Row: {
          created_at: string
          event_payload: Json
          event_type: string
          id: string
          org_id: string
        }
        Insert: {
          created_at?: string
          event_payload?: Json
          event_type: string
          id?: string
          org_id: string
        }
        Update: {
          created_at?: string
          event_payload?: Json
          event_type?: string
          id?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_events_v2_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_history: {
        Row: {
          amount: number | null
          created_at: string | null
          event_type: string
          from_tier: string | null
          id: string
          stripe_event_id: string | null
          team_id: string
          to_tier: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          event_type: string
          from_tier?: string | null
          id?: string
          stripe_event_id?: string | null
          team_id: string
          to_tier?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          event_type?: string
          from_tier?: string | null
          id?: string
          stripe_event_id?: string | null
          team_id?: string
          to_tier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_history_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_history_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          seat_count: number
          status: string
          stripe_base_item_id: string | null
          stripe_customer_id: string | null
          stripe_george_item_id: string | null
          stripe_subscription_id: string | null
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          seat_count?: number
          status?: string
          stripe_base_item_id?: string | null
          stripe_customer_id?: string | null
          stripe_george_item_id?: string | null
          stripe_subscription_id?: string | null
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          seat_count?: number
          status?: string
          stripe_base_item_id?: string | null
          stripe_customer_id?: string | null
          stripe_george_item_id?: string | null
          stripe_subscription_id?: string | null
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions_v2: {
        Row: {
          billing_period: string | null
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          org_id: string
          plan_id: string | null
          seat_count: number
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          billing_period?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          org_id: string
          plan_id?: string | null
          seat_count?: number
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          billing_period?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          org_id?: string
          plan_id?: string | null
          seat_count?: number
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_v2_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "orgs_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_v2_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_price_book: {
        Row: {
          category: string | null
          cost_price: number
          created_at: string
          id: string
          item_name: string
          last_updated: string
          sell_price: number
          supplier_name: string | null
          team_id: string
          unit: string | null
        }
        Insert: {
          category?: string | null
          cost_price?: number
          created_at?: string
          id?: string
          item_name: string
          last_updated?: string
          sell_price?: number
          supplier_name?: string | null
          team_id: string
          unit?: string | null
        }
        Update: {
          category?: string | null
          cost_price?: number
          created_at?: string
          id?: string
          item_name?: string
          last_updated?: string
          sell_price?: number
          supplier_name?: string | null
          team_id?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_price_book_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_price_book_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      task_steps: {
        Row: {
          completed_at: string | null
          error_message: string | null
          id: string
          label: string
          sort_order: number
          started_at: string | null
          status: string
          step_key: string
          task_id: string
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          label: string
          sort_order?: number
          started_at?: string | null
          status?: string
          step_key: string
          task_id: string
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          label?: string
          sort_order?: number
          started_at?: string | null
          status?: string
          step_key?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_steps_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "agent_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: string
          status: string
          team_id: string
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: string
          status?: string
          team_id: string
          token?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: string
          status?: string
          team_id?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_memberships: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["team_role"]
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["team_role"]
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["team_role"]
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          george_usage_reset_date: string | null
          george_voice_minutes_limit: number | null
          george_voice_minutes_used: number | null
          george_voice_price_per_seat: number | null
          george_voice_rollover_minutes: number
          george_voice_seats: number | null
          id: string
          is_demo: boolean
          is_trial: boolean | null
          name: string
          platform_fee_percent: number | null
          stripe_connect_account_id: string | null
          stripe_connect_onboarding_complete: boolean | null
          subscription_plan: string
          subscription_tier: string | null
          trial_ends_at: string | null
          voice_overage_enabled: boolean | null
          voice_overage_rate: number | null
        }
        Insert: {
          created_at?: string
          george_usage_reset_date?: string | null
          george_voice_minutes_limit?: number | null
          george_voice_minutes_used?: number | null
          george_voice_price_per_seat?: number | null
          george_voice_rollover_minutes?: number
          george_voice_seats?: number | null
          id?: string
          is_demo?: boolean
          is_trial?: boolean | null
          name: string
          platform_fee_percent?: number | null
          stripe_connect_account_id?: string | null
          stripe_connect_onboarding_complete?: boolean | null
          subscription_plan?: string
          subscription_tier?: string | null
          trial_ends_at?: string | null
          voice_overage_enabled?: boolean | null
          voice_overage_rate?: number | null
        }
        Update: {
          created_at?: string
          george_usage_reset_date?: string | null
          george_voice_minutes_limit?: number | null
          george_voice_minutes_used?: number | null
          george_voice_price_per_seat?: number | null
          george_voice_rollover_minutes?: number
          george_voice_seats?: number | null
          id?: string
          is_demo?: boolean
          is_trial?: boolean | null
          name?: string
          platform_fee_percent?: number | null
          stripe_connect_account_id?: string | null
          stripe_connect_onboarding_complete?: boolean | null
          subscription_plan?: string
          subscription_tier?: string | null
          trial_ends_at?: string | null
          voice_overage_enabled?: boolean | null
          voice_overage_rate?: number | null
        }
        Relationships: []
      }
      template_items: {
        Row: {
          created_at: string
          description: string
          id: string
          is_material: boolean | null
          item_type: string
          quantity: number
          sort_order: number
          template_id: string
          unit: string | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          is_material?: boolean | null
          item_type?: string
          quantity?: number
          sort_order?: number
          template_id: string
          unit?: string | null
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_material?: boolean | null
          item_type?: string
          quantity?: number
          sort_order?: number
          template_id?: string
          unit?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          category: Database["public"]["Enums"]["trade_category"]
          created_at: string
          description: string | null
          estimated_duration: number | null
          id: string
          is_active: boolean | null
          is_favorite: boolean
          is_system_template: boolean | null
          labour_rate_default: number | null
          name: string
          team_id: string
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["trade_category"]
          created_at?: string
          description?: string | null
          estimated_duration?: number | null
          id?: string
          is_active?: boolean | null
          is_favorite?: boolean
          is_system_template?: boolean | null
          labour_rate_default?: number | null
          name: string
          team_id: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["trade_category"]
          created_at?: string
          description?: string | null
          estimated_duration?: number | null
          id?: string
          is_active?: boolean | null
          is_favorite?: boolean
          is_system_template?: boolean | null
          labour_rate_default?: number | null
          name?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "templates_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "templates_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      time_anomalies: {
        Row: {
          anomaly_type: string
          created_at: string | null
          details: Json | null
          id: string
          reviewed: boolean | null
          team_id: string
          time_entry_id: string | null
          user_id: string
        }
        Insert: {
          anomaly_type: string
          created_at?: string | null
          details?: Json | null
          id?: string
          reviewed?: boolean | null
          team_id: string
          time_entry_id?: string | null
          user_id: string
        }
        Update: {
          anomaly_type?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          reviewed?: boolean | null
          team_id?: string
          time_entry_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_anomalies_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_anomalies_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_anomalies_time_entry_id_fkey"
            columns: ["time_entry_id"]
            isOneToOne: false
            referencedRelation: "time_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          break_duration_seconds: number | null
          break_end: string | null
          break_end_at: string | null
          break_start: string | null
          break_start_at: string | null
          clock_in_accuracy: number | null
          clock_in_at: string
          clock_in_latitude: number | null
          clock_in_longitude: number | null
          clock_in_photo_url: string | null
          clock_in_verified: boolean | null
          clock_out_accuracy: number | null
          clock_out_at: string | null
          clock_out_latitude: number | null
          clock_out_longitude: number | null
          clock_out_photo_url: string | null
          clock_out_verified: boolean | null
          created_at: string | null
          device_id: string | null
          distance_calculation_method: string
          distance_km: number
          id: string
          is_billable: boolean | null
          job_id: string
          job_site_id: string | null
          notes: string | null
          status: string | null
          synced_at: string | null
          team_id: string
          total_break_minutes: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          break_duration_seconds?: number | null
          break_end?: string | null
          break_end_at?: string | null
          break_start?: string | null
          break_start_at?: string | null
          clock_in_accuracy?: number | null
          clock_in_at: string
          clock_in_latitude?: number | null
          clock_in_longitude?: number | null
          clock_in_photo_url?: string | null
          clock_in_verified?: boolean | null
          clock_out_accuracy?: number | null
          clock_out_at?: string | null
          clock_out_latitude?: number | null
          clock_out_longitude?: number | null
          clock_out_photo_url?: string | null
          clock_out_verified?: boolean | null
          created_at?: string | null
          device_id?: string | null
          distance_calculation_method?: string
          distance_km?: number
          id?: string
          is_billable?: boolean | null
          job_id: string
          job_site_id?: string | null
          notes?: string | null
          status?: string | null
          synced_at?: string | null
          team_id: string
          total_break_minutes?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          break_duration_seconds?: number | null
          break_end?: string | null
          break_end_at?: string | null
          break_start?: string | null
          break_start_at?: string | null
          clock_in_accuracy?: number | null
          clock_in_at?: string
          clock_in_latitude?: number | null
          clock_in_longitude?: number | null
          clock_in_photo_url?: string | null
          clock_in_verified?: boolean | null
          clock_out_accuracy?: number | null
          clock_out_at?: string | null
          clock_out_latitude?: number | null
          clock_out_longitude?: number | null
          clock_out_photo_url?: string | null
          clock_out_verified?: boolean | null
          created_at?: string | null
          device_id?: string | null
          distance_calculation_method?: string
          distance_km?: number
          id?: string
          is_billable?: boolean | null
          job_id?: string
          job_site_id?: string | null
          notes?: string | null
          status?: string | null
          synced_at?: string | null
          team_id?: string
          total_break_minutes?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_job_profitability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_jobs_at_risk"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_segment_jobs_at_risk"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "time_entries_job_site_id_fkey"
            columns: ["job_site_id"]
            isOneToOne: false
            referencedRelation: "job_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_logs: {
        Row: {
          created_at: string | null
          destination_address: string | null
          distance_meters: number | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          origin_address: string | null
          started_at: string
          team_id: string
          time_entry_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          destination_address?: string | null
          distance_meters?: number | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          origin_address?: string | null
          started_at: string
          team_id: string
          time_entry_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          destination_address?: string | null
          distance_meters?: number | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          origin_address?: string | null
          started_at?: string
          team_id?: string
          time_entry_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "travel_logs_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_logs_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_logs_time_entry_id_fkey"
            columns: ["time_entry_id"]
            isOneToOne: false
            referencedRelation: "time_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      winback_queue: {
        Row: {
          cancelled: boolean
          created_at: string
          id: string
          org_id: string
          owner_email: string
          owner_name: string | null
          scheduled_for: string
          sent: boolean
          stripe_customer_id: string | null
        }
        Insert: {
          cancelled?: boolean
          created_at?: string
          id?: string
          org_id: string
          owner_email: string
          owner_name?: string | null
          scheduled_for: string
          sent?: boolean
          stripe_customer_id?: string | null
        }
        Update: {
          cancelled?: boolean
          created_at?: string
          id?: string
          org_id?: string
          owner_email?: string
          owner_name?: string | null
          scheduled_for?: string
          sent?: boolean
          stripe_customer_id?: string | null
        }
        Relationships: []
      }
      xero_connections: {
        Row: {
          access_token: string
          connected_by: string
          created_at: string
          id: string
          refresh_token: string
          scopes: string | null
          team_id: string
          token_expires_at: string
          updated_at: string
          xero_tenant_id: string
          xero_tenant_name: string | null
        }
        Insert: {
          access_token: string
          connected_by: string
          created_at?: string
          id?: string
          refresh_token: string
          scopes?: string | null
          team_id: string
          token_expires_at: string
          updated_at?: string
          xero_tenant_id: string
          xero_tenant_name?: string | null
        }
        Update: {
          access_token?: string
          connected_by?: string
          created_at?: string
          id?: string
          refresh_token?: string
          scopes?: string | null
          team_id?: string
          token_expires_at?: string
          updated_at?: string
          xero_tenant_id?: string
          xero_tenant_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "xero_connections_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "xero_connections_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      team_member_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          role: Database["public"]["Enums"]["team_role"] | null
          team_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_public: {
        Row: {
          created_at: string | null
          george_usage_reset_date: string | null
          george_voice_minutes_limit: number | null
          george_voice_minutes_used: number | null
          george_voice_price_per_seat: number | null
          george_voice_rollover_minutes: number | null
          george_voice_seats: number | null
          id: string | null
          is_demo: boolean | null
          is_trial: boolean | null
          name: string | null
          platform_fee_percent: number | null
          stripe_connect_account_id: string | null
          stripe_connect_onboarding_complete: boolean | null
          subscription_plan: string | null
          subscription_tier: string | null
          trial_ends_at: string | null
          voice_overage_enabled: boolean | null
          voice_overage_rate: number | null
        }
        Insert: {
          created_at?: string | null
          george_usage_reset_date?: string | null
          george_voice_minutes_limit?: number | null
          george_voice_minutes_used?: number | null
          george_voice_price_per_seat?: never
          george_voice_rollover_minutes?: number | null
          george_voice_seats?: number | null
          id?: string | null
          is_demo?: boolean | null
          is_trial?: boolean | null
          name?: string | null
          platform_fee_percent?: never
          stripe_connect_account_id?: never
          stripe_connect_onboarding_complete?: never
          subscription_plan?: string | null
          subscription_tier?: string | null
          trial_ends_at?: string | null
          voice_overage_enabled?: never
          voice_overage_rate?: never
        }
        Update: {
          created_at?: string | null
          george_usage_reset_date?: string | null
          george_voice_minutes_limit?: number | null
          george_voice_minutes_used?: number | null
          george_voice_price_per_seat?: never
          george_voice_rollover_minutes?: number | null
          george_voice_seats?: number | null
          id?: string | null
          is_demo?: boolean | null
          is_trial?: boolean | null
          name?: string | null
          platform_fee_percent?: never
          stripe_connect_account_id?: never
          stripe_connect_onboarding_complete?: never
          subscription_plan?: string | null
          subscription_tier?: string | null
          trial_ends_at?: string | null
          voice_overage_enabled?: never
          voice_overage_rate?: never
        }
        Relationships: []
      }
      v_invoice_balances: {
        Row: {
          balance_due: number | null
          customer_id: string | null
          days_overdue: number | null
          due_date: string | null
          id: string | null
          invoice_number: string | null
          issue_date: string | null
          payment_status: string | null
          status: Database["public"]["Enums"]["invoice_status"] | null
          team_id: string | null
          total: number | null
          total_paid: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      v_invoice_risk: {
        Row: {
          avg_days_to_pay: number | null
          customer: string | null
          days_overdue: number | null
          id: string | null
          invoice_count: number | null
          late_payment_rate: number | null
          oldest_due_date: string | null
          oldest_invoice: string | null
          risk_points: number | null
          risk_score: string | null
          team_id: string | null
          total_due: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      v_job_profitability: {
        Row: {
          actual_cost: number | null
          customer_id: string | null
          customer_name: string | null
          estimated_value: number | null
          expense_total: number | null
          id: string | null
          labour_cost: number | null
          materials_cost: number | null
          profit: number | null
          profit_margin_pct: number | null
          status: Database["public"]["Enums"]["job_status"] | null
          team_id: string | null
          title: string | null
          total_cost: number | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      v_jobs_at_risk: {
        Row: {
          customer_id: string | null
          customer_name: string | null
          days_in_stage: number | null
          estimated_value: number | null
          id: string | null
          scheduled_date: string | null
          status: Database["public"]["Enums"]["job_status"] | null
          team_id: string | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      v_payment_behavior: {
        Row: {
          avg_days_to_pay: number | null
          customer_id: string | null
          customer_name: string | null
          late_payment_pct: number | null
          outstanding_invoices: number | null
          paid_invoices: number | null
          reliability_score: number | null
          team_id: string | null
          total_invoices: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      v_quote_conversion: {
        Row: {
          avg_days_to_win: number | null
          created_value: number | null
          lost_value: number | null
          sent_value: number | null
          stale_quotes: number | null
          team_id: string | null
          total_created: number | null
          total_lost: number | null
          total_sent: number | null
          total_won: number | null
          won_value: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      v_segment_high_risk_customers: {
        Row: {
          customer_id: string | null
          team_id: string | null
        }
        Relationships: []
      }
      v_segment_jobs_at_risk: {
        Row: {
          customer_id: string | null
          days_since_update: number | null
          job_id: string | null
          risk_type: string | null
          scheduled_date: string | null
          status: Database["public"]["Enums"]["job_status"] | null
          team_id: string | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      v_segment_recent_activity: {
        Row: {
          customer_id: string | null
          event_date: string | null
          event_type: string | null
          record_id: string | null
          team_id: string | null
        }
        Relationships: []
      }
      v_segment_top_customers: {
        Row: {
          customer_id: string | null
          invoice_count: number | null
          team_id: string | null
          total_collected: number | null
          total_invoiced: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      accept_org_invite_v2: { Args: { invite_token: string }; Returns: Json }
      accept_quote_from_portal: { Args: { token: string }; Returns: Json }
      accept_team_invitation: {
        Args: { invitation_token: string }
        Returns: Json
      }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      calculate_distance_meters: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
      calculate_george_minutes_limit: {
        Args: { voice_seats: number }
        Returns: number
      }
      calculate_team_profitability: {
        Args: { target_team_id: string }
        Returns: {
          margin_percent: number
          voice_cost: number
          voice_minutes: number
          voice_revenue: number
        }[]
      }
      cleanup_old_george_data: {
        Args: { days_to_keep?: number }
        Returns: {
          deleted_conversations: number
          deleted_messages: number
          deleted_usage_logs: number
        }[]
      }
      cleanup_old_location_pings: {
        Args: { days_to_keep?: number }
        Returns: number
      }
      create_public_lead: {
        Args: {
          p_address?: string
          p_description?: string
          p_email?: string
          p_job_type?: string
          p_name: string
          p_phone?: string
          p_source?: string
          p_team_id: string
        }
        Returns: string
      }
      decline_quote_from_portal: {
        Args: { decline_reason?: string; token: string }
        Returns: Json
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      expire_v2_trials: { Args: never; Returns: undefined }
      fn_compute_payment_scores: {
        Args: { p_team_id: string }
        Returns: undefined
      }
      generate_certificate_number: {
        Args: {
          p_team_id: string
          p_type: Database["public"]["Enums"]["certificate_type"]
        }
        Returns: string
      }
      generate_invoice_number: { Args: { p_team_id: string }; Returns: string }
      generate_quote_number: { Args: { p_team_id: string }; Returns: string }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_customer_id_for_user: { Args: never; Returns: string }
      get_global_profitability_metrics: {
        Args: never
        Returns: {
          overall_margin_percent: number
          teams_below_40_margin: number
          total_minutes_used: number
          total_voice_cost: number
          total_voice_revenue: number
          total_voice_seats: number
        }[]
      }
      get_invoice_by_portal_token: { Args: { token: string }; Returns: Json }
      get_quote_by_portal_token: { Args: { token: string }; Returns: Json }
      get_team_george_users: {
        Args: { target_team_id: string }
        Returns: {
          email: string
          full_name: string
          george_voice_added_at: string
          has_george_voice: boolean
          user_id: string
        }[]
      }
      get_team_seat_usage: {
        Args: { target_team_id: string }
        Returns: {
          can_add_member: boolean
          total_seats: number
          used_seats: number
        }[]
      }
      get_user_org_id_v2: { Args: never; Returns: string }
      get_user_seat_type: { Args: never; Returns: string }
      get_user_seat_type_for: { Args: { p_user_id: string }; Returns: string }
      get_user_team_id: { Args: never; Returns: string }
      get_user_team_role: {
        Args: never
        Returns: Database["public"]["Enums"]["team_role"]
      }
      gettransactionid: { Args: never; Returns: unknown }
      is_customer: { Args: never; Returns: boolean }
      is_member_of_team: { Args: { target_team_id: string }; Returns: boolean }
      is_org_admin_or_owner_v2: {
        Args: { target_org_id: string }
        Returns: boolean
      }
      is_org_member_v2: { Args: { target_org_id: string }; Returns: boolean }
      is_org_owner_v2: { Args: { target_org_id: string }; Returns: boolean }
      is_owner_of_team: { Args: { target_team_id: string }; Returns: boolean }
      is_owner_or_manager_of_team: {
        Args: { check_team_id: string }
        Returns: boolean
      }
      is_within_geofence: {
        Args: { check_lat: number; check_lng: number; site_id: string }
        Returns: boolean
      }
      link_customer_account: { Args: never; Returns: boolean }
      longtransactionsenabled: { Args: never; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      seed_new_category_templates: {
        Args: { p_team_id: string }
        Returns: undefined
      }
      seed_team_templates: { Args: { p_team_id: string }; Returns: undefined }
      seed_team_templates_v2: {
        Args: { p_team_id: string }
        Returns: undefined
      }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      validate_seat_count_v2: {
        Args: { requested_seats: number; target_org_id: string }
        Returns: Json
      }
    }
    Enums: {
      certificate_status: "draft" | "issued" | "expired" | "superseded"
      certificate_type:
        | "eicr"
        | "gas_safety"
        | "minor_works"
        | "eic"
        | "part_p"
        | "unvented_cylinder"
        | "oil_tank"
        | "f_gas"
        | "landlord_gas"
        | "rgii"
      creatify_category:
        | "result"
        | "testimonial"
        | "environment"
        | "team"
        | "comparison"
        | "pain_point"
        | "business_intro"
        | "service_in_action"
      expense_category:
        | "materials"
        | "equipment"
        | "vehicle"
        | "fuel"
        | "tools"
        | "subcontractor"
        | "insurance"
        | "office"
        | "utilities"
        | "marketing"
        | "travel"
        | "meals"
        | "other"
        | "training"
      invoice_status: "draft" | "pending" | "paid" | "overdue" | "cancelled"
      job_status:
        | "pending"
        | "scheduled"
        | "in_progress"
        | "completed"
        | "cancelled"
      quote_status:
        | "draft"
        | "sent"
        | "accepted"
        | "declined"
        | "expired"
        | "converted"
      seat_type: "lite" | "connect" | "grow"
      team_role: "ceo" | "owner" | "member" | "manager"
      template_unit:
        | "each"
        | "hour"
        | "sqm"
        | "metre"
        | "job"
        | "roll"
        | "per_visit"
      trade_category:
        | "electrician"
        | "plumber"
        | "hvac"
        | "carpenter"
        | "painter"
        | "roofer"
        | "landscaper"
        | "general"
        | "handyman"
        | "tiler"
        | "flooring"
        | "pressure_washing"
        | "pool_spa"
        | "pest_control"
        | "tree_service"
        | "restoration"
        | "solar"
        | "fencing"
        | "chimney"
        | "auto_detailing"
        | "appliance_repair"
        | "garage_door"
        | "septic_well"
        | "cabinet_countertop"
        | "smart_home"
        | "window_door"
        | "concrete_masonry"
        | "locksmith"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
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
      certificate_status: ["draft", "issued", "expired", "superseded"],
      certificate_type: [
        "eicr",
        "gas_safety",
        "minor_works",
        "eic",
        "part_p",
        "unvented_cylinder",
        "oil_tank",
        "f_gas",
        "landlord_gas",
        "rgii",
      ],
      creatify_category: [
        "result",
        "testimonial",
        "environment",
        "team",
        "comparison",
        "pain_point",
        "business_intro",
        "service_in_action",
      ],
      expense_category: [
        "materials",
        "equipment",
        "vehicle",
        "fuel",
        "tools",
        "subcontractor",
        "insurance",
        "office",
        "utilities",
        "marketing",
        "travel",
        "meals",
        "other",
        "training",
      ],
      invoice_status: ["draft", "pending", "paid", "overdue", "cancelled"],
      job_status: [
        "pending",
        "scheduled",
        "in_progress",
        "completed",
        "cancelled",
      ],
      quote_status: [
        "draft",
        "sent",
        "accepted",
        "declined",
        "expired",
        "converted",
      ],
      seat_type: ["lite", "connect", "grow"],
      team_role: ["ceo", "owner", "member", "manager"],
      template_unit: [
        "each",
        "hour",
        "sqm",
        "metre",
        "job",
        "roll",
        "per_visit",
      ],
      trade_category: [
        "electrician",
        "plumber",
        "hvac",
        "carpenter",
        "painter",
        "roofer",
        "landscaper",
        "general",
        "handyman",
        "tiler",
        "flooring",
        "pressure_washing",
        "pool_spa",
        "pest_control",
        "tree_service",
        "restoration",
        "solar",
        "fencing",
        "chimney",
        "auto_detailing",
        "appliance_repair",
        "garage_door",
        "septic_well",
        "cabinet_countertop",
        "smart_home",
        "window_door",
        "concrete_masonry",
        "locksmith",
      ],
    },
  },
} as const
