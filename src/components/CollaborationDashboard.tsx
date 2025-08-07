import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Slack, Bell, Clock, Users, AlertTriangle, CheckCircle } from "lucide-react";

interface SlackWebhook {
  id: string;
  webhook_url: string;
  channel_name: string;
  enabled: boolean;
  cluster_id?: string;
}

interface NotificationPreference {
  id: string;
  notification_type: string;
  severity_threshold: string;
  enabled: boolean;
  cluster_id?: string;
}

interface IncidentTimeline {
  id: string;
  incident_title: string;
  incident_description: string;
  severity: string;
  status: string;
  assigned_to?: string;
  timeline_events: any;
  started_at: string;
  resolved_at?: string;
}

interface ClusterConfig {
  id: string;
  name: string;
}

export function CollaborationDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("slack");
  
  // State for Slack configuration
  const [slackWebhooks, setSlackWebhooks] = useState<SlackWebhook[]>([]);
  const [newWebhook, setNewWebhook] = useState({ webhook_url: '', channel_name: '', cluster_id: '' });
  
  // State for notification preferences
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreference[]>([]);
  
  // State for incident timelines
  const [incidents, setIncidents] = useState<IncidentTimeline[]>([]);
  const [newIncident, setNewIncident] = useState({
    title: '',
    description: '',
    severity: 'medium',
    assigned_to: '',
    cluster_id: ''
  });
  
  // State for clusters
  const [clusters, setClusters] = useState<ClusterConfig[]>([]);
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSlackWebhooks();
      fetchNotificationPreferences();
      fetchIncidents();
      fetchClusters();
    }
  }, [user]);

  const fetchClusters = async () => {
    try {
      const { data, error } = await supabase
        .from('cluster_configs')
        .select('id, name')
        .eq('user_id', user?.id);

      if (error) throw error;
      setClusters(data || []);
    } catch (error) {
      console.error('Error fetching clusters:', error);
    }
  };

  const fetchSlackWebhooks = async () => {
    try {
      const { data, error } = await supabase
        .from('slack_webhooks')
        .select('*')
        .eq('user_id', user?.id);

      if (error) throw error;
      setSlackWebhooks(data || []);
    } catch (error) {
      console.error('Error fetching slack webhooks:', error);
    }
  };

  const fetchNotificationPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user?.id);

      if (error) throw error;
      setNotificationPrefs(data || []);
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
    }
  };

  const fetchIncidents = async () => {
    try {
      const { data, error } = await supabase
        .from('incident_timelines')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIncidents(data || []);
    } catch (error) {
      console.error('Error fetching incidents:', error);
    }
  };

  const addSlackWebhook = async () => {
    if (!newWebhook.webhook_url || !newWebhook.channel_name) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('slack_webhooks')
        .insert({
          user_id: user?.id,
          webhook_url: newWebhook.webhook_url,
          channel_name: newWebhook.channel_name,
          cluster_id: newWebhook.cluster_id || null,
          enabled: true
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Slack webhook added successfully",
      });

      setNewWebhook({ webhook_url: '', channel_name: '', cluster_id: '' });
      fetchSlackWebhooks();
    } catch (error) {
      console.error('Error adding slack webhook:', error);
      toast({
        title: "Error",
        description: "Failed to add Slack webhook",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleWebhook = async (id: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('slack_webhooks')
        .update({ enabled })
        .eq('id', id);

      if (error) throw error;
      fetchSlackWebhooks();
    } catch (error) {
      console.error('Error toggling webhook:', error);
    }
  };

  const updateNotificationPreference = async (type: string, threshold: string, enabled: boolean, clusterId?: string) => {
    try {
      const existingPref = notificationPrefs.find(p => 
        p.notification_type === type && 
        ((!p.cluster_id && !clusterId) || p.cluster_id === clusterId)
      );

      if (existingPref) {
        const { error } = await supabase
          .from('notification_preferences')
          .update({ severity_threshold: threshold, enabled })
          .eq('id', existingPref.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('notification_preferences')
          .insert({
            user_id: user?.id,
            notification_type: type,
            severity_threshold: threshold,
            enabled,
            cluster_id: clusterId || null
          });

        if (error) throw error;
      }

      fetchNotificationPreferences();
    } catch (error) {
      console.error('Error updating notification preference:', error);
    }
  };

  const createIncident = async () => {
    if (!newIncident.title || !newIncident.cluster_id) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('incident_timelines')
        .insert({
          user_id: user?.id,
          cluster_id: newIncident.cluster_id,
          incident_title: newIncident.title,
          incident_description: newIncident.description,
          severity: newIncident.severity,
          assigned_to: newIncident.assigned_to || null,
          timeline_events: [{
            timestamp: new Date().toISOString(),
            action: 'incident_created',
            details: 'Incident created',
            user_id: user?.id
          }]
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Incident created successfully",
      });

      setNewIncident({ title: '', description: '', severity: 'medium', assigned_to: '', cluster_id: '' });
      fetchIncidents();
    } catch (error) {
      console.error('Error creating incident:', error);
      toast({
        title: "Error",
        description: "Failed to create incident",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateIncidentStatus = async (id: string, status: string) => {
    try {
      const updates: any = { status };
      const timeline_event = {
        timestamp: new Date().toISOString(),
        action: 'status_changed',
        details: `Status changed to ${status}`,
        user_id: user?.id
      };

      if (status === 'resolved' || status === 'closed') {
        updates.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('incident_timelines')
        .update({
          ...updates,
          timeline_events: JSON.stringify([...JSON.parse(incidents.find(i => i.id === id)?.timeline_events || '[]'), timeline_event])
        })
        .eq('id', id);

      if (error) throw error;
      fetchIncidents();
    } catch (error) {
      console.error('Error updating incident status:', error);
    }
  };

  const testSlackNotification = async () => {
    try {
      const { error } = await supabase.functions.invoke('slack-integration', {
        body: {
          message: 'Test notification from Kubernetes monitoring dashboard',
          severity: 'medium',
          cluster_name: 'test-cluster',
          action: 'create'
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Test notification sent to Slack",
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast({
        title: "Error",
        description: "Failed to send test notification",
        variant: "destructive",
      });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'secondary';
      case 'closed': return 'secondary';
      case 'investigating': return 'default';
      case 'open': return 'destructive';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5" />
        <h2 className="text-2xl font-bold">Collaboration & Notifications</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="slack" className="flex items-center gap-2">
            <Slack className="h-4 w-4" />
            Slack Integration
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notification Preferences
          </TabsTrigger>
          <TabsTrigger value="incidents" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Incident Timeline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="slack" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Slack className="h-5 w-5" />
                Slack Webhook Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="webhook-url">Webhook URL *</Label>
                  <Input
                    id="webhook-url"
                    placeholder="https://hooks.slack.com/services/..."
                    value={newWebhook.webhook_url}
                    onChange={(e) => setNewWebhook({ ...newWebhook, webhook_url: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="channel-name">Channel Name *</Label>
                  <Input
                    id="channel-name"
                    placeholder="#alerts"
                    value={newWebhook.channel_name}
                    onChange={(e) => setNewWebhook({ ...newWebhook, channel_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="cluster-select">Cluster (Optional)</Label>
                  <Select value={newWebhook.cluster_id} onValueChange={(value) => setNewWebhook({ ...newWebhook, cluster_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="All clusters" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All clusters</SelectItem>
                      {clusters.map((cluster) => (
                        <SelectItem key={cluster.id} value={cluster.id}>
                          {cluster.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={addSlackWebhook} disabled={loading}>
                  Add Webhook
                </Button>
                <Button variant="outline" onClick={testSlackNotification}>
                  Test Notification
                </Button>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-medium">Configured Webhooks</h4>
                {slackWebhooks.length === 0 ? (
                  <p className="text-muted-foreground">No webhooks configured</p>
                ) : (
                  slackWebhooks.map((webhook) => (
                    <div key={webhook.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">{webhook.channel_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {webhook.cluster_id ? 
                            clusters.find(c => c.id === webhook.cluster_id)?.name || 'Unknown cluster' : 
                            'All clusters'
                          }
                        </p>
                      </div>
                      <Switch
                        checked={webhook.enabled}
                        onCheckedChange={(checked) => toggleWebhook(webhook.id, checked)}
                      />
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Slack Notifications</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Severity Threshold</Label>
                      <Select
                        value={notificationPrefs.find(p => p.notification_type === 'slack')?.severity_threshold || 'medium'}
                        onValueChange={(value) => updateNotificationPreference('slack', value, true)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low and above</SelectItem>
                          <SelectItem value="medium">Medium and above</SelectItem>
                          <SelectItem value="high">High and above</SelectItem>
                          <SelectItem value="critical">Critical only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={notificationPrefs.find(p => p.notification_type === 'slack')?.enabled ?? true}
                        onCheckedChange={(checked) => {
                          const currentPref = notificationPrefs.find(p => p.notification_type === 'slack');
                          updateNotificationPreference('slack', currentPref?.severity_threshold || 'medium', checked);
                        }}
                      />
                      <Label>Enable Slack notifications</Label>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="incidents" className="space-y-4">
          <Card>
            <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Create New Incident
            </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="incident-title">Title *</Label>
                  <Input
                    id="incident-title"
                    placeholder="Incident title"
                    value={newIncident.title}
                    onChange={(e) => setNewIncident({ ...newIncident, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="incident-cluster">Cluster *</Label>
                  <Select value={newIncident.cluster_id} onValueChange={(value) => setNewIncident({ ...newIncident, cluster_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select cluster" />
                    </SelectTrigger>
                    <SelectContent>
                      {clusters.map((cluster) => (
                        <SelectItem key={cluster.id} value={cluster.id}>
                          {cluster.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="incident-severity">Severity</Label>
                  <Select value={newIncident.severity} onValueChange={(value) => setNewIncident({ ...newIncident, severity: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="incident-assigned">Assigned To</Label>
                  <Input
                    id="incident-assigned"
                    placeholder="Team member email"
                    value={newIncident.assigned_to}
                    onChange={(e) => setNewIncident({ ...newIncident, assigned_to: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="incident-description">Description</Label>
                <Textarea
                  id="incident-description"
                  placeholder="Describe the incident..."
                  value={newIncident.description}
                  onChange={(e) => setNewIncident({ ...newIncident, description: e.target.value })}
                />
              </div>
              <Button onClick={createIncident} disabled={loading}>
                Create Incident
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active Incidents</CardTitle>
            </CardHeader>
            <CardContent>
              {incidents.length === 0 ? (
                <p className="text-muted-foreground">No incidents found</p>
              ) : (
                <div className="space-y-4">
                  {incidents.map((incident) => (
                    <div key={incident.id} className="border rounded p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{incident.incident_title}</h4>
                        <div className="flex items-center gap-2">
                          <Badge variant={getSeverityColor(incident.severity)}>
                            {incident.severity}
                          </Badge>
                          <Badge variant={getStatusColor(incident.status)}>
                            {incident.status}
                          </Badge>
                        </div>
                      </div>
                      
                      {incident.incident_description && (
                        <p className="text-sm text-muted-foreground">{incident.incident_description}</p>
                      )}
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Started: {new Date(incident.started_at).toLocaleString()}</span>
                        {incident.assigned_to && <span>Assigned: {incident.assigned_to}</span>}
                      </div>
                      
                      {incident.status === 'open' || incident.status === 'investigating' ? (
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateIncidentStatus(incident.id, 'investigating')}
                            disabled={incident.status === 'investigating'}
                          >
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            Mark Investigating
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateIncidentStatus(incident.id, 'resolved')}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Mark Resolved
                          </Button>
                        </div>
                      ) : null}
                      
                      <div className="mt-2">
                        <p className="text-sm font-medium">Timeline:</p>
                        <div className="text-xs space-y-1 mt-1">
                          {(Array.isArray(incident.timeline_events) ? incident.timeline_events : JSON.parse(incident.timeline_events || '[]')).map((event: any, index: number) => (
                            <div key={index} className="flex items-center gap-2">
                              <span className="text-muted-foreground">
                                {new Date(event.timestamp).toLocaleString()}
                              </span>
                              <span>{event.details}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}