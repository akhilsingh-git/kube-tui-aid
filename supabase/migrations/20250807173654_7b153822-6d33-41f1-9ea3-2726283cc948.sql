-- Create tables for metrics and monitoring integration
CREATE TABLE public.cluster_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cluster_id UUID NOT NULL REFERENCES public.cluster_configs(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL, -- 'cpu', 'memory', 'disk', 'network', 'pod_count'
  metric_name TEXT NOT NULL, -- specific prometheus metric name
  value NUMERIC NOT NULL,
  unit TEXT, -- 'bytes', 'percentage', 'count', etc.
  node_name TEXT,
  namespace TEXT,
  resource_name TEXT,
  labels JSONB, -- prometheus labels as JSON
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cluster health scores table
CREATE TABLE public.cluster_health_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cluster_id UUID NOT NULL REFERENCES public.cluster_configs(id) ON DELETE CASCADE,
  overall_score NUMERIC(5,2) NOT NULL, -- 0.00 to 100.00
  cpu_score NUMERIC(5,2) NOT NULL,
  memory_score NUMERIC(5,2) NOT NULL,
  disk_score NUMERIC(5,2) NOT NULL,
  network_score NUMERIC(5,2) NOT NULL,
  pod_health_score NUMERIC(5,2) NOT NULL,
  node_count INTEGER NOT NULL,
  healthy_nodes INTEGER NOT NULL,
  total_pods INTEGER NOT NULL,
  healthy_pods INTEGER NOT NULL,
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(cluster_id, calculated_at)
);

-- Create real-time alerts table for monitoring thresholds
CREATE TABLE public.monitoring_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cluster_id UUID NOT NULL REFERENCES public.cluster_configs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL, -- 'cpu_pressure', 'memory_pressure', 'disk_pressure', 'node_down'
  severity TEXT NOT NULL, -- 'critical', 'warning', 'info'
  threshold_value NUMERIC NOT NULL,
  current_value NUMERIC NOT NULL,
  node_name TEXT,
  resource_name TEXT,
  message TEXT NOT NULL,
  acknowledged BOOLEAN DEFAULT false,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create prometheus targets configuration
CREATE TABLE public.prometheus_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cluster_id UUID NOT NULL REFERENCES public.cluster_configs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  endpoint TEXT NOT NULL, -- prometheus query API endpoint
  auth_token TEXT, -- if prometheus requires authentication
  scrape_interval INTEGER DEFAULT 60, -- seconds between scrapes
  enabled BOOLEAN DEFAULT true,
  last_scrape_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cluster_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cluster_health_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prometheus_targets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for cluster_metrics
CREATE POLICY "Users can view metrics from their clusters" 
ON public.cluster_metrics 
FOR SELECT 
USING (
  cluster_id IN (
    SELECT id FROM public.cluster_configs WHERE user_id = auth.uid()
  )
);

CREATE POLICY "System can insert cluster metrics" 
ON public.cluster_metrics 
FOR INSERT 
WITH CHECK (true);

-- Create RLS policies for cluster_health_scores
CREATE POLICY "Users can view health scores from their clusters" 
ON public.cluster_health_scores 
FOR SELECT 
USING (
  cluster_id IN (
    SELECT id FROM public.cluster_configs WHERE user_id = auth.uid()
  )
);

CREATE POLICY "System can manage health scores" 
ON public.cluster_health_scores 
FOR ALL 
USING (true);

-- Create RLS policies for monitoring_alerts
CREATE POLICY "Users can view their monitoring alerts" 
ON public.monitoring_alerts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their monitoring alerts" 
ON public.monitoring_alerts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert monitoring alerts" 
ON public.monitoring_alerts 
FOR INSERT 
WITH CHECK (true);

-- Create RLS policies for prometheus_targets
CREATE POLICY "Users can view prometheus targets from their clusters" 
ON public.prometheus_targets 
FOR SELECT 
USING (
  cluster_id IN (
    SELECT id FROM public.cluster_configs WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage prometheus targets for their clusters" 
ON public.prometheus_targets 
FOR ALL 
USING (
  cluster_id IN (
    SELECT id FROM public.cluster_configs WHERE user_id = auth.uid()
  )
);

-- Create triggers for updated_at
CREATE TRIGGER update_monitoring_alerts_updated_at
  BEFORE UPDATE ON public.monitoring_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prometheus_targets_updated_at
  BEFORE UPDATE ON public.prometheus_targets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_cluster_metrics_cluster_time ON public.cluster_metrics(cluster_id, timestamp DESC);
CREATE INDEX idx_cluster_metrics_type ON public.cluster_metrics(metric_type, timestamp DESC);
CREATE INDEX idx_cluster_health_scores_cluster ON public.cluster_health_scores(cluster_id, calculated_at DESC);
CREATE INDEX idx_monitoring_alerts_user_unresolved ON public.monitoring_alerts(user_id, resolved, created_at DESC);
CREATE INDEX idx_monitoring_alerts_cluster ON public.monitoring_alerts(cluster_id, severity, created_at DESC);
CREATE INDEX idx_prometheus_targets_cluster ON public.prometheus_targets(cluster_id, enabled);