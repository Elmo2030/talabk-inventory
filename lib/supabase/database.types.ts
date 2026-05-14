// ============================================
// Supabase Database Types
// مطابق لـ Schema الفعلي في قاعدة البيانات
// ============================================

export type Database = {
  public: {
    Tables: {
      suppliers: {
        Row: {
          id: string;
          code: string;
          name: string;
          product_type: string | null;
          phone: string | null;
          email: string | null;
          address: string | null;
          contact_person: string | null;
          payment_terms: number;
          rating: number;
          is_active: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          product_type?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          contact_person?: string | null;
          payment_terms: number;
          rating: number;
          is_active: boolean;
          notes?: string | null;
        };
        Update: Partial<Database['public']['Tables']['suppliers']['Insert']>;
        Relationships: [];
      };
      items: {
        Row: {
          id: string;
          code: string;
          name: string;
          category: string;
          unit: string;
          supplier_id: string | null;
          purchase_price: number;
          selling_price: number;
          opening_qty: number;
          min_stock_level: number;
          reorder_level: number;
          location: string | null;
          status: 'ACTIVE' | 'SUSPENDED' | 'UNDER_REVIEW';
          metadata: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          category: string;
          unit: string;
          supplier_id?: string | null;
          purchase_price: number;
          selling_price: number;
          opening_qty: number;
          min_stock_level: number;
          reorder_level: number;
          location?: string | null;
          status: 'ACTIVE' | 'SUSPENDED' | 'UNDER_REVIEW';
          metadata?: Record<string, unknown>;
        };
        Update: Partial<Database['public']['Tables']['items']['Insert']>;
        Relationships: [];
      };
      stock_in_movements: {
        Row: {
          id: string;
          operation_code: string;
          date: string;
          invoice_no: string | null;
          item_id: string;
          supplier_id: string;
          quantity: number;
          unit_price: number;
          total_cost: number;
          responsible_employee: string;
          notes: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          operation_code?: string;
          date: string;
          invoice_no?: string | null;
          item_id: string;
          supplier_id: string;
          quantity: number;
          unit_price: number;
          responsible_employee: string;
          notes?: string | null;
          created_by?: string | null;
        };
        Update: Partial<Database['public']['Tables']['stock_in_movements']['Insert']>;
        Relationships: [];
      };
      stock_out_movements: {
        Row: {
          id: string;
          operation_code: string;
          date: string;
          item_id: string;
          recipient_dept: string;
          quantity: number;
          unit_price: number;
          total_value: number;
          reason: string;
          responsible_employee: string;
          notes: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          operation_code?: string;
          date: string;
          item_id: string;
          recipient_dept: string;
          quantity: number;
          unit_price: number;
          reason: string;
          responsible_employee: string;
          notes?: string | null;
          created_by?: string | null;
        };
        Update: Partial<Database['public']['Tables']['stock_out_movements']['Insert']>;
        Relationships: [];
      };
    };
    Views: {
      current_stock_view: {
        Row: {
          item_id: string;
          item_code: string;
          item_name: string;
          category: string;
          unit: string;
          opening_qty: number;
          total_in: number;
          total_out: number;
          current_balance: number;
          min_stock_level: number;
          reorder_level: number;
          purchase_price: number;
          selling_price: number;
          stock_value: number;
          status: 'OUT_OF_STOCK' | 'NEEDS_REORDER' | 'LOW' | 'AVAILABLE';
          location: string | null;
          item_status: 'ACTIVE' | 'SUSPENDED' | 'UNDER_REVIEW';
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
