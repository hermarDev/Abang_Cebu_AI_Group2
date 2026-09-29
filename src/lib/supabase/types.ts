export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      listings: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string | null;
          title: string;
          description: string | null;
          price: number;
          currency: string;
          rental_period: string;
          property_type: string;
          latitude: number;
          longitude: number;
          address: string;
          city: string;
          is_available: boolean;
          owner_id: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string | null;
          title: string;
          description?: string | null;
          price: number;
          currency?: string;
          rental_period?: string;
          property_type?: string;
          latitude: number;
          longitude: number;
          address: string;
          city?: string;
          is_available?: boolean;
          owner_id?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string | null;
          title?: string;
          description?: string | null;
          price?: number;
          currency?: string;
          rental_period?: string;
          property_type?: string;
          latitude?: number;
          longitude?: number;
          address?: string;
          city?: string;
          is_available?: boolean;
          owner_id?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
