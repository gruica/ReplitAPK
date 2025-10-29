import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { 
  Clock, 
  MapPin, 
  Phone, 
  Package, 
  User, 
  Calendar,
  FileText,
  CheckCircle,
  AlertCircle,
  XCircle,
  Play,
  Settings,
  Eye,
  ArrowLeft,
  Wrench,
  AlertTriangle,
  ChevronRight,
  Building
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { logger } from '@/utils/logger';
import { DevicePickupDialog } from "@/components/technician/DevicePickupDialog";

const statusConfig = {
  pending: { color: "bg-yellow-500", textColor: "text-yellow-700", bgColor: "bg-yellow-50", label: "Na čekanju", icon: Clock },
  assigned: { color: "bg-blue-500", textColor: "text-blue-700", bgColor: "bg-blue-50", label: "Dodeljen", icon: User },
  in_progress: { color: "bg-orange-500", textColor: "text-orange-700", bgColor: "bg-orange-50", label: "U toku", icon: Play },
  scheduled: { color: "bg-purple-500", textColor: "text-purple-700", bgColor: "bg-purple-50", label: "Zakazan", icon: Calendar },
  completed: { color: "bg-green-500", textColor: "text-green-700", bgColor: "bg-green-50", label: "Završen", icon: CheckCircle },
  cancelled: { color: "bg-red-500", textColor: "text-red-700", bgColor: "bg-red-50", label: "Otkazan", icon: XCircle },
  waiting_parts: { color: "bg-amber-500", textColor: "text-amber-700", bgColor: "bg-amber-50", label: "Čeka delove", icon: Package },
  client_not_home: { color: "bg-yellow-500", textColor: "text-yellow-700", bgColor: "bg-yellow-50", label: "Klijent nije kod kuće", icon: MapPin },
  client_not_answering: { color: "bg-yellow-500", textColor: "text-yellow-700", bgColor: "bg-yellow-50", label: "Klijent se ne javlja", icon: Phone },
  customer_refused_repair: { color: "bg-gray-500", textColor: "text-gray-700", bgColor: "bg-gray-50", label: "Odbio servis", icon: XCircle }
};

interface Service {
  id: number;
  description: string;
  status: keyof typeof statusConfig;
  createdAt: string;
  scheduledDate?: string;
  cost?: string;
  technicianNotes?: string;
  devicePickedUp?: boolean;
  pickupDate?: string;
  pickupNotes?: string;
  client: {
    id: number;
    fullName: string;
    phone?: string;
    address?: string;
    city?: string;
  };
  appliance: {
    id: number;
    model?: string;
    serialNumber?: string;
    category: {
      name: string;
    };
  };
  priority: string;
  notes?: string;
}

interface CityGroup {
  city: string;
  services: Service[];
  activeServicesCount: number;
  completedServicesCount: number;
  hasUrgent: boolean;
  hasHigh: boolean;
  urgentCount: number;
  highCount: number;
  priorityScore: number;
  hasActiveServices: boolean;
}

const SERVICES_PER_PAGE = 5;

export default function TechnicianServicesGrouped() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isStatusUpdateOpen, setIsStatusUpdateOpen] = useState(false);
  const [isPickupDialogOpen, setIsPickupDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("");
  const [statusNotes, setStatusNotes] = useState("");
  const [visibleServicesPerCity, setVisibleServicesPerCity] = useState<Record<string, number>>({});
  const [completedServices, setCompletedServices] = useState<Set<number>>(new Set());

  const { data: groupedData, isLoading, refetch } = useQuery<{
    cities: CityGroup[];
    totalServices: number;
    totalCities: number;
  }>({
    queryKey: ["/api/services/technician/grouped-by-city", user?.technicianId],
    queryFn: async () => {
      const response = await fetch(`/api/services/technician/${user?.technicianId}/grouped-by-city`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      if (!response.ok) throw new Error("Failed to fetch grouped services");
      return response.json();
    },
    enabled: !!user?.technicianId,
    staleTime: 30000,
  });

  // Initialize visible services count for each city
  useEffect(() => {
    if (groupedData?.cities) {
      const initialCounts: Record<string, number> = {};
      groupedData.cities.forEach(cityGroup => {
        if (!visibleServicesPerCity[cityGroup.city]) {
          initialCounts[cityGroup.city] = SERVICES_PER_PAGE;
        }
      });
      if (Object.keys(initialCounts).length > 0) {
        setVisibleServicesPerCity(prev => ({ ...prev, ...initialCounts }));
      }
    }
  }, [groupedData]);

  // Watch for service status changes and auto-load more
  useEffect(() => {
    if (!groupedData?.cities) return;

    groupedData.cities.forEach(cityGroup => {
      const activeServices = cityGroup.services.filter(s => 
        !['completed', 'cancelled'].includes(s.status) && !completedServices.has(s.id)
      );
      
      const visibleCount = visibleServicesPerCity[cityGroup.city] || SERVICES_PER_PAGE;
      const visibleActiveServices = activeServices.slice(0, visibleCount);

      // If we have fewer visible active services than the page size, auto-load more
      if (visibleActiveServices.length < SERVICES_PER_PAGE && activeServices.length < cityGroup.services.length) {
        const newCount = Math.min(visibleCount + SERVICES_PER_PAGE, cityGroup.services.length);
        setVisibleServicesPerCity(prev => ({
          ...prev,
          [cityGroup.city]: newCount
        }));
      }
    });
  }, [completedServices, groupedData, visibleServicesPerCity]);

  const handlePdfReport = async (service: Service) => {
    try {
      const response = await fetch(`/api/technician/service-report-pdf/${service.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Nepoznata greška' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const pdfBlob = await response.blob();
      const url = window.URL.createObjectURL(pdfBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `servis-izvještaj-${service.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "PDF izvještaj",
        description: `Izvještaj za servis #${service.id} je uspešno preuzet.`
      });

    } catch (error) {
      toast({
        title: "Greška",
        description: error instanceof Error ? error.message : "Greška pri generisanju PDF izvještaja",
        variant: "destructive",
      });
    }
  };

  const updateStatusMutation = useMutation({
    mutationFn: async ({ serviceId, status, notes }: { serviceId: number; status: string; notes?: string }) => {
      return apiRequest(`/api/services/${serviceId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, technicianNotes: notes }),
      });
    },
    onSuccess: async (data, variables) => {
      toast({
        title: "Status ažuriran",
        description: "Status servisa je uspešno ažuriran."
      });
      
      // Track completed services
      if (variables.status === 'completed' || variables.status === 'cancelled') {
        setCompletedServices(prev => new Set(prev).add(variables.serviceId));
      }

      // Auto WhatsApp notifications
      if (variables.status === "completed") {
        try {
          const token = localStorage.getItem('auth_token');
          if (token) {
            const response = await fetch('/api/whatsapp-web/auto-notify-completed', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ serviceId: variables.serviceId })
            });

            if (response.ok) {
              toast({
                title: "📱 WhatsApp obaveštenja poslata",
                description: "Svi učesnici su obavešteni o završetku servisa"
              });
            }
          }
        } catch (error) {
          logger.warn('⚠️ [WHATSAPP AUTO] Greška pri obaveštenjima:', error);
        }
      }
      
      setIsStatusUpdateOpen(false);
      setStatusNotes("");
      queryClient.invalidateQueries({ queryKey: ["/api/services/technician/grouped-by-city"] });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: error?.message || "Greška pri ažuriranju statusa",
        variant: "destructive"
      });
    }
  });

  const handleStatusUpdate = (service: Service) => {
    setSelectedService(service);
    setNewStatus(service.status);
    setIsStatusUpdateOpen(true);
  };

  const handleServiceDetails = (service: Service) => {
    setSelectedService(service);
    setIsDetailsOpen(true);
  };

  const submitStatusUpdate = () => {
    if (!selectedService) return;
    updateStatusMutation.mutate({
      serviceId: selectedService.id,
      status: newStatus,
      notes: statusNotes
    });
  };

  const getStatusBadge = (status: keyof typeof statusConfig) => {
    const config = statusConfig[status];
    const IconComponent = config.icon;
    return (
      <Badge className={`${config.bgColor} ${config.textColor} border-0`}>
        <IconComponent className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityColors = {
      urgent: "bg-red-100 text-red-700",
      high: "bg-orange-100 text-orange-700", 
      normal: "bg-blue-100 text-blue-700",
      low: "bg-gray-100 text-gray-700"
    };
    return (
      <Badge className={priorityColors[priority as keyof typeof priorityColors] || priorityColors.normal}>
        {priority === 'urgent' ? 'Hitno' : priority === 'high' ? 'Visok' : priority === 'normal' ? 'Normalan' : 'Nizak'}
      </Badge>
    );
  };

  const renderService = (service: Service) => (
    <Card key={service.id} className="hover:shadow-md transition-shadow mb-3">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{service.client.fullName}</CardTitle>
          <div className="flex gap-2">
            {getStatusBadge(service.status)}
            {getPriorityBadge(service.priority)}
          </div>
        </div>
        <div className="text-sm text-gray-600">
          {service.appliance.category.name} - {service.appliance.model || 'Model nepoznat'}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm">{service.description}</p>
        
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(service.createdAt)}
          </div>
        </div>

        {service.client.address && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <MapPin className="h-3 w-3" />
            {service.client.address}
          </div>
        )}

        {service.client.phone && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Phone className="h-3 w-3" />
            {service.client.phone}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => handleServiceDetails(service)}
            data-testid={`button-details-${service.id}`}
          >
            <Eye className="h-3 w-3 mr-1" />
            Detalji
          </Button>
          <Button 
            size="sm" 
            variant="secondary"
            onClick={() => handlePdfReport(service)}
            data-testid={`button-pdf-${service.id}`}
          >
            <FileText className="h-3 w-3 mr-1" />
            PDF
          </Button>
          {!service.devicePickedUp && service.status !== 'completed' && service.status !== 'cancelled' && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => {
                setSelectedService(service);
                setIsPickupDialogOpen(true);
              }}
              data-testid={`button-pickup-${service.id}`}
            >
              <Package className="h-3 w-3 mr-1" />
              Preuzmi
            </Button>
          )}
          <Button 
            size="sm" 
            onClick={() => handleStatusUpdate(service)}
            data-testid={`button-status-${service.id}`}
          >
            <Settings className="h-3 w-3 mr-1" />
            Status
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Settings className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Učitavam servise...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const activeCities = groupedData?.cities.filter(c => c.hasActiveServices) || [];
  const completedCities = groupedData?.cities.filter(c => !c.hasActiveServices) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/tech">
              <Button variant="ghost" size="sm" data-testid="button-back">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Nazad
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Building className="h-6 w-6 text-blue-600" />
                Servisi po gradovima
              </h1>
              <p className="text-gray-600">Organizovano prema prioritetu i lokaciji</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm" data-testid="badge-total-cities">
              {groupedData?.totalCities} grad{groupedData?.totalCities === 1 ? '' : 'ova'}
            </Badge>
            <Badge variant="outline" className="text-sm" data-testid="badge-total-services">
              {groupedData?.totalServices} servis{groupedData?.totalServices === 1 ? '' : 'a'}
            </Badge>
          </div>
        </div>

        {/* Active Cities */}
        {activeCities.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Play className="h-5 w-5 text-orange-600" />
              Aktivni gradovi ({activeCities.length})
            </h2>
            
            <Accordion type="multiple" defaultValue={activeCities.map(c => c.city)} className="space-y-3">
              {activeCities.map(cityGroup => {
                const visibleCount = visibleServicesPerCity[cityGroup.city] || SERVICES_PER_PAGE;
                const activeServices = cityGroup.services.filter(s => 
                  !['completed', 'cancelled'].includes(s.status)
                );
                const visibleServices = activeServices.slice(0, visibleCount);
                const hasMore = visibleCount < activeServices.length;

                return (
                  <AccordionItem key={cityGroup.city} value={cityGroup.city} className="border rounded-lg bg-white">
                    <AccordionTrigger className="px-4 hover:no-underline" data-testid={`accordion-city-${cityGroup.city}`}>
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-3">
                          <MapPin className="h-5 w-5 text-blue-600" />
                          <span className="font-semibold text-lg">{cityGroup.city}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {cityGroup.hasUrgent && (
                            <Badge className="bg-red-100 text-red-700 flex items-center gap-1" data-testid={`badge-urgent-${cityGroup.city}`}>
                              <AlertTriangle className="h-3 w-3" />
                              {cityGroup.urgentCount} hitno
                            </Badge>
                          )}
                          {cityGroup.hasHigh && !cityGroup.hasUrgent && (
                            <Badge className="bg-orange-100 text-orange-700" data-testid={`badge-high-${cityGroup.city}`}>
                              {cityGroup.highCount} visok prioritet
                            </Badge>
                          )}
                          <Badge variant="outline" data-testid={`badge-active-${cityGroup.city}`}>
                            {cityGroup.activeServicesCount} aktivnih
                          </Badge>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pt-4">
                      <div className="space-y-3">
                        {visibleServices.map(service => renderService(service))}
                        
                        {hasMore && (
                          <Button 
                            variant="outline" 
                            className="w-full"
                            onClick={() => {
                              setVisibleServicesPerCity(prev => ({
                                ...prev,
                                [cityGroup.city]: visibleCount + SERVICES_PER_PAGE
                              }));
                            }}
                            data-testid={`button-load-more-${cityGroup.city}`}
                          >
                            <ChevronRight className="h-4 w-4 mr-2" />
                            Prikaži još ({activeServices.length - visibleCount} preostalih)
                          </Button>
                        )}

                        {activeServices.length === 0 && (
                          <div className="text-center py-8 text-gray-500">
                            <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                            <p>Svi servisi u ovom gradu su završeni!</p>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
        )}

        {/* Completed Cities */}
        {completedCities.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-600 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Završeni gradovi ({completedCities.length})
            </h2>
            
            <Accordion type="multiple" className="space-y-3">
              {completedCities.map(cityGroup => (
                <AccordionItem key={cityGroup.city} value={cityGroup.city} className="border rounded-lg bg-gray-50">
                  <AccordionTrigger className="px-4 hover:no-underline" data-testid={`accordion-completed-${cityGroup.city}`}>
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-gray-400" />
                        <span className="font-semibold text-gray-600">{cityGroup.city}</span>
                      </div>
                      <Badge variant="outline" className="bg-green-50 text-green-700" data-testid={`badge-completed-${cityGroup.city}`}>
                        {cityGroup.completedServicesCount} završeno
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pt-4">
                    <div className="space-y-3">
                      {cityGroup.services.map(service => renderService(service))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}

        {groupedData?.cities.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nema servisa</h3>
              <p className="text-gray-600">Trenutno nemate dodeljenih servisa.</p>
            </CardContent>
          </Card>
        )}

        {/* Service Details Dialog */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalji servisa #{selectedService?.id}</DialogTitle>
            </DialogHeader>
            {selectedService && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Klijent</Label>
                    <p className="font-medium">{selectedService.client.fullName}</p>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedService.status)}</div>
                  </div>
                </div>

                <div>
                  <Label>Opis problema</Label>
                  <p className="mt-1 text-sm">{selectedService.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Uređaj</Label>
                    <p className="text-sm">{selectedService.appliance.category.name}</p>
                    <p className="text-sm text-gray-600">{selectedService.appliance.model}</p>
                  </div>
                  <div>
                    <Label>Prioritet</Label>
                    <div className="mt-1">{getPriorityBadge(selectedService.priority)}</div>
                  </div>
                </div>

                {selectedService.technicianNotes && (
                  <div>
                    <Label>Napomene servisera</Label>
                    <p className="mt-1 text-sm bg-gray-50 p-2 rounded">{selectedService.technicianNotes}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Status Update Dialog */}
        <Dialog open={isStatusUpdateOpen} onOpenChange={setIsStatusUpdateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ažuriraj status servisa</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="status-select">Novi status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger id="status-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusConfig).map(([status, config]) => (
                      <SelectItem key={status} value={status}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status-notes">Napomene</Label>
                <Textarea
                  id="status-notes"
                  placeholder="Dodajte napomene..."
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsStatusUpdateOpen(false)}>
                Otkaži
              </Button>
              <Button onClick={submitStatusUpdate} disabled={updateStatusMutation.isPending}>
                {updateStatusMutation.isPending ? 'Ažuriranje...' : 'Ažuriraj'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Device Pickup Dialog */}
        {selectedService && (
          <DevicePickupDialog
            isOpen={isPickupDialogOpen}
            onClose={() => setIsPickupDialogOpen(false)}
            serviceId={selectedService.id}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["/api/services/technician/grouped-by-city"] });
              refetch();
            }}
          />
        )}
      </div>
    </div>
  );
}
