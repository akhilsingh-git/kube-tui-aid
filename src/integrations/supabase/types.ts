export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      ai_analysis_cache: {
        Row: {
          analysis_result: Json
          analysis_type: string
          cluster_id: string
          confidence_score: number | null
          created_at: string
          expires_at: string
          id: string
          input_hash: string
        }
        Insert: {
          analysis_result: Json
          analysis_type: string
          cluster_id: string
          confidence_score?: number | null
          created_at?: string
          expires_at?: string
          id?: string
          input_hash: string
        }
        Update: {
          analysis_result?: Json
          analysis_type?: string
          cluster_id?: string
          confidence_score?: number | null
          created_at?: string
          expires_at?: string
          id?: string
          input_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_analysis_cache_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "cluster_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      cluster_configs: {
        Row: {
          certificate_authority_data: string | null
          created_at: string
          endpoint: string
          id: string
          is_active: boolean | null
          name: string
          namespace: string | null
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          certificate_authority_data?: string | null
          created_at?: string
          endpoint: string
          id?: string
          is_active?: boolean | null
          name: string
          namespace?: string | null
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          certificate_authority_data?: string | null
          created_at?: string
          endpoint?: string
          id?: string
          is_active?: boolean | null
          name?: string
          namespace?: string | null
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cluster_events: {
        Row: {
          cluster_id: string
          count: number | null
          created_at: string
          event_uid: string
          first_timestamp: string | null
          id: string
          kind: string
          last_timestamp: string | null
          message: string
          name: string
          namespace: string
          reason: string
          source_component: string | null
          source_host: string | null
          type: string
        }
        Insert: {
          cluster_id: string
          count?: number | null
          created_at?: string
          event_uid: string
          first_timestamp?: string | null
          id?: string
          kind: string
          last_timestamp?: string | null
          message: string
          name: string
          namespace: string
          reason: string
          source_component?: string | null
          source_host?: string | null
          type: string
        }
        Update: {
          cluster_id?: string
          count?: number | null
          created_at?: string
          event_uid?: string
          first_timestamp?: string | null
          id?: string
          kind?: string
          last_timestamp?: string | null
          message?: string
          name?: string
          namespace?: string
          reason?: string
          source_component?: string | null
          source_host?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "cluster_events_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "cluster_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      cluster_health_scores: {
        Row: {
          calculated_at: string
          cluster_id: string
          cpu_score: number
          created_at: string
          disk_score: number
          healthy_nodes: number
          healthy_pods: number
          id: string
          memory_score: number
          network_score: number
          node_count: number
          overall_score: number
          pod_health_score: number
          total_pods: number
        }
        Insert: {
          calculated_at?: string
          cluster_id: string
          cpu_score: number
          created_at?: string
          disk_score: number
          healthy_nodes: number
          healthy_pods: number
          id?: string
          memory_score: number
          network_score: number
          node_count: number
          overall_score: number
          pod_health_score: number
          total_pods: number
        }
        Update: {
          calculated_at?: string
          cluster_id?: string
          cpu_score?: number
          created_at?: string
          disk_score?: number
          healthy_nodes?: number
          healthy_pods?: number
          id?: string
          memory_score?: number
          network_score?: number
          node_count?: number
          overall_score?: number
          pod_health_score?: number
          total_pods?: number
        }
        Relationships: [
          {
            foreignKeyName: "cluster_health_scores_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "cluster_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      cluster_metrics: {
        Row: {
          cluster_id: string
          created_at: string
          id: string
          labels: Json | null
          metric_name: string
          metric_type: string
          namespace: string | null
          node_name: string | null
          resource_name: string | null
          timestamp: string
          unit: string | null
          value: number
        }
        Insert: {
          cluster_id: string
          created_at?: string
          id?: string
          labels?: Json | null
          metric_name: string
          metric_type: string
          namespace?: string | null
          node_name?: string | null
          resource_name?: string | null
          timestamp?: string
          unit?: string | null
          value: number
        }
        Update: {
          cluster_id?: string
          created_at?: string
          id?: string
          labels?: Json | null
          metric_name?: string
          metric_type?: string
          namespace?: string | null
          node_name?: string | null
          resource_name?: string | null
          timestamp?: string
          unit?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "cluster_metrics_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "cluster_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      event_correlations: {
        Row: {
          affected_resources: Json | null
          cluster_id: string
          confidence_score: number | null
          correlation_id: string
          correlation_type: string
          created_at: string
          id: string
          primary_event_id: string
          related_event_ids: string[]
          root_cause_analysis: string | null
        }
        Insert: {
          affected_resources?: Json | null
          cluster_id: string
          confidence_score?: number | null
          correlation_id: string
          correlation_type: string
          created_at?: string
          id?: string
          primary_event_id: string
          related_event_ids: string[]
          root_cause_analysis?: string | null
        }
        Update: {
          affected_resources?: Json | null
          cluster_id?: string
          confidence_score?: number | null
          correlation_id?: string
          correlation_type?: string
          created_at?: string
          id?: string
          primary_event_id?: string
          related_event_ids?: string[]
          root_cause_analysis?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_correlations_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "cluster_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_correlations_primary_event_id_fkey"
            columns: ["primary_event_id"]
            isOneToOne: false
            referencedRelation: "cluster_events"
            referencedColumns: ["id"]
          },
        ]
      }
      intelligent_suggestions: {
        Row: {
          action_steps: Json
          ai_confidence: number | null
          alert_id: string
          created_at: string
          description: string
          estimated_impact: string | null
          id: string
          implementation_difficulty: string | null
          priority: number
          suggestion_type: string
          title: string
        }
        Insert: {
          action_steps: Json
          ai_confidence?: number | null
          alert_id: string
          created_at?: string
          description: string
          estimated_impact?: string | null
          id?: string
          implementation_difficulty?: string | null
          priority: number
          suggestion_type: string
          title: string
        }
        Update: {
          action_steps?: Json
          ai_confidence?: number | null
          alert_id?: string
          created_at?: string
          description?: string
          estimated_impact?: string | null
          id?: string
          implementation_difficulty?: string | null
          priority?: number
          suggestion_type?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "intelligent_suggestions_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "smart_alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      kubectl_logs: {
        Row: {
          cluster_id: string
          command: string
          error: string | null
          executed_at: string
          id: string
          output: string | null
          user_id: string
        }
        Insert: {
          cluster_id: string
          command: string
          error?: string | null
          executed_at?: string
          id?: string
          output?: string | null
          user_id: string
        }
        Update: {
          cluster_id?: string
          command?: string
          error?: string | null
          executed_at?: string
          id?: string
          output?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kubectl_logs_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "cluster_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      monitoring_alerts: {
        Row: {
          acknowledged: boolean | null
          alert_type: string
          cluster_id: string
          created_at: string
          current_value: number
          id: string
          message: string
          node_name: string | null
          resolved: boolean | null
          resolved_at: string | null
          resource_name: string | null
          severity: string
          threshold_value: number
          updated_at: string
          user_id: string
        }
        Insert: {
          acknowledged?: boolean | null
          alert_type: string
          cluster_id: string
          created_at?: string
          current_value: number
          id?: string
          message: string
          node_name?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resource_name?: string | null
          severity: string
          threshold_value: number
          updated_at?: string
          user_id: string
        }
        Update: {
          acknowledged?: boolean | null
          alert_type?: string
          cluster_id?: string
          created_at?: string
          current_value?: number
          id?: string
          message?: string
          node_name?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resource_name?: string | null
          severity?: string
          threshold_value?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monitoring_alerts_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "cluster_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      pod_health: {
        Row: {
          cluster_id: string
          container_name: string | null
          created_at: string
          exit_code: number | null
          exit_reason: string | null
          id: string
          last_restart_time: string | null
          namespace: string
          oom_killed: boolean | null
          pod_name: string
          restart_count: number | null
          status: string
          updated_at: string
        }
        Insert: {
          cluster_id: string
          container_name?: string | null
          created_at?: string
          exit_code?: number | null
          exit_reason?: string | null
          id?: string
          last_restart_time?: string | null
          namespace: string
          oom_killed?: boolean | null
          pod_name: string
          restart_count?: number | null
          status: string
          updated_at?: string
        }
        Update: {
          cluster_id?: string
          container_name?: string | null
          created_at?: string
          exit_code?: number | null
          exit_reason?: string | null
          id?: string
          last_restart_time?: string | null
          namespace?: string
          oom_killed?: boolean | null
          pod_name?: string
          restart_count?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pod_health_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "cluster_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      pod_restart_trends: {
        Row: {
          avg_restart_interval: unknown | null
          cluster_id: string
          created_at: string
          id: string
          namespace: string
          pod_name: string
          restart_count: number
          time_window: string
          trend_direction: string
          trend_score: number | null
        }
        Insert: {
          avg_restart_interval?: unknown | null
          cluster_id: string
          created_at?: string
          id?: string
          namespace: string
          pod_name: string
          restart_count: number
          time_window: string
          trend_direction: string
          trend_score?: number | null
        }
        Update: {
          avg_restart_interval?: unknown | null
          cluster_id?: string
          created_at?: string
          id?: string
          namespace?: string
          pod_name?: string
          restart_count?: number
          time_window?: string
          trend_direction?: string
          trend_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pod_restart_trends_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "cluster_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      prometheus_targets: {
        Row: {
          auth_token: string | null
          cluster_id: string
          created_at: string
          enabled: boolean | null
          endpoint: string
          id: string
          last_scrape_at: string | null
          name: string
          scrape_interval: number | null
          updated_at: string
        }
        Insert: {
          auth_token?: string | null
          cluster_id: string
          created_at?: string
          enabled?: boolean | null
          endpoint: string
          id?: string
          last_scrape_at?: string | null
          name: string
          scrape_interval?: number | null
          updated_at?: string
        }
        Update: {
          auth_token?: string | null
          cluster_id?: string
          created_at?: string
          enabled?: boolean | null
          endpoint?: string
          id?: string
          last_scrape_at?: string | null
          name?: string
          scrape_interval?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prometheus_targets_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "cluster_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      smart_alerts: {
        Row: {
          alert_type: string
          cluster_id: string
          created_at: string
          description: string
          id: string
          is_resolved: boolean | null
          namespace: string | null
          related_events: Json | null
          resolved_at: string | null
          resource_name: string
          resource_type: string
          severity: string
          suggestion: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_type: string
          cluster_id: string
          created_at?: string
          description: string
          id?: string
          is_resolved?: boolean | null
          namespace?: string | null
          related_events?: Json | null
          resolved_at?: string | null
          resource_name: string
          resource_type: string
          severity: string
          suggestion?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_type?: string
          cluster_id?: string
          created_at?: string
          description?: string
          id?: string
          is_resolved?: boolean | null
          namespace?: string | null
          related_events?: Json | null
          resolved_at?: string | null
          resource_name?: string
          resource_type?: string
          severity?: string
          suggestion?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "smart_alerts_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "cluster_configs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
