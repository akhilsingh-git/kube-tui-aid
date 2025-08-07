import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Settings, LogOut, User, Activity, Server, Database, AlertTriangle } from "lucide-react";
import { PodsList } from "./PodsList";
import { LogViewer } from "./LogViewer";
import { Terminal } from "./Terminal";
import { ClusterConfig } from "./ClusterConfig";
import { SmartAlerts } from "./SmartAlerts";
import { TrendAnalysis } from "./TrendAnalysis";
import { ClusterHealthDashboard } from "./ClusterHealthDashboard";
import { CollaborationDashboard } from "./CollaborationDashboard";
import { useAuth } from "@/hooks/useAuth";

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const clusterStats = {
    nodes: 3,
    pods: 24,
    services: 8,
    deployments: 6
  };

  const alerts = [
    { id: 1, type: "warning", message: "Pod nginx-deployment-7d6c9f8b9c-xyz12 is in CrashLoopBackOff", time: "2m ago" },
    { id: 2, type: "info", message: "Deployment api-server successfully rolled out", time: "5m ago" },
    { id: 3, type: "error", message: "Node worker-2 disk usage at 89%", time: "8m ago" }
  ];

  return (
    <div className="min-h-screen bg-terminal-bg text-terminal-text">
      <div className="border-b border-terminal-border bg-terminal-bg/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-terminal-primary">KubeDebug Dashboard</h1>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-terminal-dim">
                <User className="h-4 w-4" />
                <span>{user?.email}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => signOut()}
                className="border-terminal-border hover:bg-terminal-highlight/10"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto p-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-8 bg-terminal-highlight/20">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="health">Health</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="trends">AI Analysis</TabsTrigger>
            <TabsTrigger value="collaboration">Collaboration</TabsTrigger>
            <TabsTrigger value="pods">Pods</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6">

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="terminal-border bg-card">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm text-muted-foreground">Nodes</p>
                <p className="text-2xl font-bold text-terminal-success">{clusterStats.nodes}</p>
              </div>
              <Server className="h-8 w-8 text-terminal-accent" />
            </CardContent>
          </Card>
          
          <Card className="terminal-border bg-card">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm text-muted-foreground">Pods</p>
                <p className="text-2xl font-bold text-primary">{clusterStats.pods}</p>
              </div>
              <Activity className="h-8 w-8 text-primary" />
            </CardContent>
          </Card>
          
          <Card className="terminal-border bg-card">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm text-muted-foreground">Services</p>
                <p className="text-2xl font-bold text-terminal-accent">{clusterStats.services}</p>
              </div>
              <Database className="h-8 w-8 text-terminal-accent" />
            </CardContent>
          </Card>
          
          <Card className="terminal-border bg-card">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm text-muted-foreground">Deployments</p>
                <p className="text-2xl font-bold text-secondary">{clusterStats.deployments}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-secondary" />
            </CardContent>
          </Card>
        </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pods List */}
              <div className="space-y-4">
            <Card className="terminal-border bg-card">
              <CardHeader>
                <CardTitle className="text-primary">Cluster Pods</CardTitle>
              </CardHeader>
              <CardContent>
                <PodsList />
              </CardContent>
            </Card>

            {/* Alerts */}
            <Card className="terminal-border bg-card">
              <CardHeader>
                <CardTitle className="text-terminal-warning">Recent Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-40">
                  <div className="space-y-2">
                    {alerts.map((alert) => (
                      <div key={alert.id} className="flex items-start space-x-3 p-2 rounded border border-border">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          alert.type === 'error' ? 'bg-terminal-error' :
                          alert.type === 'warning' ? 'bg-terminal-warning' : 'bg-terminal-accent'
                        }`} />
                        <div className="flex-1">
                          <p className="text-sm">{alert.message}</p>
                          <p className="text-xs text-muted-foreground">{alert.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

              {/* Right Column */}
              <div className="space-y-4">
                {/* Log Viewer */}
                <Card className="terminal-border bg-card">
                  <CardHeader>
                    <CardTitle className="text-primary">Live Logs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <LogViewer />
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="health">
            <ClusterHealthDashboard />
          </TabsContent>
          
          <TabsContent value="alerts">
            <SmartAlerts />
          </TabsContent>
          
          <TabsContent value="pods">
            <PodsList />
          </TabsContent>
          
          <TabsContent value="logs">
            <LogViewer />
          </TabsContent>
          
          <TabsContent value="trends">
            <TrendAnalysis />
          </TabsContent>
          
          <TabsContent value="collaboration">
            <CollaborationDashboard />
          </TabsContent>
          
          <TabsContent value="settings">
            <ClusterConfig />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;