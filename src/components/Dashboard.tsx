import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, Server, Database, AlertTriangle } from "lucide-react";
import { PodsList } from "./PodsList";
import { LogViewer } from "./LogViewer";
import { Terminal } from "./Terminal";

const Dashboard = () => {
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
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold terminal-glow">KubeDebug</h1>
            <p className="text-muted-foreground">Kubernetes Cluster Debug Console</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-status-running rounded-full animate-pulse"></div>
              <span className="text-sm text-status-running">Connected</span>
            </div>
          </div>
        </div>

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

            {/* Terminal */}
            <Card className="terminal-border bg-card">
              <CardHeader>
                <CardTitle className="text-terminal-accent">kubectl Terminal</CardTitle>
              </CardHeader>
              <CardContent>
                <Terminal />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;