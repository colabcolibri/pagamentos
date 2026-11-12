export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  payments: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          name: string
          role: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          is_active?: boolean | null
          name: string
          role?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          name?: string
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      coupon_redemptions: {
        Row: {
          id: string
          coupon_id: string
          order_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          coupon_id: string
          order_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          coupon_id?: string
          order_id?: string
          user_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'coupon_redemptions_coupon_id_fkey'
            columns: ['coupon_id']
            isOneToOne: false
            referencedRelation: 'discount_coupons'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'coupon_redemptions_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
        ]
      }
      discount_coupon_prices: {
        Row: {
          coupon_id: string
          price_id: string
          created_at: string
        }
        Insert: {
          coupon_id: string
          price_id: string
          created_at?: string
        }
        Update: {
          coupon_id?: string
          price_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'discount_coupon_prices_coupon_id_fkey'
            columns: ['coupon_id']
            isOneToOne: false
            referencedRelation: 'discount_coupons'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'discount_coupon_prices_price_id_fkey'
            columns: ['price_id']
            isOneToOne: false
            referencedRelation: 'prices'
            referencedColumns: ['id']
          },
        ]
      }
      discount_coupon_products: {
        Row: {
          coupon_id: string
          product_id: string
          created_at: string
        }
        Insert: {
          coupon_id: string
          product_id: string
          created_at?: string
        }
        Update: {
          coupon_id?: string
          product_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'discount_coupon_products_coupon_id_fkey'
            columns: ['coupon_id']
            isOneToOne: false
            referencedRelation: 'discount_coupons'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'discount_coupon_products_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }
      discount_coupons: {
        Row: {
          id: string
          code: string
          discount_type: string
          discount_percent: string | null
          discount_amount_cents: number | null
          applies_to: string
          product_id: string | null
          price_id: string | null
          max_redemptions_total: number | null
          max_redemptions_per_user: number | null
          starts_at: string | null
          ends_at: string | null
          active: boolean
          description: string | null
          public_show_remaining: boolean
          public_remaining_prefix: string | null
          public_remaining_suffix: string | null
          public_show_valid_until: boolean
          public_valid_until_prefix: string | null
          public_valid_until_suffix: string | null
          public_message_bands: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          discount_type: string
          discount_percent?: string | null
          discount_amount_cents?: number | null
          applies_to: string
          product_id?: string | null
          price_id?: string | null
          max_redemptions_total?: number | null
          max_redemptions_per_user?: number | null
          starts_at?: string | null
          ends_at?: string | null
          active?: boolean
          description?: string | null
          public_show_remaining?: boolean
          public_remaining_prefix?: string | null
          public_remaining_suffix?: string | null
          public_show_valid_until?: boolean
          public_valid_until_prefix?: string | null
          public_valid_until_suffix?: string | null
          public_message_bands?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          discount_type?: string
          discount_percent?: string | null
          discount_amount_cents?: number | null
          applies_to?: string
          product_id?: string | null
          price_id?: string | null
          max_redemptions_total?: number | null
          max_redemptions_per_user?: number | null
          starts_at?: string | null
          ends_at?: string | null
          active?: boolean
          description?: string | null
          public_show_remaining?: boolean
          public_remaining_prefix?: string | null
          public_remaining_suffix?: string | null
          public_show_valid_until?: boolean
          public_valid_until_prefix?: string | null
          public_valid_until_suffix?: string | null
          public_message_bands?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'discount_coupons_price_id_fkey'
            columns: ['price_id']
            isOneToOne: false
            referencedRelation: 'prices'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'discount_coupons_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }
      asaas_payments: {
        Row: {
          amount_cents: number
          asaas_checkout_id: string | null
          asaas_customer_id: string
          asaas_installment_id: string | null
          asaas_payment_id: string | null
          billing_type: string
          boleto_url: string | null
          confirmation_email_sent_at: string | null
          created_at: string | null
          due_date: string | null
          id: string
          installments: number | null
          installments_data: Json | null
          metadata: Json | null
          order_id: string | null
          paid_at: string | null
          payment_method: string | null
          pix_qr_code: string | null
          price_id: string
          product_id: string
          refund_amount: number | null
          refunded_at: string | null
          status: string | null
          subscription_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount_cents: number
          asaas_checkout_id?: string | null
          asaas_customer_id: string
          asaas_installment_id?: string | null
          asaas_payment_id?: string | null
          billing_type: string
          boleto_url?: string | null
          confirmation_email_sent_at?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          installments?: number | null
          installments_data?: Json | null
          metadata?: Json | null
          order_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          pix_qr_code?: string | null
          price_id: string
          product_id: string
          refund_amount?: number | null
          refunded_at?: string | null
          status?: string | null
          subscription_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number
          asaas_checkout_id?: string | null
          asaas_customer_id?: string
          asaas_installment_id?: string | null
          asaas_payment_id?: string | null
          billing_type?: string
          boleto_url?: string | null
          confirmation_email_sent_at?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          installments?: number | null
          installments_data?: Json | null
          metadata?: Json | null
          order_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          pix_qr_code?: string | null
          price_id?: string
          product_id?: string
          refund_amount?: number | null
          refunded_at?: string | null
          status?: string | null
          subscription_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asaas_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asaas_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_with_relations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asaas_payments_price_id_fkey"
            columns: ["price_id"]
            isOneToOne: false
            referencedRelation: "orders_with_relations"
            referencedColumns: ["price_id_rel"]
          },
          {
            foreignKeyName: "asaas_payments_price_id_fkey"
            columns: ["price_id"]
            isOneToOne: false
            referencedRelation: "prices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asaas_payments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "orders_with_relations"
            referencedColumns: ["product_id_rel"]
          },
          {
            foreignKeyName: "asaas_payments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asaas_payments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_with_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asaas_payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asaas_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          body_html: string | null
          body_text: string | null
          cc: string[] | null
          created_at: string | null
          error_message: string | null
          from_email: string | null
          from_name: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          order_id: string | null
          recipient: string
          reply_to: string | null
          status: string
          subject: string
          updated_at: string | null
          webhook_event_id: string | null
        }
        Insert: {
          body_html?: string | null
          body_text?: string | null
          cc?: string[] | null
          created_at?: string | null
          error_message?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          order_id?: string | null
          recipient: string
          reply_to?: string | null
          status: string
          subject: string
          updated_at?: string | null
          webhook_event_id?: string | null
        }
        Update: {
          body_html?: string | null
          body_text?: string | null
          cc?: string[] | null
          created_at?: string | null
          error_message?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          order_id?: string | null
          recipient?: string
          reply_to?: string | null
          status?: string
          subject?: string
          updated_at?: string | null
          webhook_event_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_with_relations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_webhook_event_id_fkey"
            columns: ["webhook_event_id"]
            isOneToOne: false
            referencedRelation: "webhook_events"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_cents: number
          cancelled_at: string | null
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          expires_at: string | null
          id: string
          metadata: Json | null
          order_type: string
          paid_at: string | null
          payment_gateway: string
          payment_method: string | null
          price_id: string
          product_id: string
          refunded_at: string | null
          status: string
          subscription_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount_cents: number
          cancelled_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          order_type: string
          paid_at?: string | null
          payment_gateway: string
          payment_method?: string | null
          price_id: string
          product_id: string
          refunded_at?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number
          cancelled_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          order_type?: string
          paid_at?: string | null
          payment_gateway?: string
          payment_method?: string | null
          price_id?: string
          product_id?: string
          refunded_at?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_price_id_fkey"
            columns: ["price_id"]
            isOneToOne: false
            referencedRelation: "orders_with_relations"
            referencedColumns: ["price_id_rel"]
          },
          {
            foreignKeyName: "orders_price_id_fkey"
            columns: ["price_id"]
            isOneToOne: false
            referencedRelation: "prices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "orders_with_relations"
            referencedColumns: ["product_id_rel"]
          },
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_with_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      pagarme_payments: {
        Row: {
          amount_cents: number
          boleto_barcode: string | null
          boleto_line: string | null
          boleto_url: string | null
          confirmation_email_sent_at: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          metadata: Json | null
          order_id: string | null
          paid_at: string | null
          payment_link_id: string
          payment_link_url: string
          payment_method: string | null
          pix_code: string | null
          pix_qr_code: string | null
          price_id: string
          product_id: string
          status: string | null
          subscription_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount_cents: number
          boleto_barcode?: string | null
          boleto_line?: string | null
          boleto_url?: string | null
          confirmation_email_sent_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          paid_at?: string | null
          payment_link_id: string
          payment_link_url: string
          payment_method?: string | null
          pix_code?: string | null
          pix_qr_code?: string | null
          price_id: string
          product_id: string
          status?: string | null
          subscription_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number
          boleto_barcode?: string | null
          boleto_line?: string | null
          boleto_url?: string | null
          confirmation_email_sent_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          paid_at?: string | null
          payment_link_id?: string
          payment_link_url?: string
          payment_method?: string | null
          pix_code?: string | null
          pix_qr_code?: string | null
          price_id?: string
          product_id?: string
          status?: string | null
          subscription_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pagarme_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagarme_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_with_relations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagarme_payments_price_id_fkey"
            columns: ["price_id"]
            isOneToOne: false
            referencedRelation: "orders_with_relations"
            referencedColumns: ["price_id_rel"]
          },
          {
            foreignKeyName: "pagarme_payments_price_id_fkey"
            columns: ["price_id"]
            isOneToOne: false
            referencedRelation: "prices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagarme_payments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "orders_with_relations"
            referencedColumns: ["product_id_rel"]
          },
          {
            foreignKeyName: "pagarme_payments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagarme_payments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_with_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagarme_payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagarme_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prices: {
        Row: {
          active: boolean | null
          amount: number
          created_at: string | null
          currency: string | null
          id: string
          interval: string | null
          interval_count: number | null
          metadata: Json | null
          product_id: string | null
          recurring: boolean | null
          ref: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          amount: number
          created_at?: string | null
          currency?: string | null
          id?: string
          interval?: string | null
          interval_count?: number | null
          metadata?: Json | null
          product_id?: string | null
          recurring?: boolean | null
          ref: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          amount?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          interval?: string | null
          interval_count?: number | null
          metadata?: Json | null
          product_id?: string | null
          recurring?: boolean | null
          ref?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "orders_with_relations"
            referencedColumns: ["product_id_rel"]
          },
          {
            foreignKeyName: "prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_with_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          email_config: Json | null
          id: string
          metadata: Json | null
          name: string
          payment_methods: Json | null
          ref: string
          refund_policy: Json | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          email_config?: Json | null
          id?: string
          metadata?: Json | null
          name: string
          payment_methods?: Json | null
          ref: string
          refund_policy?: Json | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          email_config?: Json | null
          id?: string
          metadata?: Json | null
          name?: string
          payment_methods?: Json | null
          ref?: string
          refund_policy?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          billing_city: string | null
          billing_complement: string | null
          billing_country: string | null
          billing_neighborhood: string | null
          billing_number: string | null
          billing_state: string | null
          billing_street: string | null
          billing_zip: string | null
          company_document: string | null
          company_name: string | null
          created_at: string | null
          document: string | null
          email: string
          id: string
          metadata: Json | null
          municipal_registration: string | null
          name: string
          person_type: string | null
          phone: string | null
          state_registration: string | null
          updated_at: string | null
        }
        Insert: {
          billing_city?: string | null
          billing_complement?: string | null
          billing_country?: string | null
          billing_neighborhood?: string | null
          billing_number?: string | null
          billing_state?: string | null
          billing_street?: string | null
          billing_zip?: string | null
          company_document?: string | null
          company_name?: string | null
          created_at?: string | null
          document?: string | null
          email: string
          id: string
          metadata?: Json | null
          municipal_registration?: string | null
          name: string
          person_type?: string | null
          phone?: string | null
          state_registration?: string | null
          updated_at?: string | null
        }
        Update: {
          billing_city?: string | null
          billing_complement?: string | null
          billing_country?: string | null
          billing_neighborhood?: string | null
          billing_number?: string | null
          billing_state?: string | null
          billing_street?: string | null
          billing_zip?: string | null
          company_document?: string | null
          company_name?: string | null
          created_at?: string | null
          document?: string | null
          email?: string
          id?: string
          metadata?: Json | null
          municipal_registration?: string | null
          name?: string
          person_type?: string | null
          phone?: string | null
          state_registration?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          metadata: Json | null
          price_id: string
          status: Database["payments"]["Enums"]["subscription_status"] | null
          trial_end: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          metadata?: Json | null
          price_id: string
          status?: Database["payments"]["Enums"]["subscription_status"] | null
          trial_end?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          metadata?: Json | null
          price_id?: string
          status?: Database["payments"]["Enums"]["subscription_status"] | null
          trial_end?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_price_id_fkey"
            columns: ["price_id"]
            isOneToOne: false
            referencedRelation: "orders_with_relations"
            referencedColumns: ["price_id_rel"]
          },
          {
            foreignKeyName: "subscriptions_price_id_fkey"
            columns: ["price_id"]
            isOneToOne: false
            referencedRelation: "prices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          created_at: string
          event_type: string | null
          headers: Json | null
          id: string
          payload: Json | null
          processing_log: string | null
          processing_status: string | null
          provider: string
        }
        Insert: {
          created_at?: string
          event_type?: string | null
          headers?: Json | null
          id?: string
          payload?: Json | null
          processing_log?: string | null
          processing_status?: string | null
          provider: string
        }
        Update: {
          created_at?: string
          event_type?: string | null
          headers?: Json | null
          id?: string
          payload?: Json | null
          processing_log?: string | null
          processing_status?: string | null
          provider?: string
        }
        Relationships: []
      }
    }
    Views: {
      orders_with_relations: {
        Row: {
          amount_cents: number | null
          cancelled_at: string | null
          created_at: string | null
          deleted_at: string | null
          expires_at: string | null
          id: string | null
          metadata: Json | null
          order_type: string | null
          paid_at: string | null
          payment_gateway: string | null
          payment_method: string | null
          price_amount: number | null
          price_currency: string | null
          price_id: string | null
          price_id_rel: string | null
          price_interval: string | null
          price_interval_count: number | null
          price_recurring: boolean | null
          product_description: string | null
          product_id: string | null
          product_id_rel: string | null
          product_name: string | null
          product_ref: string | null
          refunded_at: string | null
          status: string | null
          subscription_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_price_id_fkey"
            columns: ["price_id"]
            isOneToOne: false
            referencedRelation: "orders_with_relations"
            referencedColumns: ["price_id_rel"]
          },
          {
            foreignKeyName: "orders_price_id_fkey"
            columns: ["price_id"]
            isOneToOne: false
            referencedRelation: "prices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "orders_with_relations"
            referencedColumns: ["product_id_rel"]
          },
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_with_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      products_with_policies: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          has_refund_policy: boolean | null
          id: string | null
          metadata: Json | null
          name: string | null
          ref: string | null
          refund_policy: Json | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          has_refund_policy?: never
          id?: string | null
          metadata?: Json | null
          name?: string | null
          ref?: string | null
          refund_policy?: never
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          has_refund_policy?: never
          id?: string | null
          metadata?: Json | null
          name?: string | null
          ref?: string | null
          refund_policy?: never
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      cleanup_expired_payments: { Args: never; Returns: number }
      get_current_admin: {
        Args: never
        Returns: {
          email: string
          id: string
          is_active: boolean
          name: string
          role: string
        }[]
      }
      get_current_profile: {
        Args: never
        Returns: {
          billing_city: string | null
          billing_complement: string | null
          billing_country: string | null
          billing_neighborhood: string | null
          billing_number: string | null
          billing_state: string | null
          billing_street: string | null
          billing_zip: string | null
          company_document: string | null
          company_name: string | null
          created_at: string | null
          document: string | null
          email: string
          id: string
          metadata: Json | null
          municipal_registration: string | null
          name: string
          person_type: string | null
          phone: string | null
          state_registration: string | null
          updated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_pending_pagarme_payment: {
        Args: { p_product_ref: string; p_user_id: string }
        Returns: {
          expires_at: string
          id: string
          payment_link_url: string
          status: string
        }[]
      }
      get_product_refund_policy: {
        Args: { product_ref: string }
        Returns: Json
      }
      get_sales_stats: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: {
          avg_ticket: number
          conversion_rate: number
          total_revenue: number
          total_sales: number
        }[]
      }
      is_admin_user: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      upsert_profile: {
        Args: {
          user_billing_city?: string
          user_billing_complement?: string
          user_billing_country?: string
          user_billing_neighborhood?: string
          user_billing_number?: string
          user_billing_state?: string
          user_billing_street?: string
          user_billing_zip?: string
          user_company_document?: string
          user_company_name?: string
          user_document?: string
          user_email: string
          user_id: string
          user_metadata?: Json
          user_municipal_registration?: string
          user_name: string
          user_person_type?: string
          user_phone?: string
          user_state_registration?: string
        }
        Returns: {
          billing_city: string | null
          billing_complement: string | null
          billing_country: string | null
          billing_neighborhood: string | null
          billing_number: string | null
          billing_state: string | null
          billing_street: string | null
          billing_zip: string | null
          company_document: string | null
          company_name: string | null
          created_at: string | null
          document: string | null
          email: string
          id: string
          metadata: Json | null
          municipal_registration: string | null
          name: string
          person_type: string | null
          phone: string | null
          state_registration: string | null
          updated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      validate_refund_policy: { Args: { policy: Json }; Returns: boolean }
    }
    Enums: {
      subscription_status:
        | "incomplete"
        | "active"
        | "past_due"
        | "canceled"
        | "unpaid"
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
  payments: {
    Enums: {
      subscription_status: [
        "incomplete",
        "active",
        "past_due",
        "canceled",
        "unpaid",
      ],
    },
  },
} as const

