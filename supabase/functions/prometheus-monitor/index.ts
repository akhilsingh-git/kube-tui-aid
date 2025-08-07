import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false
        }
      }
    );

    console.log('Starting Prometheus metrics collection...');

    // Get all active clusters with their prometheus targets
    const { data: clusters, error: clustersError } = await supabase
      .from('cluster_configs')
      .select(`
        *,
        prometheus_targets!inner(*)
      `)
      .eq('is_active', true)
      .eq('prometheus_targets.enabled', true);

    if (clustersError) {
      throw clustersError;
    }

    if (!clusters || clusters.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No clusters with Prometheus targets configured' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const results = [];

    for (const cluster of clusters) {
      try {
        console.log(`Collecting metrics for cluster: ${cluster.name}`);
        
        // Collect metrics from each prometheus target
        for (const target of cluster.prometheus_targets) {
          const metricsResult = await collectPrometheusMetrics(cluster, target, supabase);
          results.push({
            clusterId: cluster.id,
            clusterName: cluster.name,
            targetName: target.name,
            metrics: metricsResult
          });
        }
        
        // Calculate cluster health score
        const healthScore = await calculateClusterHealthScore(cluster, supabase);
        
        // Check for threshold violations and create alerts
        const alertsResult = await checkMetricThresholds(cluster, supabase);
        
        results.push({
          clusterId: cluster.id,
          clusterName: cluster.name,
          healthScore,
          alerts: alertsResult
        });

      } catch (error) {
        console.error(`Error monitoring cluster ${cluster.name}:`, error);
        results.push({
          clusterId: cluster.id,
          clusterName: cluster.name,
          error: error.message
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Prometheus monitoring completed',
        results 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in prometheus monitoring function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An unexpected error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function collectPrometheusMetrics(cluster: any, target: any, supabase: any) {
  try {
    // Define key metrics to collect
    const queries = [
      {
        name: 'node_cpu_usage',
        query: '100 - (avg by (instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)',
        type: 'cpu'
      },
      {
        name: 'node_memory_usage',
        query: '(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100',
        type: 'memory'
      },
      {
        name: 'node_disk_usage',
        query: '100 - ((node_filesystem_avail_bytes * 100) / node_filesystem_size_bytes)',
        type: 'disk'
      },
      {
        name: 'node_load_average',
        query: 'node_load1',
        type: 'cpu'
      },
      {
        name: 'pod_count_total',
        query: 'count(kube_pod_info)',
        type: 'pod_count'
      },
      {
        name: 'pod_cpu_usage',
        query: 'sum(rate(container_cpu_usage_seconds_total[5m])) by (pod, namespace)',
        type: 'cpu'
      },
      {
        name: 'pod_memory_usage', 
        query: 'sum(container_memory_working_set_bytes) by (pod, namespace)',
        type: 'memory'
      },
      {
        name: 'network_bytes_received',
        query: 'rate(node_network_receive_bytes_total[5m])',
        type: 'network'
      },
      {
        name: 'network_bytes_transmitted',
        query: 'rate(node_network_transmit_bytes_total[5m])',
        type: 'network'
      }
    ];

    let collectedMetrics = 0;

    for (const queryDef of queries) {
      try {
        const url = `${target.endpoint}/api/v1/query?query=${encodeURIComponent(queryDef.query)}`;
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };

        if (target.auth_token) {
          headers['Authorization'] = `Bearer ${target.auth_token}`;
        }

        const response = await fetch(url, { headers });

        if (!response.ok) {
          console.error(`Prometheus query failed for ${queryDef.name}: ${response.status}`);
          continue;
        }

        const data = await response.json();
        
        if (data.status !== 'success' || !data.data?.result) {
          console.error(`Invalid prometheus response for ${queryDef.name}`);
          continue;
        }

        // Process and store metrics
        for (const result of data.data.result) {
          const value = parseFloat(result.value[1]);
          if (isNaN(value)) continue;

          const labels = result.metric || {};
          
          await supabase
            .from('cluster_metrics')
            .insert([{
              cluster_id: cluster.id,
              metric_type: queryDef.type,
              metric_name: queryDef.name,
              value: value,
              unit: getMetricUnit(queryDef.name),
              node_name: labels.instance || labels.node,
              namespace: labels.namespace,
              resource_name: labels.pod || labels.container,
              labels: labels,
              timestamp: new Date().toISOString()
            }]);

          collectedMetrics++;
        }
      } catch (error) {
        console.error(`Error collecting metric ${queryDef.name}:`, error);
      }
    }

    // Update last scrape time
    await supabase
      .from('prometheus_targets')
      .update({ last_scrape_at: new Date().toISOString() })
      .eq('id', target.id);

    return { collectedMetrics };
  } catch (error) {
    console.error('Error collecting prometheus metrics:', error);
    return { error: error.message };
  }
}

async function calculateClusterHealthScore(cluster: any, supabase: any) {
  try {
    // Get recent metrics (last 5 minutes)
    const { data: metrics } = await supabase
      .from('cluster_metrics')
      .select('*')
      .eq('cluster_id', cluster.id)
      .gte('timestamp', new Date(Date.now() - 5 * 60 * 1000).toISOString());

    if (!metrics || metrics.length === 0) {
      return { error: 'No recent metrics available' };
    }

    // Calculate component scores
    const cpuScore = calculateComponentScore(metrics, 'cpu', 80); // Alert at 80% CPU
    const memoryScore = calculateComponentScore(metrics, 'memory', 85); // Alert at 85% memory
    const diskScore = calculateComponentScore(metrics, 'disk', 90); // Alert at 90% disk
    const networkScore = 95; // Default good score for network (more complex calculation needed)

    // Calculate pod health score
    const { data: podHealth } = await supabase
      .from('pod_health')
      .select('*')
      .eq('cluster_id', cluster.id);

    const totalPods = podHealth?.length || 0;
    const healthyPods = podHealth?.filter(p => p.status === 'Running').length || 0;
    const podHealthScore = totalPods > 0 ? (healthyPods / totalPods) * 100 : 100;

    // Get node count (approximation from metrics)
    const uniqueNodes = [...new Set(metrics.map(m => m.node_name).filter(Boolean))];
    const nodeCount = uniqueNodes.length || 1;
    const healthyNodes = nodeCount; // Simplified - nodes reporting metrics are considered healthy

    // Calculate overall score (weighted average)
    const overallScore = (
      cpuScore * 0.25 +
      memoryScore * 0.25 +
      diskScore * 0.20 +
      networkScore * 0.10 +
      podHealthScore * 0.20
    );

    // Store health score
    await supabase
      .from('cluster_health_scores')
      .upsert({
        cluster_id: cluster.id,
        overall_score: Math.round(overallScore * 100) / 100,
        cpu_score: Math.round(cpuScore * 100) / 100,
        memory_score: Math.round(memoryScore * 100) / 100,
        disk_score: Math.round(diskScore * 100) / 100,
        network_score: Math.round(networkScore * 100) / 100,
        pod_health_score: Math.round(podHealthScore * 100) / 100,
        node_count: nodeCount,
        healthy_nodes: healthyNodes,
        total_pods: totalPods,
        healthy_pods: healthyPods,
        calculated_at: new Date().toISOString()
      }, {
        onConflict: 'cluster_id,calculated_at'
      });

    return { 
      overallScore: Math.round(overallScore * 100) / 100,
      componentScores: { cpuScore, memoryScore, diskScore, networkScore, podHealthScore }
    };
  } catch (error) {
    console.error('Error calculating health score:', error);
    return { error: error.message };
  }
}

async function checkMetricThresholds(cluster: any, supabase: any) {
  try {
    // Get recent metrics for threshold checking
    const { data: metrics } = await supabase
      .from('cluster_metrics')
      .select('*')
      .eq('cluster_id', cluster.id)
      .gte('timestamp', new Date(Date.now() - 2 * 60 * 1000).toISOString()) // Last 2 minutes
      .order('timestamp', { ascending: false });

    if (!metrics || metrics.length === 0) {
      return { alertsCreated: 0 };
    }

    const thresholds = {
      cpu: { critical: 90, warning: 80 },
      memory: { critical: 95, warning: 85 },
      disk: { critical: 95, warning: 90 }
    };

    let alertsCreated = 0;

    for (const metric of metrics) {
      const threshold = thresholds[metric.metric_type as keyof typeof thresholds];
      if (!threshold) continue;

      let severity = null;
      let thresholdValue = 0;

      if (metric.value >= threshold.critical) {
        severity = 'critical';
        thresholdValue = threshold.critical;
      } else if (metric.value >= threshold.warning) {
        severity = 'warning'; 
        thresholdValue = threshold.warning;
      }

      if (severity) {
        // Check if similar alert already exists and is unresolved
        const { data: existingAlert } = await supabase
          .from('monitoring_alerts')
          .select('id')
          .eq('cluster_id', cluster.id)
          .eq('alert_type', `${metric.metric_type}_pressure`)
          .eq('node_name', metric.node_name || '')
          .eq('resolved', false)
          .single();

        if (!existingAlert) {
          await supabase
            .from('monitoring_alerts')
            .insert([{
              cluster_id: cluster.id,
              user_id: cluster.user_id,
              alert_type: `${metric.metric_type}_pressure`,
              severity,
              threshold_value: thresholdValue,
              current_value: metric.value,
              node_name: metric.node_name,
              resource_name: metric.resource_name,
              message: `${metric.metric_type.toUpperCase()} usage ${metric.value.toFixed(1)}% exceeds ${severity} threshold of ${thresholdValue}% on ${metric.node_name || 'cluster'}`
            }]);

          alertsCreated++;
        }
      }
    }

    return { alertsCreated };
  } catch (error) {
    console.error('Error checking metric thresholds:', error);
    return { error: error.message };
  }
}

// Utility Functions
function calculateComponentScore(metrics: any[], type: string, alertThreshold: number): number {
  const typeMetrics = metrics.filter(m => m.metric_type === type);
  if (typeMetrics.length === 0) return 100;

  const avgValue = typeMetrics.reduce((sum, m) => sum + m.value, 0) / typeMetrics.length;
  
  // Score decreases as value approaches threshold
  if (avgValue >= alertThreshold) {
    return Math.max(0, 100 - (avgValue - alertThreshold) * 10);
  }
  
  return Math.max(0, 100 - (avgValue / alertThreshold) * 50);
}

function getMetricUnit(metricName: string): string {
  if (metricName.includes('usage') && (metricName.includes('cpu') || metricName.includes('memory') || metricName.includes('disk'))) {
    return 'percentage';
  }
  if (metricName.includes('bytes')) {
    return 'bytes';
  }
  if (metricName.includes('count')) {
    return 'count';
  }
  if (metricName.includes('load')) {
    return 'load';
  }
  return 'value';
}