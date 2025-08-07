-- Create tables for trend analysis and event correlation
CREATE TABLE public.pod_restart_trends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cluster_id UUID NOT NULL REFERENCES public.cluster_configs(id) ON DELETE CASCADE,
  pod_name TEXT NOT NULL,
  namespace TEXT NOT NULL,
  time_window TIMESTAMP WITH TIME ZONE NOT NULL, -- hourly aggregation
  restart_count INTEGER NOT NULL,
  avg_restart_interval INTERVAL,
  trend_direction TEXT NOT NULL, -- 'increasing', 'decreasing', 'stable'
  trend_score NUMERIC(5,2), -- -1.0 to 1.0, higher = more concerning
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(cluster_id, pod_name, namespace, time_window)
);

-- Create event correlation table
CREATE TABLE public.event_correlations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cluster_id UUID NOT NULL REFERENCES public.cluster_configs(id) ON DELETE CASCADE,
  correlation_id TEXT NOT NULL, -- unique identifier for related events
  primary_event_id UUID NOT NULL REFERENCES public.cluster_events(id) ON DELETE CASCADE,
  related_event_ids UUID[] NOT NULL,
  root_cause_analysis TEXT,
  confidence_score NUMERIC(3,2), -- 0.0 to 1.0
  correlation_type TEXT NOT NULL, -- 'cascade', 'resource_contention', 'network', 'configuration'
  affected_resources JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(cluster_id, correlation_id)
);

-- Create AI analysis cache table
CREATE TABLE public.ai_analysis_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cluster_id UUID NOT NULL REFERENCES public.cluster_configs(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL, -- 'event_correlation', 'suggestion_generation', 'trend_analysis'
  input_hash TEXT NOT NULL, -- hash of input data to avoid recomputation
  analysis_result JSONB NOT NULL,
  confidence_score NUMERIC(3,2),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '1 hour'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(analysis_type, input_hash)
);

-- Create intelligent suggestions table
CREATE TABLE public.intelligent_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id UUID NOT NULL REFERENCES public.smart_alerts(id) ON DELETE CASCADE,
  suggestion_type TEXT NOT NULL, -- 'immediate', 'preventive', 'optimization'
  priority INTEGER NOT NULL, -- 1-5, 1 being highest
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  action_steps JSONB NOT NULL, -- array of actionable steps
  estimated_impact TEXT, -- 'high', 'medium', 'low'
  implementation_difficulty TEXT, -- 'easy', 'medium', 'hard'
  ai_confidence NUMERIC(3,2), -- AI confidence in this suggestion
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pod_restart_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_correlations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analysis_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intelligent_suggestions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view trends from their clusters" 
ON public.pod_restart_trends 
FOR SELECT 
USING (
  cluster_id IN (
    SELECT id FROM public.cluster_configs WHERE user_id = auth.uid()
  )
);

CREATE POLICY "System can manage pod restart trends" 
ON public.pod_restart_trends 
FOR ALL 
USING (true);

CREATE POLICY "Users can view correlations from their clusters" 
ON public.event_correlations 
FOR SELECT 
USING (
  cluster_id IN (
    SELECT id FROM public.cluster_configs WHERE user_id = auth.uid()
  )
);

CREATE POLICY "System can manage event correlations" 
ON public.event_correlations 
FOR ALL 
USING (true);

CREATE POLICY "System can manage AI analysis cache" 
ON public.ai_analysis_cache 
FOR ALL 
USING (true);

CREATE POLICY "Users can view suggestions for their alerts" 
ON public.intelligent_suggestions 
FOR SELECT 
USING (
  alert_id IN (
    SELECT id FROM public.smart_alerts WHERE user_id = auth.uid()
  )
);

CREATE POLICY "System can manage intelligent suggestions" 
ON public.intelligent_suggestions 
FOR ALL 
USING (true);

-- Create indexes for performance
CREATE INDEX idx_pod_restart_trends_cluster_time ON public.pod_restart_trends(cluster_id, time_window DESC);
CREATE INDEX idx_pod_restart_trends_score ON public.pod_restart_trends(trend_score DESC);
CREATE INDEX idx_event_correlations_cluster ON public.event_correlations(cluster_id, created_at DESC);
CREATE INDEX idx_event_correlations_confidence ON public.event_correlations(confidence_score DESC);
CREATE INDEX idx_ai_analysis_cache_hash ON public.ai_analysis_cache(input_hash);
CREATE INDEX idx_ai_analysis_cache_expires ON public.ai_analysis_cache(expires_at);
CREATE INDEX idx_intelligent_suggestions_alert ON public.intelligent_suggestions(alert_id, priority);