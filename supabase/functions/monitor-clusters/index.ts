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

    console.log('Starting cluster monitoring...');

    // Get all active clusters
    const { data: clusters, error: clustersError } = await supabase
      .from('cluster_configs')
      .select('*')
      .eq('is_active', true);

    if (clustersError) {
      throw clustersError;
    }

    if (!clusters || clusters.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active clusters to monitor' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const results = [];

    for (const cluster of clusters) {
      try {
        console.log(`Monitoring cluster: ${cluster.name}`);
        
        // Monitor events
        const eventsResult = await monitorClusterEvents(cluster, supabase);
        
        // Monitor pod health  
        const podHealthResult = await monitorPodHealth(cluster, supabase);
        
        // Analyze and create alerts
        const alertsResult = await analyzeAndCreateAlerts(cluster, supabase);

        results.push({
          clusterId: cluster.id,
          clusterName: cluster.name,
          events: eventsResult,
          podHealth: podHealthResult,
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
        message: 'Cluster monitoring completed',
        results 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in monitoring function:', error);
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

async function monitorClusterEvents(cluster: any, supabase: any) {
  try {
    const baseUrl = cluster.endpoint.replace(/\/$/, '');
    const namespace = cluster.namespace || 'default';
    
    // Get recent events
    const eventsUrl = `${baseUrl}/api/v1/namespaces/${namespace}/events`;
    
    const response = await fetch(eventsUrl, {
      headers: {
        'Authorization': `Bearer ${cluster.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Events API error: ${response.status}`);
    }

    const eventsData = await response.json();
    let processedEvents = 0;

    for (const event of eventsData.items || []) {
      try {
        // Insert or update event
        await supabase
          .from('cluster_events')
          .upsert({
            cluster_id: cluster.id,
            event_uid: event.metadata.uid,
            namespace: event.namespace,
            name: event.involvedObject?.name || 'unknown',
            kind: event.involvedObject?.kind || 'unknown',
            reason: event.reason,
            message: event.message,
            type: event.type,
            source_component: event.source?.component,
            source_host: event.source?.host,
            first_timestamp: event.firstTimestamp,
            last_timestamp: event.lastTimestamp,
            count: event.count || 1
          }, {
            onConflict: 'cluster_id,event_uid'
          });

        processedEvents++;
      } catch (error) {
        console.error('Error processing event:', error);
      }
    }

    return { processedEvents };
  } catch (error) {
    console.error('Error monitoring cluster events:', error);
    return { error: error.message };
  }
}

async function monitorPodHealth(cluster: any, supabase: any) {
  try {
    const baseUrl = cluster.endpoint.replace(/\/$/, '');
    const namespace = cluster.namespace || 'default';
    
    // Get pods
    const podsUrl = `${baseUrl}/api/v1/namespaces/${namespace}/pods`;
    
    const response = await fetch(podsUrl, {
      headers: {
        'Authorization': `Bearer ${cluster.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Pods API error: ${response.status}`);
    }

    const podsData = await response.json();
    let processedPods = 0;

    for (const pod of podsData.items || []) {
      try {
        const podName = pod.metadata.name;
        const status = pod.status.phase;

        // Process each container in the pod
        for (const containerStatus of pod.status.containerStatuses || []) {
          const restartCount = containerStatus.restartCount || 0;
          let exitCode = null;
          let exitReason = null;
          let oomKilled = false;

          // Check for last termination state
          if (containerStatus.lastState?.terminated) {
            exitCode = containerStatus.lastState.terminated.exitCode;
            exitReason = containerStatus.lastState.terminated.reason;
            oomKilled = exitReason === 'OOMKilled';
          }

          // Insert or update pod health
          await supabase
            .from('pod_health')
            .upsert({
              cluster_id: cluster.id,
              pod_name: podName,
              namespace: namespace,
              restart_count: restartCount,
              last_restart_time: containerStatus.lastState?.terminated?.finishedAt,
              exit_code: exitCode,
              exit_reason: exitReason,
              container_name: containerStatus.name,
              oom_killed: oomKilled,
              status: status
            }, {
              onConflict: 'cluster_id,pod_name,namespace,container_name'
            });
        }

        processedPods++;
      } catch (error) {
        console.error('Error processing pod:', error);
      }
    }

    return { processedPods };
  } catch (error) {
    console.error('Error monitoring pod health:', error);
    return { error: error.message };
  }
}

async function analyzeAndCreateAlerts(cluster: any, supabase: any) {
  try {
    let alertsCreated = 0;

    // Check for OOMKilled pods
    const { data: oomPods } = await supabase
      .from('pod_health')
      .select('*')
      .eq('cluster_id', cluster.id)
      .eq('oom_killed', true)
      .gte('updated_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()); // Last 5 minutes

    for (const pod of oomPods || []) {
      await createAlert(supabase, {
        cluster_id: cluster.id,
        user_id: cluster.user_id,
        alert_type: 'oomkill',
        severity: 'critical',
        resource_type: 'pod',
        resource_name: pod.pod_name,
        namespace: pod.namespace,
        title: `Pod OOMKilled: ${pod.pod_name}`,
        description: `Container "${pod.container_name}" was killed due to out of memory.`,
        suggestion: 'Consider increasing memory limits in your deployment configuration. Check actual memory usage patterns.',
        related_events: { pod_data: pod }
      });
      alertsCreated++;
    }

    // Check for high restart count pods (crash loops)
    const { data: crashLoopPods } = await supabase
      .from('pod_health')
      .select('*')
      .eq('cluster_id', cluster.id)
      .gte('restart_count', 5); // Restart count >= 5

    for (const pod of crashLoopPods || []) {
      await createAlert(supabase, {
        cluster_id: cluster.id,
        user_id: cluster.user_id,
        alert_type: 'crash_loop',
        severity: 'critical',
        resource_type: 'pod',
        resource_name: pod.pod_name,
        namespace: pod.namespace,
        title: `Crash Loop Detected: ${pod.pod_name}`,
        description: `Pod has restarted ${pod.restart_count} times. Exit code: ${pod.exit_code}, Reason: ${pod.exit_reason}`,
        suggestion: `Check application logs and configuration. Common issues: wrong command, missing dependencies, configuration errors.`,
        related_events: { pod_data: pod }
      });
      alertsCreated++;
    }

    // Check for failed liveness/readiness probe events
    const { data: probeEvents } = await supabase
      .from('cluster_events')
      .select('*')
      .eq('cluster_id', cluster.id)
      .in('reason', ['Unhealthy', 'ProbeWarning'])
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

    for (const event of probeEvents || []) {
      await createAlert(supabase, {
        cluster_id: cluster.id,
        user_id: cluster.user_id,
        alert_type: 'liveness_failed',
        severity: 'warning',
        resource_type: 'pod',
        resource_name: event.name,
        namespace: event.namespace,
        title: `Health Check Failed: ${event.name}`,
        description: event.message,
        suggestion: `Check if your application is responding on the health check endpoint. Verify probe configuration and timeouts.`,
        related_events: { event_data: event }
      });
      alertsCreated++;
    }

    return { alertsCreated };
  } catch (error) {
    console.error('Error analyzing and creating alerts:', error);
    return { error: error.message };
  }
}

async function createAlert(supabase: any, alertData: any) {
  try {
    // Check if similar alert already exists and is unresolved
    const { data: existingAlert } = await supabase
      .from('smart_alerts')
      .select('id')
      .eq('cluster_id', alertData.cluster_id)
      .eq('alert_type', alertData.alert_type)
      .eq('resource_name', alertData.resource_name)
      .eq('is_resolved', false)
      .single();

    if (existingAlert) {
      // Update existing alert
      await supabase
        .from('smart_alerts')
        .update({
          description: alertData.description,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingAlert.id);
    } else {
      // Create new alert
      await supabase
        .from('smart_alerts')
        .insert([alertData]);
    }
  } catch (error) {
    console.error('Error creating alert:', error);
  }
}