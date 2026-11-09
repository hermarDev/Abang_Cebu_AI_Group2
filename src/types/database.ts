/**
 * Supabase Database Type Definitions
 * Auto-generated / Architected for AbangCebuAI
 * Schema Migration: 20260929000001_users_and_profiles.sql
 * Jira Reference: SCRUM-54
 */

export type AdminAuditActionType =
  | 'property_approved' | 'property_rejected' | 'property_unpublished' | 'property_restored'
  | 'account_suspended' | 'account_reinstated' | 'report_resolved' | 'report_dismissed' | 'report_evidence_viewed';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'renter' | 'landlord' | 'admin';

export type KycStatus = 'pending' | 'verified' | 'rejected';

export type KycIdType =
  | 'passport'
  | 'philsys_id'
  | 'drivers_license'
  | 'umid'
  | 'prc_id'
  | 'postal_id';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: UserRole;
          full_name: string;
          phone_number: string | null;
          avatar_url: string | null;
          bio: string | null;
          is_suspended: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: UserRole;
          full_name: string;
          phone_number?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          is_suspended?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: UserRole;
          full_name?: string;
          phone_number?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          is_suspended?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      assistant_conversations: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          messages: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          title?: string;
          messages?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          messages?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assistant_conversations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      kyc_verifications: {
        Row: {
          id: string;
          landlord_id: string;
          id_type: KycIdType;
          id_document_url: string;
          proof_of_ownership_url: string | null;
          status: KycStatus;
          reviewed_by: string | null;
          reviewed_at: string | null;
          rejection_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          landlord_id: string;
          id_type: KycIdType;
          id_document_url: string;
          proof_of_ownership_url?: string | null;
          status?: KycStatus;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          landlord_id?: string;
          id_type?: KycIdType;
          id_document_url?: string;
          proof_of_ownership_url?: string | null;
          status?: KycStatus;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "kyc_verifications_landlord_id_fkey";
            columns: ["landlord_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "kyc_verifications_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      favorites: {
        Row: {
          user_id: string;
          listing_id: string;
          created_at: string;
        };
        Insert: {
          user_id?: string;
          listing_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          listing_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "favorites_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "favorites_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          }
        ];
      };
      admin_audit_logs: {
        Row: {
          id: string;
          operation_id: string;
          admin_id: string;
          action_type: AdminAuditActionType;
          target_type: 'property' | 'listing' | 'account' | 'report';
          target_id: string;
          previous_state: Json;
          new_state: Json;
          reason: string;
          created_at: string;
        };
        // Append-only: written solely by SECURITY DEFINER RPCs.
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "admin_audit_logs_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      rental_conversations: {
        Row: {
          id: string;
          listing_source: 'property' | 'listing';
          listing_id: string;
          renter_id: string;
          landlord_id: string;
          status: 'active' | 'closed';
          renter_archived_at: string | null;
          landlord_archived_at: string | null;
          renter_last_read_at: string;
          landlord_last_read_at: string | null;
          renter_unread_count: number;
          landlord_unread_count: number;
          last_message_at: string;
          last_message_preview: string;
          created_at: string;
          updated_at: string;
        };
        // Written solely by SECURITY DEFINER RPCs; participants get SELECT via RLS.
        Insert: never;
        Update: never;
        Relationships: [
          { foreignKeyName: "rental_conversations_renter_id_fkey"; columns: ["renter_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; },
          { foreignKeyName: "rental_conversations_landlord_id_fkey"; columns: ["landlord_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; }
        ];
      };
      rental_messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          operation_id: string;
          body: string;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [
          { foreignKeyName: "rental_messages_conversation_id_fkey"; columns: ["conversation_id"]; isOneToOne: false; referencedRelation: "rental_conversations"; referencedColumns: ["id"]; },
          { foreignKeyName: "rental_messages_sender_id_fkey"; columns: ["sender_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; }
        ];
      };
      user_blocks: {
        Row: {
          blocker_id: string;
          blocked_id: string;
          reason: string | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [
          { foreignKeyName: "user_blocks_blocker_id_fkey"; columns: ["blocker_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; },
          { foreignKeyName: "user_blocks_blocked_id_fkey"; columns: ["blocked_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; }
        ];
      };
      abuse_reports: {
        Row: {
          id: string;
          operation_id: string;
          reporter_id: string;
          target_type: 'conversation' | 'message' | 'listing' | 'account';
          target_user_id: string | null;
          conversation_id: string | null;
          message_id: string | null;
          listing_id: string | null;
          category: 'scam_or_fraud' | 'harassment' | 'inaccurate_listing' | 'off_platform_payment' | 'spam' | 'other';
          details: string;
          evidence_snapshot: Json;
          status: 'open' | 'in_review' | 'resolved' | 'dismissed';
          resolution_note: string | null;
          resolved_by: string | null;
          resolved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        // Written solely by SECURITY DEFINER RPCs.
        Insert: never;
        Update: never;
        Relationships: [
          { foreignKeyName: "abuse_reports_reporter_id_fkey"; columns: ["reporter_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; },
          { foreignKeyName: "abuse_reports_target_user_id_fkey"; columns: ["target_user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"]; }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_current_user_role: {
        Args: Record<PropertyKey, never>;
        Returns: UserRole;
      };
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      submit_landlord_listing: { Args: { listing_id: string }; Returns: boolean; };
      review_landlord_listing: { Args: { listing_id: string; decision: string; reason?: string | null }; Returns: boolean; };
      admin_dashboard_overview: { Args: Record<PropertyKey, never>; Returns: Json; };
      admin_list_properties: { Args: { p_status?: string | null; p_search?: string | null; p_limit?: number; p_offset?: number }; Returns: Json; };
      review_property: { Args: { p_property_id: string; p_operation_id: string; p_decision: string; p_note: string | null; p_submission_draft_id?: string | null; p_submission_expected_revision?: number | null }; Returns: Json; };
      admin_set_property_lifecycle: { Args: { p_property_id: string; p_operation_id: string; p_action: 'unpublish' | 'restore'; p_reason: string }; Returns: Json; };
      admin_list_accounts: { Args: { p_role?: string | null; p_suspended?: boolean | null; p_search?: string | null; p_limit?: number; p_offset?: number }; Returns: Json; };
      admin_set_account_suspension: { Args: { p_target_user_id: string; p_operation_id: string; p_suspend: boolean; p_reason: string; p_unpublish_listings?: boolean }; Returns: Json; };
      admin_list_audit_logs: { Args: { p_target_type?: string | null; p_limit?: number; p_offset?: number }; Returns: Json; };
      send_initial_rental_inquiry: { Args: { p_listing_id: string; p_operation_id: string; p_body: string }; Returns: Json; };
      send_rental_message: { Args: { p_conversation_id: string; p_operation_id: string; p_body: string }; Returns: Json; };
      mark_rental_conversation_read: { Args: { p_conversation_id: string }; Returns: Json; };
      set_rental_conversation_archived: { Args: { p_conversation_id: string; p_archived: boolean }; Returns: Json; };
      list_rental_conversations: { Args: { p_include_archived?: boolean }; Returns: Json; };
      get_rental_conversation_detail: { Args: { p_conversation_id: string; p_before?: string | null; p_limit?: number }; Returns: Json; };
      get_unread_rental_message_count: { Args: Record<PropertyKey, never>; Returns: number; };
      set_user_block: { Args: { p_target_user_id: string; p_blocked: boolean; p_reason?: string | null }; Returns: Json; };
      submit_abuse_report: { Args: { p_operation_id: string; p_target_type: string; p_conversation_id?: string | null; p_message_id?: string | null; p_listing_id?: string | null; p_category?: string | null; p_details?: string | null; p_block_counterpart?: boolean }; Returns: Json; };
      admin_list_abuse_reports: { Args: { p_status?: string | null; p_limit?: number; p_offset?: number }; Returns: Json; };
      admin_get_abuse_report_detail: { Args: { p_report_id: string; p_operation_id: string }; Returns: Json; };
      admin_resolve_abuse_report: { Args: { p_report_id: string; p_operation_id: string; p_decision: 'resolved' | 'dismissed'; p_resolution_note: string; p_suspend_target_user?: boolean; p_unpublish_target_listing?: boolean }; Returns: Json; };
    };
    Enums: {
      user_role: UserRole;
      kyc_status: KycStatus;
      kyc_id_type: KycIdType;
    };
    CompositeTypes: Record<string, never>;
  };
}

// Domain-convenience aliases
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export type AssistantConversation = Database['public']['Tables']['assistant_conversations']['Row'];
export type AssistantConversationInsert = Database['public']['Tables']['assistant_conversations']['Insert'];
export type AssistantConversationUpdate = Database['public']['Tables']['assistant_conversations']['Update'];

export type KycVerification = Database['public']['Tables']['kyc_verifications']['Row'];
export type KycVerificationInsert = Database['public']['Tables']['kyc_verifications']['Insert'];
export type KycVerificationUpdate = Database['public']['Tables']['kyc_verifications']['Update'];
