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
      amenities: {
        Row: {
          category: string
          icon_name: string | null
          id: string
          name: string
        }
        Insert: {
          category: string
          icon_name?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string
          icon_name?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          id: string
          ip_address: string | null
          target_id: string
          target_type: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          ip_address?: string | null
          target_id: string
          target_type: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          ip_address?: string | null
          target_id?: string
          target_type?: string
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
      inquiries: {
        Row: {
          created_at: string
          id: string
          landlord_id: string
          message: string
          preferred_move_in_date: string | null
          property_id: string
          renter_id: string
          status: string
          unit_id: string | null
          updated_at: string
          viewing_date: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          landlord_id: string
          message: string
          preferred_move_in_date?: string | null
          property_id: string
          renter_id: string
          status?: string
          unit_id?: string | null
          updated_at?: string
          viewing_date?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          landlord_id?: string
          message?: string
          preferred_move_in_date?: string | null
          property_id?: string
          renter_id?: string
          status?: string
          unit_id?: string | null
          updated_at?: string
          viewing_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inquiries_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inquiries_property_landlord_fkey"
            columns: ["property_id", "landlord_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id", "landlord_id"]
          },
          {
            foreignKeyName: "inquiries_renter_id_fkey"
            columns: ["renter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inquiries_unit_property_fkey"
            columns: ["unit_id", "property_id"]
            isOneToOne: false
            referencedRelation: "rental_units"
            referencedColumns: ["id", "property_id"]
          },
        ]
      }
      kyc_verifications: {
        Row: {
          created_at: string
          id: string
          id_document_url: string
          id_type: Database["public"]["Enums"]["kyc_id_type"]
          landlord_id: string
          proof_of_ownership_url: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["kyc_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          id_document_url: string
          id_type: Database["public"]["Enums"]["kyc_id_type"]
          landlord_id: string
          proof_of_ownership_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["kyc_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          id_document_url?: string
          id_type?: Database["public"]["Enums"]["kyc_id_type"]
          landlord_id?: string
          proof_of_ownership_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["kyc_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kyc_verifications_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kyc_verifications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          full_name: string
          id: string
          is_suspended: boolean
          phone_number: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name: string
          id: string
          is_suspended?: boolean
          phone_number?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_suspended?: boolean
          phone_number?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          barangay: string
          city: string
          coordinates: unknown
          created_at: string
          description: string
          id: string
          landlord_id: string
          latitude: number | null
          longitude: number | null
          moderation_note: string | null
          postal_code: string | null
          property_type: string
          status: string
          street_address: string
          title: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          barangay: string
          city?: string
          coordinates: unknown
          created_at?: string
          description: string
          id?: string
          landlord_id: string
          latitude?: number | null
          longitude?: number | null
          moderation_note?: string | null
          postal_code?: string | null
          property_type: string
          status?: string
          street_address: string
          title: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          barangay?: string
          city?: string
          coordinates?: unknown
          created_at?: string
          description?: string
          id?: string
          landlord_id?: string
          latitude?: number | null
          longitude?: number | null
          moderation_note?: string | null
          postal_code?: string | null
          property_type?: string
          status?: string
          street_address?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      property_amenities: {
        Row: {
          amenity_id: string
          property_id: string
        }
        Insert: {
          amenity_id: string
          property_id: string
        }
        Update: {
          amenity_id?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_amenities_amenity_id_fkey"
            columns: ["amenity_id"]
            isOneToOne: false
            referencedRelation: "amenities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_amenities_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_photos: {
        Row: {
          caption: string | null
          created_at: string
          display_order: number
          id: string
          is_cover: boolean
          property_id: string
          public_url: string
          storage_path: string
          unit_id: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_cover?: boolean
          property_id: string
          public_url: string
          storage_path: string
          unit_id?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_cover?: boolean
          property_id?: string
          public_url?: string
          storage_path?: string
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_photos_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_photos_unit_property_fkey"
            columns: ["unit_id", "property_id"]
            isOneToOne: false
            referencedRelation: "rental_units"
            referencedColumns: ["id", "property_id"]
          },
        ]
      }
      rental_units: {
        Row: {
          advance_rent: number
          available_from: string
          bathrooms: number
          bedrooms: number
          created_at: string
          floor_area_sqm: number | null
          furnished_status: string
          id: string
          is_available: boolean
          max_occupants: number
          minimum_lease_months: number
          monthly_rent: number
          property_id: string
          rental_type: Database["public"]["Enums"]["rental_unit_type"]
          security_deposit: number
          unit_number: string | null
          updated_at: string
        }
        Insert: {
          advance_rent?: number
          available_from?: string
          bathrooms?: number
          bedrooms?: number
          created_at?: string
          floor_area_sqm?: number | null
          furnished_status?: string
          id?: string
          is_available?: boolean
          max_occupants?: number
          minimum_lease_months?: number
          monthly_rent: number
          property_id: string
          rental_type: Database["public"]["Enums"]["rental_unit_type"]
          security_deposit?: number
          unit_number?: string | null
          updated_at?: string
        }
        Update: {
          advance_rent?: number
          available_from?: string
          bathrooms?: number
          bedrooms?: number
          created_at?: string
          floor_area_sqm?: number | null
          furnished_status?: string
          id?: string
          is_available?: boolean
          max_occupants?: number
          minimum_lease_months?: number
          monthly_rent?: number
          property_id?: string
          rental_type?: Database["public"]["Enums"]["rental_unit_type"]
          security_deposit?: number
          unit_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          is_verified_tenant: boolean
          property_id: string
          rating: number
          renter_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          is_verified_tenant?: boolean
          property_id: string
          rating: number
          renter_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          is_verified_tenant?: boolean
          property_id?: string
          rating?: number
          renter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_renter_id_fkey"
            columns: ["renter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_listings: {
        Row: {
          created_at: string
          id: string
          property_id: string
          renter_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          property_id: string
          renter_id: string
        }
        Update: {
          created_at?: string
          id?: string
          property_id?: string
          renter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_listings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_listings_renter_id_fkey"
            columns: ["renter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      kyc_id_type:
        | "passport"
        | "philsys_id"
        | "drivers_license"
        | "umid"
        | "prc_id"
        | "postal_id"
      kyc_status: "pending" | "verified" | "rejected"
      rental_unit_type:
        | "entire_place"
        | "private_room"
        | "shared_room"
        | "bedspace"
      user_role: "renter" | "landlord" | "admin"
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
      kyc_id_type: [
        "passport",
        "philsys_id",
        "drivers_license",
        "umid",
        "prc_id",
        "postal_id",
      ],
      kyc_status: ["pending", "verified", "rejected"],
      rental_unit_type: [
        "entire_place",
        "private_room",
        "shared_room",
        "bedspace",
      ],
      user_role: ["renter", "landlord", "admin"],
    },
  },
} as const
