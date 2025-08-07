import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TrendingUp, TrendingDown, Minus, Brain, AlertTriangle, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface PodTrend {
  id: string;
  pod_name: string;
  namespace: string;
  restart_count: number;
  trend_direction: string;
  trend_score: number;
  time_window: string;
  avg_restart_interval: any;
}

interface EventCorrelation {
  id: string;
  correlation_type: string;
  root_cause_analysis: string;
  confidence_score: number;
  affected_resources: any;
  created_at: string;
}

interface IntelligentSuggestion {
  id: string;
  suggestion_type: string;
  priority: number;
  title: string;
  description: string;
  action_steps: any;
  estimated_impact: string;
  implementation_difficulty: string;
  ai_confidence: number;
}

export function TrendAnalysis() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [trends, setTrends] = useState<PodTrend[]>([]);
  const [correlations, setCorrelations] = useState<EventCorrelation[]>([]);
  const [suggestions, setSuggestions] = useState<IntelligentSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch pod restart trends
      const { data: trendsData } = await supabase
        .from('pod_restart_trends')
        .select(`
          *,
          cluster_configs!inner(user_id)
        `)
        .eq('cluster_configs.user_id', user?.id)
        .order('trend_score', { ascending: false })
        .limit(20);

      // Fetch event correlations
      const { data: correlationsData } = await supabase
        .from('event_correlations')
        .select(`
          *,
          cluster_configs!inner(user_id)
        `)
        .eq('cluster_configs.user_id', user?.id)
        .order('confidence_score', { ascending: false })
        .limit(10);

      // Fetch intelligent suggestions
      const { data: suggestionsData } = await supabase
        .from('intelligent_suggestions')
        .select(`
          *,
          smart_alerts!inner(user_id)
        `)
        .eq('smart_alerts.user_id', user?.id)
        .order('priority', { ascending: true })
        .limit(15);

      setTrends((trendsData || []).map((t: any) => ({
        ...t,
        avg_restart_interval: t.avg_restart_interval || 'Unknown'
      })));
      setCorrelations(correlationsData || []);
      setSuggestions((suggestionsData || []).map((s: any) => ({
        ...s,
        action_steps: Array.isArray(s.action_steps) ? s.action_steps : []
      })));
    } catch (error: any) {
      console.error('Error fetching trend data:', error);
    } finally {
      setLoading(false);
    }
  };

  const runIntelligentAnalysis = async () => {
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('intelligent-analysis');
      
      if (error) throw error;
      
      toast({
        title: "Analysis completed",
        description: "AI-powered intelligent analysis has been executed successfully."
      });
      
      // Refresh data after analysis
      setTimeout(fetchData, 2000);
    } catch (error: any) {
      toast({
        title: "Analysis failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'increasing': return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'decreasing': return <TrendingDown className="h-4 w-4 text-green-500" />;
      case 'stable': return <Minus className="h-4 w-4 text-yellow-500" />;
      default: return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = (score: number) => {
    if (score > 0.7) return 'text-red-500';
    if (score > 0.3) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getPriorityColor = (priority: number) => {
    if (priority <= 2) return 'bg-red-500';
    if (priority <= 3) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading trend analysis...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Intelligent Analysis</h2>
          <p className="text-muted-foreground">AI-powered trend analysis and event correlation</p>
        </div>
        <Button 
          onClick={runIntelligentAnalysis} 
          disabled={analyzing}
          className="flex items-center space-x-2"
        >
          <Brain className={`h-4 w-4 ${analyzing ? 'animate-pulse' : ''}`} />
          <span>{analyzing ? 'Analyzing...' : 'Run AI Analysis'}</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pod Restart Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Pod Restart Trends</span>
            </CardTitle>
            <CardDescription>
              Analysis of pod restart patterns and trending
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trends.length === 0 ? (
              <div className="text-center py-8">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Trends Detected</h3>
                <p className="text-muted-foreground">Run monitoring to collect trend data</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {trends.map((trend) => (
                    <div key={trend.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getTrendIcon(trend.trend_direction)}
                          <span className="font-medium">{trend.pod_name}</span>
                          <Badge variant="outline" className="text-xs">
                            {trend.namespace}
                          </Badge>
                        </div>
                        <span className={`text-sm font-medium ${getTrendColor(trend.trend_score)}`}>
                          Score: {trend.trend_score.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>Restarts: {trend.restart_count}</div>
                        <div>Avg Interval: {trend.avg_restart_interval}</div>
                        <div>Direction: 
                          <span className={`ml-1 capitalize ${getTrendColor(trend.trend_score)}`}>
                            {trend.trend_direction}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Event Correlations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5" />
              <span>Event Correlations</span>
            </CardTitle>
            <CardDescription>
              AI-detected event relationships and root causes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {correlations.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Correlations Found</h3>
                <p className="text-muted-foreground">AI will detect event relationships automatically</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {correlations.map((correlation) => (
                    <div key={correlation.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="capitalize">
                          {correlation.correlation_type.replace('_', ' ')}
                        </Badge>
                        <span className="text-sm font-medium text-blue-600">
                          {(correlation.confidence_score * 100).toFixed(0)}% confidence
                        </span>
                      </div>
                      <p className="text-sm">{correlation.root_cause_analysis}</p>
                      <div className="text-xs text-muted-foreground">
                        Affected: {correlation.affected_resources?.resources?.length || 0} resources
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Intelligent Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5" />
            <span>AI-Generated Suggestions</span>
          </CardTitle>
          <CardDescription>
            Intelligent recommendations for improving cluster health
          </CardDescription>
        </CardHeader>
        <CardContent>
          {suggestions.length === 0 ? (
            <div className="text-center py-8">
              <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Suggestions Available</h3>
              <p className="text-muted-foreground">AI suggestions will appear based on your alerts</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {suggestions.map((suggestion) => (
                  <div key={suggestion.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-1 rounded text-white text-xs ${getPriorityColor(suggestion.priority)}`}>
                          P{suggestion.priority}
                        </div>
                        <div>
                          <h4 className="font-semibold">{suggestion.title}</h4>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Badge variant="outline" className="capitalize">
                              {suggestion.suggestion_type}
                            </Badge>
                            <span>•</span>
                            <span className={getImpactColor(suggestion.estimated_impact)}>
                              {suggestion.estimated_impact} impact
                            </span>
                            <span>•</span>
                            <span>{suggestion.implementation_difficulty} to implement</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        AI: {(suggestion.ai_confidence * 100).toFixed(0)}%
                      </div>
                    </div>
                    
                    <p className="text-sm">{suggestion.description}</p>
                    
                    <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-md">
                      <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Action Steps:</h5>
                      <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                        {(Array.isArray(suggestion.action_steps) ? suggestion.action_steps : []).map((step, index) => (
                          <li key={index} className="flex">
                            <span className="mr-2">{index + 1}.</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}