import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
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

    console.log('Starting intelligent analysis...');

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
        JSON.stringify({ message: 'No active clusters to analyze' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const results = [];

    for (const cluster of clusters) {
      try {
        console.log(`Analyzing cluster: ${cluster.name}`);
        
        // Perform event correlation analysis
        const correlationResult = await performEventCorrelation(cluster, supabase);
        
        // Analyze pod restart trends
        const trendResult = await analyzePodRestartTrends(cluster, supabase);
        
        // Generate intelligent suggestions for existing alerts
        const suggestionResult = await generateIntelligentSuggestions(cluster, supabase);

        results.push({
          clusterId: cluster.id,
          clusterName: cluster.name,
          correlation: correlationResult,
          trends: trendResult,
          suggestions: suggestionResult
        });

      } catch (error) {
        console.error(`Error analyzing cluster ${cluster.name}:`, error);
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
        message: 'Intelligent analysis completed',
        results 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in intelligent analysis function:', error);
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

async function performEventCorrelation(cluster: any, supabase: any) {
  try {
    // Get recent events for correlation analysis
    const { data: events, error } = await supabase
      .from('cluster_events')
      .select('*')
      .eq('cluster_id', cluster.id)
      .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()) // Last 2 hours
      .order('created_at', { ascending: false })
      .limit(100);

    if (error || !events || events.length === 0) {
      return { correlationsFound: 0 };
    }

    // Group events by time windows and analyze patterns
    const timeWindows = groupEventsByTimeWindows(events, 5); // 5-minute windows
    let correlationsCreated = 0;

    for (const window of timeWindows) {
      if (window.events.length < 2) continue;

      // Use AI to analyze event patterns and correlations
      const correlationAnalysis = await analyzeEventCorrelationWithAI(window.events);
      
      if (correlationAnalysis.confidence > 0.7) {
        // Create correlation record
        const correlationId = `corr_${cluster.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        await supabase
          .from('event_correlations')
          .upsert({
            cluster_id: cluster.id,
            correlation_id: correlationId,
            primary_event_id: window.events[0].id,
            related_event_ids: window.events.slice(1).map(e => e.id),
            root_cause_analysis: correlationAnalysis.rootCause,
            confidence_score: correlationAnalysis.confidence,
            correlation_type: correlationAnalysis.type,
            affected_resources: {
              resources: window.events.map(e => ({
                name: e.name,
                kind: e.kind,
                namespace: e.namespace
              }))
            }
          }, {
            onConflict: 'cluster_id,correlation_id'
          });

        correlationsCreated++;
      }
    }

    return { correlationsCreated };
  } catch (error) {
    console.error('Error in event correlation:', error);
    return { error: error.message };
  }
}

async function analyzePodRestartTrends(cluster: any, supabase: any) {
  try {
    // Get pod health data for trend analysis
    const { data: podHealthData, error } = await supabase
      .from('pod_health')
      .select('*')
      .eq('cluster_id', cluster.id)
      .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .order('updated_at', { ascending: true });

    if (error || !podHealthData || podHealthData.length === 0) {
      return { trendsAnalyzed: 0 };
    }

    // Group by pod and analyze restart patterns
    const podGroups = groupBy(podHealthData, pod => `${pod.pod_name}_${pod.namespace}`);
    let trendsCreated = 0;

    for (const [podKey, podData] of Object.entries(podGroups)) {
      if (podData.length < 2) continue;

      const trendAnalysis = await analyzePodTrendWithAI(podData);
      
      if (trendAnalysis.significance > 0.5) {
        const currentHour = new Date();
        currentHour.setMinutes(0, 0, 0);

        await supabase
          .from('pod_restart_trends')
          .upsert({
            cluster_id: cluster.id,
            pod_name: podData[0].pod_name,
            namespace: podData[0].namespace,
            time_window: currentHour.toISOString(),
            restart_count: podData[podData.length - 1].restart_count,
            avg_restart_interval: calculateAverageRestartInterval(podData),
            trend_direction: trendAnalysis.direction,
            trend_score: trendAnalysis.score
          }, {
            onConflict: 'cluster_id,pod_name,namespace,time_window'
          });

        trendsCreated++;
      }
    }

    return { trendsCreated };
  } catch (error) {
    console.error('Error in trend analysis:', error);
    return { error: error.message };
  }
}

async function generateIntelligentSuggestions(cluster: any, supabase: any) {
  try {
    // Get unresolved alerts for this cluster
    const { data: alerts, error } = await supabase
      .from('smart_alerts')
      .select('*')
      .eq('cluster_id', cluster.id)
      .eq('is_resolved', false)
      .order('created_at', { ascending: false });

    if (error || !alerts || alerts.length === 0) {
      return { suggestionsGenerated: 0 };
    }

    let suggestionsCreated = 0;

    for (const alert of alerts) {
      // Check if suggestions already exist for this alert
      const { data: existingSuggestions } = await supabase
        .from('intelligent_suggestions')
        .select('id')
        .eq('alert_id', alert.id);

      if (existingSuggestions && existingSuggestions.length > 0) {
        continue; // Skip if suggestions already exist
      }

      // Generate AI-powered suggestions
      const suggestions = await generateSuggestionsWithAI(alert, cluster);
      
      for (const suggestion of suggestions) {
        await supabase
          .from('intelligent_suggestions')
          .insert([{
            alert_id: alert.id,
            suggestion_type: suggestion.type,
            priority: suggestion.priority,
            title: suggestion.title,
            description: suggestion.description,
            action_steps: suggestion.actionSteps,
            estimated_impact: suggestion.estimatedImpact,
            implementation_difficulty: suggestion.difficulty,
            ai_confidence: suggestion.confidence
          }]);

        suggestionsCreated++;
      }
    }

    return { suggestionsCreated };
  } catch (error) {
    console.error('Error generating suggestions:', error);
    return { error: error.message };
  }
}

// AI Analysis Functions
async function analyzeEventCorrelationWithAI(events: any[]) {
  const eventsContext = events.map(e => ({
    reason: e.reason,
    message: e.message,
    type: e.type,
    kind: e.kind,
    name: e.name,
    namespace: e.namespace,
    timestamp: e.created_at
  }));

  const prompt = `Analyze these Kubernetes events that occurred within a 5-minute window and determine if they are correlated:

Events:
${JSON.stringify(eventsContext, null, 2)}

Please analyze:
1. Are these events causally related?
2. What is the root cause?
3. What type of correlation is this? (cascade, resource_contention, network, configuration)
4. What is your confidence level (0.0 to 1.0)?

Respond in JSON format:
{
  "isCorrelated": boolean,
  "confidence": number,
  "rootCause": "string explanation",
  "type": "cascade|resource_contention|network|configuration"
}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { 
            role: 'system', 
            content: 'You are a Kubernetes expert specializing in event correlation and root cause analysis. Analyze events to find causal relationships and provide actionable insights.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2
      }),
    });

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
    
    return {
      confidence: result.isCorrelated ? result.confidence : 0,
      rootCause: result.rootCause,
      type: result.type
    };
  } catch (error) {
    console.error('Error in AI correlation analysis:', error);
    return { confidence: 0, rootCause: 'Analysis failed', type: 'unknown' };
  }
}

async function analyzePodTrendWithAI(podData: any[]) {
  const trendData = podData.map(p => ({
    timestamp: p.updated_at,
    restartCount: p.restart_count,
    status: p.status,
    exitCode: p.exit_code,
    exitReason: p.exit_reason
  }));

  const prompt = `Analyze this pod restart trend data and determine the significance and direction:

Pod Data:
${JSON.stringify(trendData, null, 2)}

Please analyze:
1. Is there a significant trend in restarts?
2. What direction is the trend? (increasing, decreasing, stable)
3. How concerning is this trend? (score from -1.0 to 1.0, where 1.0 is most concerning)
4. What is the significance level? (0.0 to 1.0)

Respond in JSON format:
{
  "significance": number,
  "direction": "increasing|decreasing|stable",
  "score": number,
  "analysis": "string explanation"
}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { 
            role: 'system', 
            content: 'You are a Kubernetes reliability expert. Analyze pod restart patterns to identify concerning trends and their significance.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2
      }),
    });

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    console.error('Error in AI trend analysis:', error);
    return { significance: 0, direction: 'stable', score: 0, analysis: 'Analysis failed' };
  }
}

async function generateSuggestionsWithAI(alert: any, cluster: any) {
  const prompt = `Generate intelligent suggestions for this Kubernetes alert:

Alert Details:
- Type: ${alert.alert_type}
- Severity: ${alert.severity}
- Resource: ${alert.resource_name} (${alert.resource_type})
- Namespace: ${alert.namespace}
- Description: ${alert.description}
- Current Suggestion: ${alert.suggestion}

Cluster Context:
- Endpoint: ${cluster.endpoint}
- Namespace: ${cluster.namespace}

Generate 2-3 specific, actionable suggestions with different approaches (immediate, preventive, optimization).

Respond in JSON format:
[
  {
    "type": "immediate|preventive|optimization",
    "priority": 1-5,
    "title": "string",
    "description": "string",
    "actionSteps": ["step1", "step2", "step3"],
    "estimatedImpact": "high|medium|low",
    "difficulty": "easy|medium|hard",
    "confidence": 0.0-1.0
  }
]`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { 
            role: 'system', 
            content: 'You are a Kubernetes SRE expert. Generate specific, actionable suggestions for resolving and preventing issues. Focus on practical steps that can be implemented immediately.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3
      }),
    });

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    console.error('Error generating AI suggestions:', error);
    return [];
  }
}

// Utility Functions
function groupEventsByTimeWindows(events: any[], windowMinutes: number) {
  const windows: { startTime: Date, endTime: Date, events: any[] }[] = [];
  const windowMs = windowMinutes * 60 * 1000;

  for (const event of events) {
    const eventTime = new Date(event.created_at);
    
    // Find existing window or create new one
    let window = windows.find(w => 
      eventTime >= w.startTime && eventTime <= w.endTime
    );

    if (!window) {
      window = {
        startTime: new Date(Math.floor(eventTime.getTime() / windowMs) * windowMs),
        endTime: new Date(Math.floor(eventTime.getTime() / windowMs) * windowMs + windowMs),
        events: []
      };
      windows.push(window);
    }

    window.events.push(event);
  }

  return windows;
}

function groupBy<T, K>(array: T[], keyFunc: (item: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  
  for (const item of array) {
    const key = keyFunc(item);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(item);
  }
  
  return groups;
}

function calculateAverageRestartInterval(podData: any[]): string {
  if (podData.length < 2) return '0 seconds';
  
  const intervals: number[] = [];
  for (let i = 1; i < podData.length; i++) {
    const prevTime = new Date(podData[i-1].updated_at).getTime();
    const currTime = new Date(podData[i].updated_at).getTime();
    intervals.push(currTime - prevTime);
  }
  
  const avgMs = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
  const avgMinutes = Math.round(avgMs / (1000 * 60));
  
  return `${avgMinutes} minutes`;
}