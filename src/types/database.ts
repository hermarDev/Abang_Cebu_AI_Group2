/**
 * Supabase Database Type Definitions
 * Auto-generated / Architected for AbangCebuAI
 * Schema Migration: 20260929000001_users_and_profiles.sql
 * Jira Reference: SCRUM-54
 */

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
