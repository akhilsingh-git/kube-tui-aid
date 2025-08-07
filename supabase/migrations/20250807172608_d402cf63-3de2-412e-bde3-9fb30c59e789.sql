-- Create tables for smart detection and alerts
CREATE TABLE public.cluster_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cluster_id UUID NOT NULL REFERENCES public.cluster_configs(id) ON DELETE CASCADE,
  event_uid TEXT NOT NULL,
  namespace TEXT NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  reason TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- Normal, Warning
  source_component TEXT,
  source_host TEXT,
  first_timestamp TIMESTAMP WITH TIME ZONE,
  last_timestamp TIMESTAMP WITH TIME ZONE,
  count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(cluster_id, event_uid)
);

-- Create alerts table for smart suggestions
CREATE TABLE public.smart_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cluster_id UUID NOT NULL REFERENCES public.cluster_configs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL, -- 'oomkill', 'crash_loop', 'liveness_failed', 'node_pressure'
  severity TEXT NOT NULL, -- 'critical', 'warning', 'info'
  resource_type TEXT NOT NULL, -- 'pod', 'node', 'deployment'
  resource_name TEXT NOT NULL,
  namespace TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  suggestion TEXT,
  related_events JSONB,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pod health tracking table
CREATE TABLE public.pod_health (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cluster_id UUID NOT NULL REFERENCES public.cluster_configs(id) ON DELETE CASCADE,
  pod_name TEXT NOT NULL,
  namespace TEXT NOT NULL,
  restart_count INTEGER DEFAULT 0,
  last_restart_time TIMESTAMP WITH TIME ZONE,
  exit_code INTEGER,
  exit_reason TEXT,
  container_name TEXT,
  oom_killed BOOLEAN DEFAULT false,
  status TEXT NOT NULL, -- Running, Pending, Failed, Succeeded, Unknown
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(cluster_id, pod_name, namespace, container_name)
);

-- Enable RLS
ALTER TABLE public.cluster_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pod_health ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for cluster_events
CREATE POLICY "Users can view events from their clusters" 
ON public.cluster_events 
FOR SELECT 
USING (
  cluster_id IN (
    SELECT id FROM public.cluster_configs WHERE user_id = auth.uid()
  )
);

CREATE POLICY "System can insert cluster events" 
ON public.cluster_events 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update cluster events" 
ON public.cluster_events 
FOR UPDATE 
USING (true);

-- Create RLS policies for smart_alerts
CREATE POLICY "Users can view their own alerts" 
ON public.smart_alerts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts" 
ON public.smart_alerts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert alerts" 
ON public.smart_alerts 
FOR INSERT 
WITH CHECK (true);

-- Create RLS policies for pod_health
CREATE POLICY "Users can view pod health from their clusters" 
ON public.pod_health 
FOR SELECT 
USING (
  cluster_id IN (
    SELECT id FROM public.cluster_configs WHERE user_id = auth.uid()
  )
);

CREATE POLICY "System can manage pod health" 
ON public.pod_health 
FOR ALL 
USING (true);

-- Create triggers for updated_at
CREATE TRIGGER update_smart_alerts_updated_at
  BEFORE UPDATE ON public.smart_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pod_health_updated_at
  BEFORE UPDATE ON public.pod_health
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_cluster_events_cluster_timestamp ON public.cluster_events(cluster_id, created_at DESC);
CREATE INDEX idx_cluster_events_reason ON public.cluster_events(reason);
CREATE INDEX idx_smart_alerts_user_unresolved ON public.smart_alerts(user_id, is_resolved, created_at DESC);
CREATE INDEX idx_pod_health_cluster_status ON public.pod_health(cluster_id, status);
CREATE INDEX idx_pod_health_restart_count ON public.pod_health(restart_count DESC);