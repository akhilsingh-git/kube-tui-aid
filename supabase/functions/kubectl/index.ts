import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface KubectlRequest {
  command: string;
  clusterId?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false
        }
      }
    );

    // Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    const { command, clusterId }: KubectlRequest = await req.json();

    // Get cluster configuration
    let clusterConfig;
    if (clusterId) {
      const { data, error } = await supabase
        .from('cluster_configs')
        .select('*')
        .eq('id', clusterId)
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      clusterConfig = data;
    } else {
      // Get active cluster
      const { data, error } = await supabase
        .from('cluster_configs')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();
      
      if (error || !data) {
        return new Response(
          JSON.stringify({ 
            error: 'No active cluster configured. Please set an active cluster in settings.' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      clusterConfig = data;
    }

    // Execute kubectl command
    const result = await executeKubectl(command, clusterConfig);

    // Log the command execution
    await supabase
      .from('kubectl_logs')
      .insert([{
        user_id: user.id,
        cluster_id: clusterConfig.id,
        command,
        output: result.success ? result.output : null,
        error: result.success ? null : result.error
      }]);

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in kubectl function:', error);
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

async function executeKubectl(command: string, clusterConfig: any) {
  try {
    // Parse kubectl command
    const args = command.trim().split(' ');
    if (args[0] !== 'kubectl') {
      return {
        success: false,
        error: 'Only kubectl commands are supported'
      };
    }

    // Extract the actual kubectl operation
    const operation = args.slice(1).join(' ');
    
    // Build Kubernetes API request
    const apiUrl = buildKubernetesApiUrl(operation, clusterConfig);
    if (!apiUrl) {
      return {
        success: false,
        error: 'Unsupported kubectl command or unable to parse'
      };
    }

    console.log(`Executing kubectl command: ${command}`);
    console.log(`API URL: ${apiUrl.url}`);

    // Make request to Kubernetes API
    const response = await fetch(apiUrl.url, {
      method: apiUrl.method,
      headers: {
        'Authorization': `Bearer ${clusterConfig.token}`,
        'Content-Type': 'application/json',
        ...(clusterConfig.certificate_authority_data && {
          'X-CA-Data': clusterConfig.certificate_authority_data
        })
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Kubernetes API error (${response.status}): ${errorText}`
      };
    }

    const data = await response.json();
    
    // Format output to match kubectl format
    const formattedOutput = formatKubectlOutput(operation, data);

    return {
      success: true,
      output: formattedOutput
    };

  } catch (error) {
    console.error('Error executing kubectl:', error);
    return {
      success: false,
      error: `Execution failed: ${error.message}`
    };
  }
}

function buildKubernetesApiUrl(operation: string, clusterConfig: any) {
  const baseUrl = clusterConfig.endpoint.replace(/\/$/, '');
  const namespace = clusterConfig.namespace || 'default';
  
  // Parse common kubectl operations
  const parts = operation.split(' ');
  const verb = parts[0]; // get, describe, logs, etc.
  const resource = parts[1]; // pods, services, deployments, etc.
  const resourceName = parts[2]; // specific resource name (optional)

  switch (verb) {
    case 'get':
      if (resource === 'pods') {
        const url = resourceName 
          ? `${baseUrl}/api/v1/namespaces/${namespace}/pods/${resourceName}`
          : `${baseUrl}/api/v1/namespaces/${namespace}/pods`;
        return { url, method: 'GET' };
      }
      if (resource === 'services' || resource === 'svc') {
        const url = resourceName 
          ? `${baseUrl}/api/v1/namespaces/${namespace}/services/${resourceName}`
          : `${baseUrl}/api/v1/namespaces/${namespace}/services`;
        return { url, method: 'GET' };
      }
      if (resource === 'deployments' || resource === 'deploy') {
        const url = resourceName 
          ? `${baseUrl}/apis/apps/v1/namespaces/${namespace}/deployments/${resourceName}`
          : `${baseUrl}/apis/apps/v1/namespaces/${namespace}/deployments`;
        return { url, method: 'GET' };
      }
      if (resource === 'nodes') {
        const url = resourceName 
          ? `${baseUrl}/api/v1/nodes/${resourceName}`
          : `${baseUrl}/api/v1/nodes`;
        return { url, method: 'GET' };
      }
      break;
    
    case 'logs':
      if (parts.length >= 2) {
        const podName = parts[1];
        return { 
          url: `${baseUrl}/api/v1/namespaces/${namespace}/pods/${podName}/log?tailLines=100`, 
          method: 'GET' 
        };
      }
      break;
    
    case 'describe':
      // For describe, we'll use get with additional details
      if (resource === 'pod' && resourceName) {
        return { 
          url: `${baseUrl}/api/v1/namespaces/${namespace}/pods/${resourceName}`, 
          method: 'GET' 
        };
      }
      break;
  }

  return null;
}

function formatKubectlOutput(operation: string, data: any): string {
  const parts = operation.split(' ');
  const verb = parts[0];
  const resource = parts[1];

  if (verb === 'get') {
    if (resource === 'pods') {
      if (data.items) {
        // List of pods
        let output = 'NAME                     READY   STATUS    RESTARTS   AGE\n';
        data.items.forEach((pod: any) => {
          const name = pod.metadata.name;
          const ready = pod.status.containerStatuses 
            ? `${pod.status.containerStatuses.filter((c: any) => c.ready).length}/${pod.status.containerStatuses.length}`
            : '0/0';
          const status = pod.status.phase;
          const restarts = pod.status.containerStatuses 
            ? pod.status.containerStatuses.reduce((sum: number, c: any) => sum + c.restartCount, 0)
            : 0;
          const age = calculateAge(pod.metadata.creationTimestamp);
          
          output += `${name.padEnd(25)} ${ready.padEnd(7)} ${status.padEnd(9)} ${restarts.toString().padEnd(10)} ${age}\n`;
        });
        return output;
      } else {
        // Single pod
        return JSON.stringify(data, null, 2);
      }
    } else if (resource === 'services' || resource === 'svc') {
      if (data.items) {
        let output = 'NAME         TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)    AGE\n';
        data.items.forEach((svc: any) => {
          const name = svc.metadata.name;
          const type = svc.spec.type;
          const clusterIP = svc.spec.clusterIP;
          const externalIP = svc.spec.externalIPs?.join(',') || '<none>';
          const ports = svc.spec.ports?.map((p: any) => `${p.port}/${p.protocol}`).join(',') || '<none>';
          const age = calculateAge(svc.metadata.creationTimestamp);
          
          output += `${name.padEnd(12)} ${type.padEnd(11)} ${clusterIP.padEnd(14)} ${externalIP.padEnd(13)} ${ports.padEnd(10)} ${age}\n`;
        });
        return output;
      }
    } else if (resource === 'deployments' || resource === 'deploy') {
      if (data.items) {
        let output = 'NAME               READY   UP-TO-DATE   AVAILABLE   AGE\n';
        data.items.forEach((dep: any) => {
          const name = dep.metadata.name;
          const ready = `${dep.status.readyReplicas || 0}/${dep.spec.replicas || 0}`;
          const upToDate = dep.status.updatedReplicas || 0;
          const available = dep.status.availableReplicas || 0;
          const age = calculateAge(dep.metadata.creationTimestamp);
          
          output += `${name.padEnd(18)} ${ready.padEnd(7)} ${upToDate.toString().padEnd(12)} ${available.toString().padEnd(11)} ${age}\n`;
        });
        return output;
      }
    }
  } else if (verb === 'logs') {
    return data; // Logs are returned as plain text
  } else if (verb === 'describe') {
    return JSON.stringify(data, null, 2);
  }

  // Default fallback
  return JSON.stringify(data, null, 2);
}

function calculateAge(timestamp: string): string {
  const now = new Date();
  const created = new Date(timestamp);
  const diff = now.getTime() - created.getTime();
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}