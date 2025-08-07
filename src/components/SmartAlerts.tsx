import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, CheckCircle, Clock, X, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface SmartAlert {
  id: string;
  alert_type: string;
  severity: string;
  resource_type: string;
  resource_name: string;
  namespace: string | null;
  title: string;
  description: string;
  suggestion: string | null;
  is_resolved: boolean;
  created_at: string;
  updated_at: string;
}

export function SmartAlerts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<SmartAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [monitoring, setMonitoring] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAlerts();
      // Auto-refresh alerts every 30 seconds
      const interval = setInterval(fetchAlerts, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('smart_alerts')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setAlerts(data || []);
    } catch (error: any) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const runMonitoring = async () => {
    setMonitoring(true);
    try {
      const { data, error } = await supabase.functions.invoke('monitor-clusters');
      
      if (error) throw error;
      
      toast({
        title: "Monitoring completed",
        description: "Cluster monitoring has been executed successfully."
      });
      
      // Refresh alerts after monitoring
      setTimeout(fetchAlerts, 2000);
    } catch (error: any) {
      toast({
        title: "Monitoring failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setMonitoring(false);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('smart_alerts')
        .update({ 
          is_resolved: true, 
          resolved_at: new Date().toISOString() 
        })
        .eq('id', alertId);

      if (error) throw error;
      
      toast({
        title: "Alert resolved",
        description: "Alert has been marked as resolved."
      });
      
      fetchAlerts();
    } catch (error: any) {
      toast({
        title: "Error resolving alert",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      case 'info': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      case 'warning': return <Clock className="h-4 w-4" />;
      case 'info': return <CheckCircle className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getAlertTypeDisplay = (alertType: string) => {
    const types: { [key: string]: string } = {
      'oomkill': 'OOM Killed',
      'crash_loop': 'Crash Loop',
      'liveness_failed': 'Health Check Failed',
      'node_pressure': 'Node Pressure'
    };
    return types[alertType] || alertType;
  };

  const unresolvedAlerts = alerts.filter(alert => !alert.is_resolved);
  const resolvedAlerts = alerts.filter(alert => alert.is_resolved);

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading smart alerts...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Smart Alerts</h2>
          <p className="text-muted-foreground">AI-powered cluster issue detection and suggestions</p>
        </div>
        <Button 
          onClick={runMonitoring} 
          disabled={monitoring}
          className="flex items-center space-x-2"
        >
          <RefreshCw className={`h-4 w-4 ${monitoring ? 'animate-spin' : ''}`} />
          <span>{monitoring ? 'Monitoring...' : 'Run Monitoring'}</span>
        </Button>
      </div>

      {/* Active Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span>Active Alerts ({unresolvedAlerts.length})</span>
          </CardTitle>
          <CardDescription>
            Critical issues requiring immediate attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          {unresolvedAlerts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">All Clear!</h3>
              <p className="text-muted-foreground">No active alerts detected in your clusters.</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {unresolvedAlerts.map((alert) => (
                  <div key={alert.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-full ${getSeverityColor(alert.severity)} text-white`}>
                          {getSeverityIcon(alert.severity)}
                        </div>
                        <div>
                          <h4 className="font-semibold">{alert.title}</h4>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Badge variant="outline">{getAlertTypeDisplay(alert.alert_type)}</Badge>
                            <span>•</span>
                            <span>{alert.resource_name}</span>
                            {alert.namespace && (
                              <>
                                <span>•</span>
                                <span>ns:{alert.namespace}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resolveAlert(alert.id)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Resolve
                      </Button>
                    </div>
                    
                    <p className="text-sm">{alert.description}</p>
                    
                    {alert.suggestion && (
                      <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-md">
                        <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-1">💡 Suggestion</h5>
                        <p className="text-sm text-blue-800 dark:text-blue-200">{alert.suggestion}</p>
                      </div>
                    )}
                    
                    <div className="text-xs text-muted-foreground">
                      Created: {new Date(alert.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Recent Resolved Alerts */}
      {resolvedAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Recently Resolved ({resolvedAlerts.slice(0, 5).length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {resolvedAlerts.slice(0, 5).map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <h5 className="font-medium">{alert.title}</h5>
                    <p className="text-sm text-muted-foreground">{alert.resource_name}</p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Resolved: {new Date(alert.updated_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}