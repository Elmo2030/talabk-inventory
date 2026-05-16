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
          moving_average_cost: number | null;
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
          moving_average_cost?: number | null;
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
          tenant_id: string | null;
        };
        Insert: {
          id?: string;
          operation_code?: string;
          date: string;
          invoice_no?: string | null;
          item_id: string;
          supplier_id?: string | null;
          quantity: number;
          unit_price: number;
          responsible_employee: string;
          notes?: string | null;
          created_by?: string | null;
          tenant_id?: string | null;
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
          tenant_id: string | null;
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
          tenant_id?: string | null;
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
      // ── Purchase Invoices ─────────────────────────────────────
      purchase_invoices: {
        Row: {
          id: string;
          invoice_number: string;
          supplier_id: string | null;
          supplier_name: string;
          invoice_date: string;
          currency: string;
          exchange_rate: number;
          intl_shipping: number;
          local_shipping: number;
          customs_duties: number;
          clearance_fees: number;
          other_expenses: number;
          allocation_method: 'VALUE' | 'QUANTITY' | 'EQUAL';
          items: unknown;
          subtotal: number;
          total_landed_costs: number;
          grand_total: number;
          status: 'DRAFT' | 'CONFIRMED' | 'RECEIVED';
          notes: string;
          created_at: string;
          received_at: string | null;
          payment_status: 'unpaid' | 'partial' | 'paid';
          paid_amount: number;
          due_date: string | null;
          payments: unknown;
          tenant_id: string | null;
        };
        Insert: {
          id?: string;
          invoice_number: string;
          supplier_id?: string | null;
          supplier_name?: string;
          invoice_date: string;
          currency?: string;
          exchange_rate?: number;
          intl_shipping?: number;
          local_shipping?: number;
          customs_duties?: number;
          clearance_fees?: number;
          other_expenses?: number;
          allocation_method?: 'VALUE' | 'QUANTITY' | 'EQUAL';
          items?: unknown;
          subtotal?: number;
          total_landed_costs?: number;
          grand_total?: number;
          status?: 'DRAFT' | 'CONFIRMED' | 'RECEIVED';
          notes?: string;
          created_at?: string;
          received_at?: string | null;
          payment_status?: 'unpaid' | 'partial' | 'paid';
          paid_amount?: number;
          due_date?: string | null;
          payments?: unknown;
          tenant_id?: string | null;
        };
        Update: Partial<Database['public']['Tables']['purchase_invoices']['Insert']>;
        Relationships: [
          {
            foreignKeyName: "purchase_invoices_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          }
        ];
      };
      // ── Sales Orders ──────────────────────────────────────────
      sales_orders: {
        Row: {
          id: string;
          order_number: string;
          customer_name: string;
          customer_phone: string;
          customer_city: string;
          customer_address: string;
          delivery_type: 'home' | 'office' | 'female';
          items: unknown;
          shipping_cost: number;
          shipping_on_store: boolean;
          subtotal: number;
          discount_amount: number;
          discount_type: string | null;
          discount_value: number | null;
          coupon_code: string | null;
          customer_total: number;
          total_cogs: number;
          gross_profit: number;
          net_profit: number;
          profit_margin: number;
          vat_rate: number | null;
          vat_amount: number | null;
          status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
          tracking_number: string | null;
          shipping_carrier: string | null;
          notes: string;
          customer_payment_status: 'unpaid' | 'partial' | 'paid' | null;
          customer_paid_amount: number | null;
          customer_payments: unknown;
          created_at: string;
          shipped_at: string | null;
          delivered_at: string | null;
          tenant_id: string | null;
        };
        Insert: {
          id?: string;
          order_number: string;
          customer_name: string;
          customer_phone?: string;
          customer_city?: string;
          customer_address?: string;
          delivery_type?: 'home' | 'office' | 'female';
          items?: unknown;
          shipping_cost?: number;
          shipping_on_store?: boolean;
          subtotal?: number;
          discount_amount?: number;
          discount_type?: string | null;
          discount_value?: number | null;
          coupon_code?: string | null;
          customer_total?: number;
          total_cogs?: number;
          gross_profit?: number;
          net_profit?: number;
          profit_margin?: number;
          vat_rate?: number | null;
          vat_amount?: number | null;
          status?: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
          tracking_number?: string | null;
          shipping_carrier?: string | null;
          notes?: string;
          customer_payment_status?: 'unpaid' | 'partial' | 'paid' | null;
          customer_paid_amount?: number | null;
          customer_payments?: unknown;
          created_at?: string;
          shipped_at?: string | null;
          delivered_at?: string | null;
          tenant_id?: string | null;
        };
        Update: Partial<Database['public']['Tables']['sales_orders']['Insert']>;
        Relationships: [];
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
      // ── Appointments ─────────────────────────────────────────────
      appointments: {
        Row: {
          id: string;
          customer_name: string;
          customer_phone: string;
          service: string;
          staff_name: string | null;
          date: string;
          time: string;
          duration_minutes: number;
          notes: string | null;
          status: 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
          created_at: string;
          tenant_id: string | null;
        };
        Insert: {
          id?: string;
          customer_name: string;
          customer_phone?: string;
          service: string;
          staff_name?: string | null;
          date: string;
          time: string;
          duration_minutes?: number;
          notes?: string | null;
          status?: 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
          created_at?: string;
          tenant_id?: string | null;
        };
        Update: Partial<Database['public']['Tables']['appointments']['Insert']>;
        Relationships: [];
      };
      // ── Store Settings ────────────────────────────────────────────
      store_settings: {
        Row: {
          id: string;
          tenant_id: string | null;
          vat_enabled: boolean;
          vat_rate: number;
          vat_number: string | null;
          store_name: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id?: string | null;
          vat_enabled?: boolean;
          vat_rate?: number;
          vat_number?: string | null;
          store_name?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['store_settings']['Insert']>;
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
      // ── Coupons ───────────────────────────────────────────────
      coupons: {
        Row: {
          id: string;
          code: string;
          type: 'fixed' | 'percentage';
          value: number;
          min_order_value: number;
          max_uses: number;
          used_count: number;
          is_active: boolean;
          expires_at: string | null;
          created_at: string;
          tenant_id: string | null;
        };
        Insert: {
          id?: string;
          code: string;
          type?: 'fixed' | 'percentage';
          value: number;
          min_order_value?: number;
          max_uses?: number;
          used_count?: number;
          is_active?: boolean;
          expires_at?: string | null;
          created_at?: string;
          tenant_id?: string | null;
        };
        Update: Partial<Database['public']['Tables']['coupons']['Insert']>;
        Relationships: [
          {
            foreignKeyName: "coupons_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      // ── Return Orders ─────────────────────────────────────────
      return_orders: {
        Row: {
          id: string;
          return_number: string;
          original_order_id: string;
          original_order_number: string;
          customer_name: string;
          customer_phone: string;
          items: unknown;
          reason: string;
          refund_amount: number;
          restock_items: boolean;
          status: 'PENDING' | 'APPROVED' | 'REJECTED';
          notes: string;
          created_at: string;
          tenant_id: string | null;
        };
        Insert: {
          id?: string;
          return_number: string;
          original_order_id: string;
          original_order_number: string;
          customer_name: string;
          customer_phone?: string;
          items?: unknown;
          reason?: string;
          refund_amount?: number;
          restock_items?: boolean;
          status?: 'PENDING' | 'APPROVED' | 'REJECTED';
          notes?: string;
          created_at?: string;
          tenant_id?: string | null;
        };
        Update: Partial<Database['public']['Tables']['return_orders']['Insert']>;
        Relationships: [
          {
            foreignKeyName: "return_orders_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      subscription_payments: {
        Row: {
          id: string;
          tenant_id: string;
          amount: number;
          currency: string;
          moyasar_id: string | null;
          moyasar_status: string | null;
          plan: string;
          billing_months: number;
          description: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
          confirmed_at: string | null;
          confirmed_by: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          amount: number;
          currency?: string;
          moyasar_id?: string | null;
          moyasar_status?: string | null;
          plan: string;
          billing_months?: number;
          description?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
          confirmed_at?: string | null;
          confirmed_by?: string | null;
        };
        Update: Partial<Database['public']['Tables']['subscription_payments']['Insert']>;
        Relationships: [
          {
            foreignKeyName: "subscription_payments_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
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
