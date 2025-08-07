-- Create incident timeline tracking table
CREATE TABLE public.incident_timelines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  cluster_id UUID NOT NULL,
  incident_title TEXT NOT NULL,
  incident_description TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  assigned_to TEXT,
  affected_resources JSONB,
  timeline_events JSONB NOT NULL DEFAULT '[]'::jsonb,
  slack_thread_ts TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create team notification preferences table
CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  cluster_id UUID,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('slack', 'email', 'sms')),
  channel_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  severity_threshold TEXT NOT NULL DEFAULT 'medium' CHECK (severity_threshold IN ('low', 'medium', 'high', 'critical')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Slack webhook configurations table
CREATE TABLE public.slack_webhooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  cluster_id UUID,
  webhook_url TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.incident_timelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slack_webhooks ENABLE ROW LEVEL SECURITY;

-- RLS policies for incident_timelines
CREATE POLICY "Users can view their own incidents" 
ON public.incident_timelines 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own incidents" 
ON public.incident_timelines 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own incidents" 
ON public.incident_timelines 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own incidents" 
ON public.incident_timelines 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for notification_preferences
CREATE POLICY "Users can view their own notification preferences" 
ON public.notification_preferences 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notification preferences" 
ON public.notification_preferences 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences" 
ON public.notification_preferences 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notification preferences" 
ON public.notification_preferences 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for slack_webhooks
CREATE POLICY "Users can view their own slack webhooks" 
ON public.slack_webhooks 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own slack webhooks" 
ON public.slack_webhooks 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own slack webhooks" 
ON public.slack_webhooks 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own slack webhooks" 
ON public.slack_webhooks 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_incident_timelines_user_cluster ON public.incident_timelines(user_id, cluster_id);
CREATE INDEX idx_incident_timelines_status ON public.incident_timelines(status);
CREATE INDEX idx_incident_timelines_severity ON public.incident_timelines(severity);
CREATE INDEX idx_notification_preferences_user ON public.notification_preferences(user_id);
CREATE INDEX idx_slack_webhooks_user ON public.slack_webhooks(user_id);

-- Create trigger for updating timestamps
CREATE TRIGGER update_incident_timelines_updated_at
BEFORE UPDATE ON public.incident_timelines
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_slack_webhooks_updated_at
BEFORE UPDATE ON public.slack_webhooks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();