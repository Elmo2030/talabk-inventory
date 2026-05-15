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
        Relationships: [
          {
            foreignKeyName: "items_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          }
        ];
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
        Relationships: [
          {
            foreignKeyName: "stock_in_movements_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_in_movements_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          }
        ];
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
        Relationships: [
          {
            foreignKeyName: "stock_out_movements_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          }
        ];
      };
      // ── Multi-Tenant tables ───────────────────────────────────
      tenants: {
        Row: {
          id: string;
          slug: string;
          store_name: string;
          owner_email: string;
          owner_phone: string | null;
          logo_url: string | null;
          subscription_plan: 'trial' | 'starter' | 'pro' | 'enterprise';
          status: 'pending' | 'active' | 'suspended' | 'cancelled';
          subscription_ends_at: string | null;
          monthly_fee: number;
          max_users: number;
          max_items: number;
          max_orders_per_month: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          store_name: string;
          owner_email: string;
          owner_phone?: string | null;
          logo_url?: string | null;
          subscription_plan?: 'trial' | 'starter' | 'pro' | 'enterprise';
          status?: 'pending' | 'active' | 'suspended' | 'cancelled';
          subscription_ends_at?: string | null;
          monthly_fee?: number;
          max_users?: number;
          max_items?: number;
          max_orders_per_month?: number;
        };
        Update: Partial<Database['public']['Tables']['tenants']['Insert']>;
        Relationships: [];
      };
      user_profiles: {
        Row: {
          id: string;
          tenant_id: string | null;
          role: 'super_admin' | 'tenant_admin' | 'tenant_user';
          full_name: string | null;
          permissions: Record<string, boolean>;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          tenant_id?: string | null;
          role?: 'super_admin' | 'tenant_admin' | 'tenant_user';
          full_name?: string | null;
          permissions?: Record<string, boolean>;
          is_active?: boolean;
        };
        Update: Partial<Database['public']['Tables']['user_profiles']['Insert']>;
        Relationships: [];
      };
      registration_requests: {
        Row: {
          id: string;
          store_name: string;
          owner_name: string;
          email: string;
          phone: string | null;
          requested_plan: 'trial' | 'starter' | 'pro' | 'enterprise';
          status: 'pending' | 'approved' | 'rejected';
          notes: string | null;
          tenant_id: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_name: string;
          owner_name: string;
          email: string;
          phone?: string | null;
          requested_plan?: 'trial' | 'starter' | 'pro' | 'enterprise';
          status?: 'pending' | 'approved' | 'rejected';
          notes?: string | null;
          tenant_id?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
        };
        Update: Partial<Database['public']['Tables']['registration_requests']['Insert']>;
        Relationships: [];
      };
      subscription_events: {
        Row: {
          id: string;
          tenant_id: string;
          event_type: string;
          plan_from: 'trial' | 'starter' | 'pro' | 'enterprise' | null;
          plan_to: 'trial' | 'starter' | 'pro' | 'enterprise' | null;
          amount: number | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          event_type: string;
          plan_from?: 'trial' | 'starter' | 'pro' | 'enterprise' | null;
          plan_to?: 'trial' | 'starter' | 'pro' | 'enterprise' | null;
          amount?: number | null;
          notes?: string | null;
          created_by?: string | null;
        };
        Update: Partial<Database['public']['Tables']['subscription_events']['Insert']>;
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
    Functions: {
      get_tenant_stats: {
        Args: Record<string, never>;
        Returns: Array<{
          id: string;
          slug: string;
          store_name: string;
          owner_email: string;
          subscription_plan: 'trial' | 'starter' | 'pro' | 'enterprise';
          status: 'pending' | 'active' | 'suspended' | 'cancelled';
          monthly_fee: number;
          subscription_ends_at: string | null;
          created_at: string;
          updated_at: string;
          total_users: number;
          active_users: number;
          total_orders: number;
          orders_last_30d: number;
          gmv_last_30d: number;
        }>;
      };
    };
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
