import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Package, CheckCircle, Send, Clock, Truck, XCircle, LogOut, User } from "lucide-react";
import { formatDate } from "@/lib/utils";

// Status configuration for supplier tasks
const statusConfig = {
  pending: { color: "bg-yellow-500", label: "Čeka vas", icon: Clock },
  separated: { color: "bg-blue-500", label: "Odvojeno", icon: Package },
  sent: { color: "bg-green-500", label: "Poslato", icon: Send },
  delivered: { color: "bg-gray-500", label: "Primljeno", icon: CheckCircle },
  cancelled: { color: "bg-red-500", label: "Otkazano", icon: XCircle }
};

interface SupplierTask {
  id: number;
  sparePartOrderId: number;
  status: keyof typeof statusConfig;
  orderNumber?: string;
  totalCost?: string;
  currency?: string;
  estimatedDelivery?: string;
  createdAt: string;
  confirmedAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
}

export default function SupplierDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    toast({
      title: "Odjavljeni ste",
      description: "Uspješno ste se odjavili sa portala.",
    });
    navigate("/");
  };

  // Fetch supplier tasks
  const { data: tasks, isLoading } = useQuery<SupplierTask[]>({
    queryKey: ["/api/supplier/tasks"],
    enabled: !!user && user.role === "supplier",
  });

  // Mutation for marking task as separated
  const separatedMutation = useMutation({
    mutationFn: async (taskId: number) => {
      return await apiRequest(`/api/supplier/tasks/${taskId}/separated`, {
        method: 'PATCH',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supplier/tasks"] });
      toast({
        title: "Uspješno!",
        description: "Dio je označen kao odvojen.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: error.message || "Greška pri ažuriranju statusa",
        variant: "destructive",
      });
    },
  });

  // Mutation for marking task as sent
  const sentMutation = useMutation({
    mutationFn: async (taskId: number) => {
      return await apiRequest(`/api/supplier/tasks/${taskId}/sent`, {
        method: 'PATCH',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supplier/tasks"] });
      toast({
        title: "Uspješno!",
        description: "Dio je označen kao poslan.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: error.message || "Greška pri ažuriranju statusa",
        variant: "destructive",
      });
    },
  });

  // Filter tasks
  const filteredTasks = tasks?.filter(task => 
    filterStatus === "all" ? true : task.status === filterStatus
  ) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Učitavanje zadataka...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* User Info & Logout */}
      <div className="flex justify-between items-center mb-6 p-4 bg-card rounded-lg border">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-full">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Prijavljen kao</p>
            <p className="font-semibold" data-testid="text-username">{user?.username}</p>
          </div>
        </div>
        
        <Button 
          variant="outline" 
          onClick={handleLogout}
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Odjavi se
        </Button>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dobavljač Portal</h1>
        <p className="text-muted-foreground">
          Pregled i upravljanje zadacima za rezervne dijelove
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ukupno zadataka
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tasks?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Čeka vas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {tasks?.filter(t => t.status === 'pending').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Odvojeno
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {tasks?.filter(t => t.status === 'separated').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Poslato
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {tasks?.filter(t => t.status === 'sent').length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <Button
          variant={filterStatus === "all" ? "default" : "outline"}
          onClick={() => setFilterStatus("all")}
          size="sm"
        >
          Svi ({tasks?.length || 0})
        </Button>
        <Button
          variant={filterStatus === "pending" ? "default" : "outline"}
          onClick={() => setFilterStatus("pending")}
          size="sm"
        >
          Čeka vas ({tasks?.filter(t => t.status === 'pending').length || 0})
        </Button>
        <Button
          variant={filterStatus === "separated" ? "default" : "outline"}
          onClick={() => setFilterStatus("separated")}
          size="sm"
        >
          Odvojeno ({tasks?.filter(t => t.status === 'separated').length || 0})
        </Button>
        <Button
          variant={filterStatus === "sent" ? "default" : "outline"}
          onClick={() => setFilterStatus("sent")}
          size="sm"
        >
          Poslato ({tasks?.filter(t => t.status === 'sent').length || 0})
        </Button>
      </div>

      {/* Tasks List */}
      <div className="space-y-4">
        {filteredTasks.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Nema zadataka za prikaz</p>
            </CardContent>
          </Card>
        ) : (
          filteredTasks.map((task) => {
            const StatusIcon = statusConfig[task.status]?.icon || Clock;
            
            return (
              <Card key={task.id} data-testid={`task-card-${task.id}`}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    {/* Task Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">
                          Zadatak #{task.id}
                        </h3>
                        <Badge className={statusConfig[task.status]?.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig[task.status]?.label}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1 text-sm text-muted-foreground">
                        {task.orderNumber && (
                          <p>Broj porudžbine: <span className="font-medium">{task.orderNumber}</span></p>
                        )}
                        {task.totalCost && (
                          <p>Cijena: <span className="font-medium">{task.totalCost} {task.currency || 'EUR'}</span></p>
                        )}
                        <p>Kreirano: {formatDate(task.createdAt)}</p>
                        {task.confirmedAt && (
                          <p>Odvojeno: {formatDate(task.confirmedAt)}</p>
                        )}
                        {task.shippedAt && (
                          <p>Poslato: {formatDate(task.shippedAt)}</p>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 min-w-[200px]">
                      {task.status === 'pending' && (
                        <Button
                          onClick={() => separatedMutation.mutate(task.id)}
                          disabled={separatedMutation.isPending}
                          className="w-full"
                          data-testid={`button-separated-${task.id}`}
                        >
                          <Package className="h-4 w-4 mr-2" />
                          {separatedMutation.isPending ? "Ažuriranje..." : "Odvojio dio"}
                        </Button>
                      )}
                      
                      {task.status === 'separated' && (
                        <Button
                          onClick={() => sentMutation.mutate(task.id)}
                          disabled={sentMutation.isPending}
                          className="w-full"
                          data-testid={`button-sent-${task.id}`}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          {sentMutation.isPending ? "Ažuriranje..." : "Poslao dio"}
                        </Button>
                      )}

                      {(task.status === 'sent' || task.status === 'delivered') && (
                        <div className="text-center text-sm text-muted-foreground py-2">
                          <CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-600" />
                          Zadatak završen
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
