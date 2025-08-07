import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Play, Pause, Download } from "lucide-react";

interface LogEntry {
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR" | "DEBUG";
  pod: string;
  message: string;
}

const mockLogs: LogEntry[] = [
  { timestamp: "2024-01-15T10:30:45Z", level: "INFO", pod: "nginx-deployment-7d6c9f8b9c-xyz12", message: "Server started on port 80" },
  { timestamp: "2024-01-15T10:30:46Z", level: "INFO", pod: "api-server-5f9b8c7d6e-abc34", message: "Connected to database successfully" },
  { timestamp: "2024-01-15T10:30:47Z", level: "WARN", pod: "worker-queue-4e7f8g9h0i-ghi78", message: "High memory usage detected: 89%" },
  { timestamp: "2024-01-15T10:30:48Z", level: "ERROR", pod: "database-primary-3d6e9f0g1h-jkl90", message: "Connection timeout to redis cluster" },
  { timestamp: "2024-01-15T10:30:49Z", level: "INFO", pod: "nginx-deployment-7d6c9f8b9c-xyz12", message: "HTTP GET /api/health - 200 OK" },
  { timestamp: "2024-01-15T10:30:50Z", level: "DEBUG", pod: "monitoring-agent-2c5d8e1f4g-mno12", message: "Metrics collected: cpu=45%, memory=67%" },
];

export const LogViewer = () => {
  const [logs, setLogs] = useState<LogEntry[]>(mockLogs);
  const [isStreaming, setIsStreaming] = useState(true);
  const [selectedPod, setSelectedPod] = useState<string>("all");
  const [filter, setFilter] = useState("");

  // Simulate real-time log streaming
  useEffect(() => {
    if (!isStreaming) return;

    const interval = setInterval(() => {
      const newLog: LogEntry = {
        timestamp: new Date().toISOString(),
        level: ["INFO", "WARN", "ERROR", "DEBUG"][Math.floor(Math.random() * 4)] as LogEntry["level"],
        pod: ["nginx-deployment-7d6c9f8b9c-xyz12", "api-server-5f9b8c7d6e-abc34", "worker-queue-4e7f8g9h0i-ghi78"][Math.floor(Math.random() * 3)],
        message: [
          "Request processed successfully",
          "Database query executed in 45ms",
          "Cache miss for key: user_session_12345",
          "Scheduled task completed",
          "Memory cleanup performed"
        ][Math.floor(Math.random() * 5)]
      };

      setLogs(prev => [newLog, ...prev].slice(0, 100)); // Keep only last 100 logs
    }, 2000);

    return () => clearInterval(interval);
  }, [isStreaming]);

  const filteredLogs = logs.filter(log => {
    const matchesPod = selectedPod === "all" || log.pod.includes(selectedPod);
    const matchesFilter = filter === "" || 
      log.message.toLowerCase().includes(filter.toLowerCase()) ||
      log.level.toLowerCase().includes(filter.toLowerCase());
    return matchesPod && matchesFilter;
  });

  const getLevelColor = (level: LogEntry["level"]) => {
    switch (level) {
      case "ERROR":
        return "text-terminal-error";
      case "WARN":
        return "text-terminal-warning";
      case "INFO":
        return "text-terminal-success";
      case "DEBUG":
        return "text-terminal-muted";
      default:
        return "text-foreground";
    }
  };

  const pods = Array.from(new Set(logs.map(log => log.pod)));

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center space-x-2">
        <Select value={selectedPod} onValueChange={setSelectedPod}>
          <SelectTrigger className="w-48 bg-terminal-bg border-border">
            <SelectValue placeholder="Select pod" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Pods</SelectItem>
            {pods.map(pod => (
              <SelectItem key={pod} value={pod}>{pod}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter logs..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-10 bg-terminal-bg border-border"
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsStreaming(!isStreaming)}
          className="border-border"
        >
          {isStreaming ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>

        <Button variant="outline" size="sm" className="border-border">
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {/* Logs */}
      <ScrollArea className="h-64 bg-terminal-bg border border-border rounded">
        <div className="p-2 font-mono text-sm space-y-1">
          {filteredLogs.map((log, index) => (
            <div key={index} className="flex items-start space-x-2 hover:bg-muted/20 p-1 rounded">
              <span className="text-terminal-muted text-xs w-20 flex-shrink-0">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span className={`text-xs w-12 flex-shrink-0 font-semibold ${getLevelColor(log.level)}`}>
                {log.level}
              </span>
              <span className="text-terminal-accent text-xs w-32 flex-shrink-0 truncate">
                {log.pod.split('-').slice(-1)[0]}
              </span>
              <span className="text-terminal-text text-xs flex-1">
                {log.message}
              </span>
            </div>
          ))}
          {filteredLogs.length === 0 && (
            <div className="text-center text-terminal-muted py-8">
              No logs match the current filters
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};