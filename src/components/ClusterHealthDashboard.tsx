import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Cpu, 
  HardDrive, 
  MemoryStick, 
  Network, 
  Server, 
  AlertTriangle, 
  CheckCircle,
  Zap,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Minus,
  BarChart3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface ClusterHealthScore {
  id: string;
  overall_score: number;
  cpu_score: number;
  memory_score: number;
  disk_score: number;
  network_score: number;
  pod_health_score: number;
  node_count: number;
  healthy_nodes: number;
  total_pods: number;
  healthy_pods: number;
  calculated_at: string;
}

interface MonitoringAlert {
  id: string;
  alert_type: string;
  severity: string;
  threshold_value: number;
  current_value: number;
  node_name: string | null;
  resource_name: string | null;
  message: string;
  acknowledged: boolean;
  resolved: boolean;
  created_at: string;
}

interface ClusterMetric {
  id: string;
  metric_type: string;
  metric_name: string;
  value: number;
  unit: string;
  node_name: string | null;
  timestamp: string;
}

export function ClusterHealthDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [healthScores, setHealthScores] = useState<ClusterHealthScore[]>([]);
  const [alerts, setAlerts] = useState<MonitoringAlert[]>([]);
  const [metrics, setMetrics] = useState<ClusterMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [monitoring, setMonitoring] = useState(false);

  useEffect(() => {
    if (user) {
      fetchHealthData();
      // Auto-refresh every 30 seconds
      const interval = setInterval(fetchHealthData, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchHealthData = async () => {
    try {
      // Fetch latest health scores
      const { data: healthData } = await supabase
        .from('cluster_health_scores')
        .select(`
          *,
          cluster_configs!inner(user_id, name)
        `)
        .eq('cluster_configs.user_id', user?.id)
        .order('calculated_at', { ascending: false })
        .limit(5);

      // Fetch unresolved monitoring alerts
      const { data: alertsData } = await supabase
        .from('monitoring_alerts')
        .select('*')
        .eq('user_id', user?.id)
        .eq('resolved', false)
        .order('created_at', { ascending: false })
        .limit(20);

      // Fetch recent metrics for trends
      const { data: metricsData } = await supabase
        .from('cluster_metrics')
        .select(`
          *,
          cluster_configs!inner(user_id)
        `)
        .eq('cluster_configs.user_id', user?.id)
        .gte('timestamp', new Date(Date.now() - 10 * 60 * 1000).toISOString()) // Last 10 minutes
        .order('timestamp', { ascending: false })
        .limit(100);

      setHealthScores(healthData || []);
      setAlerts(alertsData || []);
      setMetrics(metricsData || []);
    } catch (error: any) {
      console.error('Error fetching health data:', error);
    } finally {
      setLoading(false);
    }
  };

  const runPrometheusMonitoring = async () => {
    setMonitoring(true);
    try {
      const { data, error } = await supabase.functions.invoke('prometheus-monitor');
      
      if (error) throw error;
      
      toast({
        title: "Monitoring completed",
        description: "Prometheus metrics collection has been executed successfully."
      });
      
      // Refresh data after monitoring
      setTimeout(fetchHealthData, 2000);
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

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('monitoring_alerts')
        .update({ acknowledged: true })
        .eq('id', alertId);

      if (error) throw error;
      
      toast({
        title: "Alert acknowledged",
        description: "Alert has been acknowledged."
      });
      
      fetchHealthData();
    } catch (error: any) {
      toast({
        title: "Error acknowledging alert",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 90) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (score >= 70) return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <AlertTriangle className="h-4 w-4 text-red-500" />;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      case 'info': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getMetricTrend = (metricType: string) => {
    const typeMetrics = metrics.filter(m => m.metric_type === metricType);
    if (typeMetrics.length < 2) return null;
    
    const latest = typeMetrics[0].value;
    const previous = typeMetrics[Math.floor(typeMetrics.length / 2)].value;
    
    if (latest > previous) return <TrendingUp className="h-3 w-3 text-red-500" />;
    if (latest < previous) return <TrendingDown className="h-3 w-3 text-green-500" />;
    return <Minus className="h-3 w-3 text-gray-500" />;
  };

  const latestHealthScore = healthScores[0];

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading cluster health data...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Cluster Health Dashboard</h2>
          <p className="text-muted-foreground">Real-time monitoring with Prometheus integration</p>
        </div>
        <Button 
          onClick={runPrometheusMonitoring} 
          disabled={monitoring}
          className="flex items-center space-x-2"
        >
          <Zap className={`h-4 w-4 ${monitoring ? 'animate-pulse' : ''}`} />
          <span>{monitoring ? 'Collecting...' : 'Collect Metrics'}</span>
        </Button>
      </div>

      {/* Health Score Overview */}
      {latestHealthScore ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Overall Cluster Health</span>
              <Badge variant="outline" className="ml-auto">
                Score: {latestHealthScore.overall_score}%
              </Badge>
            </CardTitle>
            <CardDescription>
              Last calculated: {new Date(latestHealthScore.calculated_at).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 mb-2">
                  <Cpu className="h-4 w-4" />
                  {getMetricTrend('cpu')}
                </div>
                <div className={`text-2xl font-bold ${getScoreColor(latestHealthScore.cpu_score)}`}>
                  {latestHealthScore.cpu_score.toFixed(0)}%
                </div>
                <div className="text-sm text-muted-foreground">CPU</div>
                <Progress value={latestHealthScore.cpu_score} className="h-2 mt-1" />
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 mb-2">
                  <MemoryStick className="h-4 w-4" />
                  {getMetricTrend('memory')}
                </div>
                <div className={`text-2xl font-bold ${getScoreColor(latestHealthScore.memory_score)}`}>
                  {latestHealthScore.memory_score.toFixed(0)}%
                </div>
                <div className="text-sm text-muted-foreground">Memory</div>
                <Progress value={latestHealthScore.memory_score} className="h-2 mt-1" />
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 mb-2">
                  <HardDrive className="h-4 w-4" />
                  {getMetricTrend('disk')}
                </div>
                <div className={`text-2xl font-bold ${getScoreColor(latestHealthScore.disk_score)}`}>
                  {latestHealthScore.disk_score.toFixed(0)}%
                </div>
                <div className="text-sm text-muted-foreground">Disk</div>
                <Progress value={latestHealthScore.disk_score} className="h-2 mt-1" />
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 mb-2">
                  <Network className="h-4 w-4" />
                  {getMetricTrend('network')}
                </div>
                <div className={`text-2xl font-bold ${getScoreColor(latestHealthScore.network_score)}`}>
                  {latestHealthScore.network_score.toFixed(0)}%
                </div>
                <div className="text-sm text-muted-foreground">Network</div>
                <Progress value={latestHealthScore.network_score} className="h-2 mt-1" />
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 mb-2">
                  <Server className="h-4 w-4" />
                  <span className="text-xs">{latestHealthScore.healthy_pods}/{latestHealthScore.total_pods}</span>
                </div>
                <div className={`text-2xl font-bold ${getScoreColor(latestHealthScore.pod_health_score)}`}>
                  {latestHealthScore.pod_health_score.toFixed(0)}%
                </div>
                <div className="text-sm text-muted-foreground">Pods</div>
                <Progress value={latestHealthScore.pod_health_score} className="h-2 mt-1" />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Health Data Available</h3>
            <p className="text-muted-foreground mb-4">
              Configure Prometheus targets and collect metrics to see cluster health
            </p>
            <Button onClick={runPrometheusMonitoring}>
              Start Monitoring
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Monitoring Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span>Active Monitoring Alerts ({alerts.length})</span>
            </CardTitle>
            <CardDescription>
              Real-time threshold violations and system alerts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">All Systems Healthy</h3>
                <p className="text-muted-foreground">No active monitoring alerts detected</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          <div className={`p-1 rounded text-white text-xs ${getSeverityColor(alert.severity)}`}>
                            {alert.severity.toUpperCase()}
                          </div>
                          <span className="font-medium">
                            {alert.alert_type.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        {!alert.acknowledged && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => acknowledgeAlert(alert.id)}
                          >
                            Acknowledge
                          </Button>
                        )}
                      </div>
                      <p className="text-sm">{alert.message}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          Current: {alert.current_value}% | Threshold: {alert.threshold_value}%
                        </span>
                        <span>{new Date(alert.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Recent Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Recent Metrics</span>
            </CardTitle>
            <CardDescription>
              Latest performance metrics from Prometheus
            </CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.length === 0 ? (
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Metrics Available</h3>
                <p className="text-muted-foreground">Run Prometheus monitoring to collect metrics</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {metrics.slice(0, 20).map((metric) => (
                    <div key={metric.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <div className="font-medium text-sm">{metric.metric_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {metric.node_name && `Node: ${metric.node_name}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {metric.value.toFixed(2)} {metric.unit}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(metric.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}