import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { 
  Package, 
  CheckCircle, 
  XCircle, 
  LogOut, 
  User,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const statusConfig = {
  assigned_to_supplier: { color: "bg-yellow-500", label: "Čeka vas", icon: Clock },
  supplier_processing: { color: "bg-blue-500", label: "U obradi", icon: Package },
  delivered: { color: "bg-green-500", label: "Isporučeno", icon: CheckCircle },
  cancelled: { color: "bg-red-500", label: "Otkazano", icon: XCircle },
};

interface AssignedPart {
  id: number;
  partName: string;
  partNumber?: string;
  quantity: number;
  description?: string;
  urgency?: string;
  status: keyof typeof statusConfig;
  supplierPrice?: string;
  supplierNotes?: string;
  estimatedDelivery?: string;
  assignedAt: string;
  service?: any;
  client?: any;
  appliance?: any;
  manufacturer?: any;
  category?: any;
}

export default function SupplierAssignedParts() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [selectedPart, setSelectedPart] = useState<AssignedPart | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [responseForm, setResponseForm] = useState({
    isAvailable: true,
    supplierPrice: "",
    estimatedDeliveryDays: "",
    supplierNotes: "",
  });

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    navigate("/");
  };

  const toggleCard = (id: number) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedCards(newExpanded);
  };

  const { data: parts, isLoading } = useQuery<AssignedPart[]>({
    queryKey: ["/api/supplier/assigned-spare-parts"],
    enabled: !!user && user.role === "supplier",
  });

  const respondMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest(`/api/supplier/assigned-spare-parts/${data.id}/respond`, {
        method: 'PATCH',
        body: JSON.stringify(data.response),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supplier/assigned-spare-parts"] });
      toast({
        title: "Uspešno!",
        description: "Vaš odgovor je sačuvan.",
      });
      setIsDialogOpen(false);
      setSelectedPart(null);
      setResponseForm({
        isAvailable: true,
        supplierPrice: "",
        estimatedDeliveryDays: "",
        supplierNotes: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: error.message || "Greška pri slanju odgovora",
        variant: "destructive",
      });
    },
  });

  const handleOpenDialog = (part: AssignedPart) => {
    setSelectedPart(part);
    setResponseForm({
      isAvailable: true,
      supplierPrice: part.supplierPrice || "",
      estimatedDeliveryDays: part.estimatedDelivery?.replace(" dana", "") || "",
      supplierNotes: part.supplierNotes || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmitResponse = () => {
    if (!selectedPart) return;

    respondMutation.mutate({
      id: selectedPart.id,
      response: {
        isAvailable: responseForm.isAvailable,
        supplierPrice: responseForm.supplierPrice,
        estimatedDeliveryDays: parseInt(responseForm.estimatedDeliveryDays),
        supplierNotes: responseForm.supplierNotes,
        newStatus: responseForm.isAvailable ? "supplier_processing" : undefined,
      },
    });
  };

  const filteredParts = parts?.filter(part => 
    filterStatus === "all" ? true : part.status === filterStatus
  ) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Učitavanje...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6 p-4 bg-card rounded-lg border">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-full">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Prijavljen kao dobavljač</p>
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

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dodeljeni rezervni delovi</h1>
        <p className="text-muted-foreground">
          Pregled i upravljanje rezervnim delovima dodeljenim vama
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ukupno</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{parts?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Čeka vas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {parts?.filter(p => p.status === 'assigned_to_supplier').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">U obradi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {parts?.filter(p => p.status === 'supplier_processing').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Završeno</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {parts?.filter(p => p.status === 'delivered' || p.status === 'cancelled').length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <Button
          variant={filterStatus === "all" ? "default" : "outline"}
          onClick={() => setFilterStatus("all")}
          size="sm"
        >
          Svi ({parts?.length || 0})
        </Button>
        <Button
          variant={filterStatus === "assigned_to_supplier" ? "default" : "outline"}
          onClick={() => setFilterStatus("assigned_to_supplier")}
          size="sm"
        >
          Čeka vas ({parts?.filter(p => p.status === 'assigned_to_supplier').length || 0})
        </Button>
        <Button
          variant={filterStatus === "supplier_processing" ? "default" : "outline"}
          onClick={() => setFilterStatus("supplier_processing")}
          size="sm"
        >
          U obradi ({parts?.filter(p => p.status === 'supplier_processing').length || 0})
        </Button>
      </div>

      <div className="space-y-4">
        {filteredParts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Nema dodeljenih rezervnih delova</p>
            </CardContent>
          </Card>
        ) : (
          filteredParts.map((part) => {
            const isExpanded = expandedCards.has(part.id);
            const StatusIcon = statusConfig[part.status]?.icon || Clock;
            
            return (
              <Card key={part.id} data-testid={`part-card-${part.id}`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-lg">{part.partName}</CardTitle>
                        <Badge className={statusConfig[part.status]?.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig[part.status]?.label}
                        </Badge>
                        {part.urgency === 'urgent' && (
                          <Badge variant="destructive">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            HITNO
                          </Badge>
                        )}
                      </div>
                      <CardDescription>
                        Dodeljeno: {formatDate(part.assignedAt)}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleCard(part.id)}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                    {part.partNumber && (
                      <div>
                        <span className="text-muted-foreground">Kataloški broj:</span>
                        <p className="font-medium">{part.partNumber}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">Količina:</span>
                      <p className="font-medium">{part.quantity}</p>
                    </div>
                    {part.description && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Opis:</span>
                        <p className="font-medium">{part.description}</p>
                      </div>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t space-y-4">
                      {part.appliance && (
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            Podaci o aparatu
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Tip:</span>
                              <p className="font-medium">{part.category?.name || 'N/A'}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Proizvođač:</span>
                              <p className="font-medium">{part.manufacturer?.name || 'N/A'}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Model:</span>
                              <p className="font-medium">{part.appliance.model || 'N/A'}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Serijski broj:</span>
                              <p className="font-medium">{part.appliance.serialNumber || 'N/A'}</p>
                            </div>
                            {part.appliance.catalogNumber && (
                              <div className="col-span-2">
                                <span className="text-muted-foreground">Kataloški broj aparata:</span>
                                <p className="font-medium">{part.appliance.catalogNumber}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {part.client && (
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Podaci o klijentu
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Ime:</span>
                              <p className="font-medium">{part.client.firstName} {part.client.lastName}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Telefon:</span>
                              <p className="font-medium">{part.client.phone || 'N/A'}</p>
                            </div>
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Adresa:</span>
                              <p className="font-medium">{part.client.address || 'N/A'}, {part.client.city || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {part.service && (
                        <div>
                          <h4 className="font-semibold mb-2">Podaci o servisu</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Servis ID:</span>
                              <p className="font-medium">#{part.service.id}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Status servisa:</span>
                              <p className="font-medium">{part.service.status}</p>
                            </div>
                            {part.service.problemDescription && (
                              <div className="col-span-2">
                                <span className="text-muted-foreground">Opis kvara:</span>
                                <p className="font-medium">{part.service.problemDescription}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {(part.supplierPrice || part.supplierNotes || part.estimatedDelivery) && (
                        <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                          <h4 className="font-semibold mb-2">Vaš odgovor</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            {part.supplierPrice && (
                              <div>
                                <span className="text-muted-foreground">Cena:</span>
                                <p className="font-medium">{part.supplierPrice} EUR</p>
                              </div>
                            )}
                            {part.estimatedDelivery && (
                              <div>
                                <span className="text-muted-foreground">Rok isporuke:</span>
                                <p className="font-medium">{part.estimatedDelivery}</p>
                              </div>
                            )}
                            {part.supplierNotes && (
                              <div className="col-span-2">
                                <span className="text-muted-foreground">Napomene:</span>
                                <p className="font-medium">{part.supplierNotes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {part.status === 'assigned_to_supplier' && (
                    <div className="mt-4 pt-4 border-t">
                      <Button
                        onClick={() => handleOpenDialog(part)}
                        className="w-full md:w-auto"
                        data-testid={`button-respond-${part.id}`}
                      >
                        <Package className="h-4 w-4 mr-2" />
                        Odgovori na zahtev
                      </Button>
                    </div>
                  )}

                  {part.status === 'supplier_processing' && !part.supplierPrice && (
                    <div className="mt-4 pt-4 border-t">
                      <Button
                        onClick={() => handleOpenDialog(part)}
                        variant="outline"
                        className="w-full md:w-auto"
                        data-testid={`button-update-${part.id}`}
                      >
                        Ažuriraj informacije
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Odgovor na zahtev</DialogTitle>
            <DialogDescription>
              {selectedPart?.partName} - Količina: {selectedPart?.quantity}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Dostupnost dela</Label>
              <div className="flex gap-2">
                <Button
                  variant={responseForm.isAvailable ? "default" : "outline"}
                  onClick={() => setResponseForm({ ...responseForm, isAvailable: true })}
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Dostupan
                </Button>
                <Button
                  variant={!responseForm.isAvailable ? "destructive" : "outline"}
                  onClick={() => setResponseForm({ ...responseForm, isAvailable: false })}
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Nije dostupan
                </Button>
              </div>
            </div>

            {responseForm.isAvailable && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="price">Cena (EUR)</Label>
                  <Input
                    id="price"
                    type="text"
                    placeholder="npr. 49.99"
                    value={responseForm.supplierPrice}
                    onChange={(e) => setResponseForm({ ...responseForm, supplierPrice: e.target.value })}
                    data-testid="input-supplier-price"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="delivery">Rok isporuke (broj dana)</Label>
                  <Input
                    id="delivery"
                    type="number"
                    placeholder="npr. 5"
                    value={responseForm.estimatedDeliveryDays}
                    onChange={(e) => setResponseForm({ ...responseForm, estimatedDeliveryDays: e.target.value })}
                    data-testid="input-delivery-days"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Napomene</Label>
              <Textarea
                id="notes"
                placeholder="Dodatne informacije..."
                value={responseForm.supplierNotes}
                onChange={(e) => setResponseForm({ ...responseForm, supplierNotes: e.target.value })}
                rows={3}
                data-testid="textarea-supplier-notes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Otkaži
            </Button>
            <Button 
              onClick={handleSubmitResponse}
              disabled={respondMutation.isPending}
              data-testid="button-submit-response"
            >
              {respondMutation.isPending ? "Slanje..." : "Pošalji odgovor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
