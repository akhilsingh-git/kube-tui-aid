import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Settings, Trash2, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface ClusterConfig {
  id: string;
  name: string;
  endpoint: string;
  namespace: string;
  is_active: boolean;
  created_at: string;
}

export function ClusterConfig() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clusters, setClusters] = useState<ClusterConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCluster, setEditingCluster] = useState<ClusterConfig | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    endpoint: '',
    token: '',
    certificate_authority_data: '',
    namespace: 'default'
  });

  useEffect(() => {
    if (user) {
      fetchClusters();
    }
  }, [user]);

  const fetchClusters = async () => {
    try {
      const { data, error } = await supabase
        .from('cluster_configs')
        .select('id, name, endpoint, namespace, is_active, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClusters(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching clusters",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const clusterData = {
        ...formData,
        user_id: user.id,
        is_active: false
      };

      if (editingCluster) {
        const { error } = await supabase
          .from('cluster_configs')
          .update(clusterData)
          .eq('id', editingCluster.id);
        
        if (error) throw error;
        toast({ title: "Cluster updated successfully" });
      } else {
        const { error } = await supabase
          .from('cluster_configs')
          .insert([clusterData]);
        
        if (error) throw error;
        toast({ title: "Cluster added successfully" });
      }

      setIsDialogOpen(false);
      setEditingCluster(null);
      setFormData({ name: '', endpoint: '', token: '', certificate_authority_data: '', namespace: 'default' });
      fetchClusters();
    } catch (error: any) {
      toast({
        title: "Error saving cluster",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleSetActive = async (clusterId: string) => {
    try {
      // Deactivate all clusters first
      await supabase
        .from('cluster_configs')
        .update({ is_active: false })
        .neq('id', '');

      // Activate the selected cluster
      const { error } = await supabase
        .from('cluster_configs')
        .update({ is_active: true })
        .eq('id', clusterId);

      if (error) throw error;
      
      toast({ title: "Active cluster updated" });
      fetchClusters();
    } catch (error: any) {
      toast({
        title: "Error updating active cluster",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (clusterId: string) => {
    try {
      const { error } = await supabase
        .from('cluster_configs')
        .delete()
        .eq('id', clusterId);

      if (error) throw error;
      
      toast({ title: "Cluster deleted successfully" });
      fetchClusters();
    } catch (error: any) {
      toast({
        title: "Error deleting cluster",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleEdit = (cluster: ClusterConfig) => {
    setEditingCluster(cluster);
    setFormData({
      name: cluster.name,
      endpoint: cluster.endpoint,
      token: '',
      certificate_authority_data: '',
      namespace: cluster.namespace
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingCluster(null);
    setFormData({ name: '', endpoint: '', token: '', certificate_authority_data: '', namespace: 'default' });
  };

  if (loading) {
    return <div className="text-center p-4">Loading clusters...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Cluster Configuration</h2>
          <p className="text-muted-foreground">Manage your Kubernetes cluster connections</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Cluster
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>
                {editingCluster ? 'Edit Cluster' : 'Add New Cluster'}
              </DialogTitle>
              <DialogDescription>
                Configure your Kubernetes cluster connection details
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Cluster Name</Label>
                <Input
                  id="name"
                  placeholder="My Kubernetes Cluster"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endpoint">API Server Endpoint</Label>
                <Input
                  id="endpoint"
                  placeholder="https://kubernetes.api.example.com"
                  value={formData.endpoint}
                  onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="token">Service Account Token</Label>
                <Textarea
                  id="token"
                  placeholder="eyJhbGciOiJSUzI1NiIsImtpZCI6..."
                  value={formData.token}
                  onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                  required
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ca-data">Certificate Authority Data (Optional)</Label>
                <Textarea
                  id="ca-data"
                  placeholder="LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0t..."
                  value={formData.certificate_authority_data}
                  onChange={(e) => setFormData({ ...formData, certificate_authority_data: e.target.value })}
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="namespace">Default Namespace</Label>
                <Input
                  id="namespace"
                  placeholder="default"
                  value={formData.namespace}
                  onChange={(e) => setFormData({ ...formData, namespace: e.target.value })}
                  required
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingCluster ? 'Update Cluster' : 'Add Cluster'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {clusters.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No clusters configured</h3>
            <p className="text-muted-foreground mb-4">
              Add your first Kubernetes cluster to start debugging
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {clusters.map((cluster) => (
            <Card key={cluster.id} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CardTitle className="text-lg">{cluster.name}</CardTitle>
                    {cluster.is_active && (
                      <Badge variant="default" className="flex items-center space-x-1">
                        <CheckCircle className="h-3 w-3" />
                        <span>Active</span>
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {!cluster.is_active && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSetActive(cluster.id)}
                      >
                        Set Active
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(cluster)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(cluster.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  {cluster.endpoint} • Namespace: {cluster.namespace}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}