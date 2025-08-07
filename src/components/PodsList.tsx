import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Search, Circle } from "lucide-react";

interface Pod {
  name: string;
  namespace: string;
  status: "Running" | "Pending" | "Failed" | "Succeeded";
  ready: string;
  restarts: number;
  age: string;
}

const mockPods: Pod[] = [
  { name: "nginx-deployment-7d6c9f8b9c-xyz12", namespace: "default", status: "Running", ready: "1/1", restarts: 0, age: "2d" },
  { name: "api-server-5f9b8c7d6e-abc34", namespace: "kube-system", status: "Running", ready: "1/1", restarts: 1, age: "5d" },
  { name: "redis-master-6a8b9c7d5e-def56", namespace: "default", status: "Running", ready: "1/1", restarts: 0, age: "1d" },
  { name: "worker-queue-4e7f8g9h0i-ghi78", namespace: "production", status: "Pending", ready: "0/1", restarts: 3, age: "30m" },
  { name: "database-primary-3d6e9f0g1h-jkl90", namespace: "production", status: "Failed", ready: "0/1", restarts: 5, age: "1h" },
  { name: "monitoring-agent-2c5d8e1f4g-mno12", namespace: "monitoring", status: "Running", ready: "1/1", restarts: 0, age: "3d" }
];

export const PodsList = () => {
  const [filter, setFilter] = useState("");

  const filteredPods = mockPods.filter(pod => 
    pod.name.toLowerCase().includes(filter.toLowerCase()) ||
    pod.namespace.toLowerCase().includes(filter.toLowerCase())
  );

  const getStatusColor = (status: Pod["status"]) => {
    switch (status) {
      case "Running":
        return "bg-status-running";
      case "Pending":
        return "bg-status-pending";
      case "Failed":
        return "bg-status-failed";
      case "Succeeded":
        return "bg-status-succeeded";
      default:
        return "bg-muted";
    }
  };

  const getStatusTextColor = (status: Pod["status"]) => {
    switch (status) {
      case "Running":
        return "text-status-running";
      case "Pending":
        return "text-status-pending";
      case "Failed":
        return "text-status-failed";
      case "Succeeded":
        return "text-status-succeeded";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filter pods by name or namespace..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="pl-10 bg-terminal-bg border-border"
        />
      </div>

      {/* Pods List */}
      <ScrollArea className="h-64">
        <div className="space-y-2">
          {filteredPods.map((pod, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded border border-border hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <Circle className={`h-2 w-2 ${getStatusColor(pod.status)} rounded-full`} />
                  <span className="font-medium text-sm truncate">{pod.name}</span>
                </div>
                <div className="flex items-center space-x-4 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {pod.namespace}
                  </Badge>
                  <span className="text-xs text-muted-foreground">Ready: {pod.ready}</span>
                  <span className="text-xs text-muted-foreground">Restarts: {pod.restarts}</span>
                  <span className="text-xs text-muted-foreground">{pod.age}</span>
                </div>
              </div>
              <Badge 
                variant="outline" 
                className={`${getStatusTextColor(pod.status)} border-current`}
              >
                {pod.status}
              </Badge>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};