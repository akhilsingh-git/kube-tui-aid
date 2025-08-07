import { useState, useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronRight, Terminal as TerminalIcon } from "lucide-react";

interface TerminalEntry {
  type: "command" | "output" | "error";
  content: string;
  timestamp: Date;
}

const mockCommands = {
  "kubectl get pods": `NAME                                READY   STATUS    RESTARTS   AGE
nginx-deployment-7d6c9f8b9c-xyz12   1/1     Running   0          2d
api-server-5f9b8c7d6e-abc34         1/1     Running   1          5d
redis-master-6a8b9c7d5e-def56       1/1     Running   0          1d
worker-queue-4e7f8g9h0i-ghi78       0/1     Pending   3          30m
database-primary-3d6e9f0g1h-jkl90   0/1     Failed    5          1h`,
  
  "kubectl get nodes": `NAME       STATUS   ROLES           AGE   VERSION
master-1   Ready    control-plane   7d    v1.28.2
worker-1   Ready    <none>          7d    v1.28.2
worker-2   Ready    <none>          7d    v1.28.2`,

  "kubectl get services": `NAME         TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)   AGE
kubernetes   ClusterIP   10.96.0.1       <none>        443/TCP   7d
nginx-svc    ClusterIP   10.96.1.100     <none>        80/TCP    2d
api-svc      ClusterIP   10.96.1.101     <none>        8080/TCP  5d`,

  "help": `Available commands:
  kubectl get pods          - List all pods
  kubectl get nodes         - List all nodes  
  kubectl get services      - List all services
  kubectl describe pod <name> - Describe a specific pod
  kubectl logs <pod-name>   - Get logs for a pod
  clear                     - Clear terminal
  help                      - Show this help`
};

export const Terminal = () => {
  const [history, setHistory] = useState<TerminalEntry[]>([
    {
      type: "output",
      content: "Welcome to kubectl terminal. Type 'help' for available commands.",
      timestamp: new Date()
    }
  ]);
  const [currentCommand, setCurrentCommand] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new entries are added
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [history]);

  const executeCommand = (command: string) => {
    if (!command.trim()) return;

    // Add command to history
    const newEntry: TerminalEntry = {
      type: "command",
      content: command,
      timestamp: new Date()
    };

    setHistory(prev => [...prev, newEntry]);
    setCommandHistory(prev => [...prev, command]);
    setHistoryIndex(-1);

    // Process command
    let output = "";
    let type: "output" | "error" = "output";

    const lowerCommand = command.toLowerCase().trim();
    
    if (lowerCommand === "clear") {
      setHistory([]);
      setCurrentCommand("");
      return;
    }

    if (lowerCommand in mockCommands) {
      output = mockCommands[lowerCommand as keyof typeof mockCommands];
    } else if (lowerCommand.startsWith("kubectl describe pod ")) {
      const podName = command.split(" ").slice(3).join(" ");
      output = `Name:         ${podName}
Namespace:    default
Priority:     0
Node:         worker-1/192.168.1.101
Start Time:   Mon, 15 Jan 2024 08:30:00 +0000
Labels:       app=nginx
              pod-template-hash=7d6c9f8b9c
Status:       Running
IP:           10.244.1.10
Containers:
  nginx:
    Container ID:  containerd://abc123...
    Image:         nginx:1.21
    Port:          80/TCP
    State:         Running
      Started:     Mon, 15 Jan 2024 08:30:05 +0000`;
    } else if (lowerCommand.startsWith("kubectl logs ")) {
      const podName = command.split(" ").slice(2).join(" ");
      output = `[2024-01-15T10:30:45Z] INFO: Starting nginx server
[2024-01-15T10:30:46Z] INFO: Server listening on port 80
[2024-01-15T10:30:47Z] INFO: Configuration loaded successfully
[2024-01-15T10:30:48Z] INFO: Health check endpoint registered`;
    } else {
      output = `kubectl: error: unknown command "${command}"
Run 'help' for available commands.`;
      type = "error";
    }

    // Add output
    const outputEntry: TerminalEntry = {
      type,
      content: output,
      timestamp: new Date()
    };

    setHistory(prev => [...prev, outputEntry]);
    setCurrentCommand("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      executeCommand(currentCommand);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setCurrentCommand(commandHistory[newIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setCurrentCommand("");
        } else {
          setHistoryIndex(newIndex);
          setCurrentCommand(commandHistory[newIndex]);
        }
      }
    }
  };

  return (
    <div className="space-y-2">
      {/* Terminal Display */}
      <ScrollArea ref={scrollAreaRef} className="h-48 bg-terminal-bg border border-border rounded p-2">
        <div className="font-mono text-sm space-y-1">
          {history.map((entry, index) => (
            <div key={index} className="flex items-start space-x-2">
              {entry.type === "command" && (
                <>
                  <span className="text-terminal-success">$</span>
                  <span className="text-terminal-text">{entry.content}</span>
                </>
              )}
              {entry.type === "output" && (
                <pre className="text-terminal-text whitespace-pre-wrap text-xs leading-relaxed">
                  {entry.content}
                </pre>
              )}
              {entry.type === "error" && (
                <pre className="text-terminal-error whitespace-pre-wrap text-xs leading-relaxed">
                  {entry.content}
                </pre>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Command Input */}
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1 text-terminal-success">
          <TerminalIcon className="h-4 w-4" />
          <span className="text-sm">$</span>
        </div>
        <Input
          value={currentCommand}
          onChange={(e) => setCurrentCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter kubectl command..."
          className="bg-terminal-bg border-border font-mono text-sm"
        />
        <Button
          size="sm"
          onClick={() => executeCommand(currentCommand)}
          className="bg-primary hover:bg-primary/80"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};