import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Package, 
  Wrench, 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle,
  Settings,
  Truck,
  AlertTriangle,
  MessageSquare,
  Receipt,
  Shield,
  Send,
  Download
} from "lucide-react";

// Tip za Service Completion Report
interface CompletionReport {
  id: number;
  serviceId: number;
  workDescription: string;
  problemDiagnosis: string;
  solutionDescription: string;
  warrantyStatus: string;
  warrantyPeriod?: string;
  laborTime?: number;
  totalCost?: string;
  clientSatisfaction?: number;
  additionalNotes?: string;
  techniciansSignature?: string;
  usedSpareParts?: string;
  createdAt: string;
  updatedAt?: string;
}

// Tip za proširene podatke servisa sa svim detaljima
interface EnhancedServiceData {
  id: number;
  description: string;
  problem?: string;
  status: string;
  createdAt: string;
  scheduledDate?: string;
  completedDate?: string;
  notes?: string;
  technicianNotes?: string;
  cost?: string;
  isCompletelyFixed?: boolean;
  warrantyStatus?: string;
  usedParts?: string;
  machineNotes?: string;
  devicePickedUp?: boolean;
  pickupDate?: string;
  pickupNotes?: string;
  customerRefusalReason?: string;
  completionReport?: CompletionReport | null;
  
  // Vezani objekti
  client?: {
    id: number;
    fullName: string;
    phone: string;
    email?: string;
    address?: string;
    city?: string;
  };
  appliance?: {
    id: number;
    model: string;
    serialNumber?: string;
  };
  technician?: {
    id?: number;
    fullName: string;
    phone?: string;
    email?: string;
    specialization?: string;
  };
  category?: {
    id: number;
    name: string;
  };
  manufacturer?: {
    id: number;
    name: string;
  };
  
  // Prošireni detalji
  spareParts?: Array<{
    partName: string;
    quantity?: number;
    productCode?: string;
    urgency?: string;
    warrantyStatus?: string;
    status: string;
    orderDate?: string;
    estimatedDeliveryDate?: string;
    actualDeliveryDate?: string;
  }>;
  removedParts?: Array<{
    partName: string;
    removalReason: string;
    currentLocation?: string;
    removalDate: string;
    returnDate?: string;
    status: string;
    repairCost?: string;
  }>;
  workTimeline?: Array<{
    date: string;
    event: string;
    status: string;
  }>;
  statusHistory?: Array<{
    id: number;
    oldStatus: string;
    newStatus: string;
    notes?: string;
    createdAt: string;
    createdBy?: string;
  }>;
}

interface EnhancedServiceDialogProps {
  service: EnhancedServiceData | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  showActions?: boolean;
}

// Helper funkcija za prevod statusa
function translateStatus(status: string) {
  const statusMap: Record<string, string> = {
    pending: "Na čekanju",
    assigned: "Dodeljen",
    scheduled: "Zakazan",
    in_progress: "U toku",
    waiting_parts: "Čeka delove",
    completed: "Završen",
    cancelled: "Otkazan",
    customer_refused_repair: "Klijent odbio popravku"
  };
  return statusMap[status] || status;
}

// Status badge komponenta
function StatusBadge({ status }: { status: string }) {
  let bgColor = "";
  
  switch (status) {
    case "pending":
      bgColor = "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
      break;
    case "assigned":
      bgColor = "bg-blue-100 text-blue-800 hover:bg-blue-200";
      break;
    case "scheduled":
      bgColor = "bg-purple-100 text-purple-800 hover:bg-purple-200";
      break;
    case "in_progress":
      bgColor = "bg-indigo-100 text-indigo-800 hover:bg-indigo-200";
      break;
    case "waiting_parts":
      bgColor = "bg-orange-100 text-orange-800 hover:bg-orange-200";
      break;
    case "completed":
      bgColor = "bg-green-100 text-green-800 hover:bg-green-200";
      break;
    case "cancelled":
      bgColor = "bg-red-100 text-red-800 hover:bg-red-200";
      break;
    case "customer_refused_repair":
      bgColor = "bg-gray-100 text-gray-800 hover:bg-gray-200";
      break;
    default:
      bgColor = "bg-gray-100 text-gray-800 hover:bg-gray-200";
      break;
  }
  
  return (
    <Badge variant="outline" className={`${bgColor} border-0 py-1 px-3`}>
      {translateStatus(status)}
    </Badge>
  );
}

export default function EnhancedServiceDialog({ 
  service, 
  isOpen, 
  onClose, 
  onEdit, 
  showActions = true 
}: EnhancedServiceDialogProps) {
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  if (!service) return null;

  const handleDownloadPDFReport = async () => {
    try {
      // Get JWT token from localStorage
      const token = localStorage.getItem('auth_token');
      
      const downloadUrl = `/api/business-partner/download-service-report/${service.id}`;
      
      // Fetch PDF with JWT authentication
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Get PDF blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `servis-izvjestaj-${service.id}-${Date.now()}.pdf`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Preuzimanje uspješno",
        description: `PDF izvještaj je preuzet`,
      });
    } catch (error) {
      console.error("Greška pri preuzimanju PDF izvještaja:", error);
      toast({
        title: "Greška",
        description: "Greška pri preuzimanju izvještaja",
        variant: "destructive",
      });
    }
  };

  const handleSendPDFReport = async () => {
    if (!recipientEmail || !recipientEmail.includes('@')) {
      toast({
        title: "Greška",
        description: "Unesite validnu email adresu",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      await apiRequest(
        `/api/business-partner/send-service-report/${service.id}`,
        {
          method: 'POST',
          body: JSON.stringify({ 
            recipientEmail, 
            recipientName: recipientName || recipientEmail 
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      toast({
        title: "Uspješno poslato",
        description: `PDF izvještaj je poslat na ${recipientEmail}`,
      });

      setIsEmailDialogOpen(false);
      setRecipientEmail("");
      setRecipientName("");
    } catch (error) {
      console.error("Greška pri slanju PDF izvještaja:", error);
      toast({
        title: "Greška",
        description: error instanceof Error ? error.message : "Greška pri slanju izvještaja",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-3">
            <span>Servis #{service.id}</span>
            <StatusBadge status={service.status} />
          </DialogTitle>
          <DialogDescription>
            Kompletne informacije o servisu i trenutnom statusu
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 overflow-y-auto flex-1 pr-2">
          {/* Osnovne informacije */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Klijent */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  Klijent
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="font-medium text-gray-900">{service.client?.fullName || "Nepoznat"}</div>
                {service.client?.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4" />
                    {service.client.phone}
                  </div>
                )}
                {service.client?.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4" />
                    {service.client.email}
                  </div>
                )}
                {service.client?.address && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    {service.client.address}, {service.client.city}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Uređaj */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5 text-green-600" />
                  Uređaj
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="font-medium text-gray-900">
                  {service.manufacturer?.name} {service.appliance?.model}
                </div>
                <div className="text-sm text-gray-600">{service.category?.name}</div>
                {service.appliance?.serialNumber && (
                  <div className="text-sm text-gray-600">
                    SN: {service.appliance.serialNumber}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Opis problema */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-orange-600" />
                Opis problema
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 bg-gray-50 p-3 rounded-md border">
                {service.description}
              </p>
            </CardContent>
          </Card>

          {/* Serviser i radni detalji */}
          {service.technician && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-purple-600" />
                  Serviser
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="font-medium text-gray-900">{service.technician.fullName}</div>
                {service.technician.specialization && (
                  <div className="text-sm text-gray-600">{service.technician.specialization}</div>
                )}
                {service.technician.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4" />
                    {service.technician.phone}
                  </div>
                )}
                {service.technician.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4" />
                    {service.technician.email}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Rezervni delovi */}
          {service.spareParts && service.spareParts.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  Rezervni delovi ({service.spareParts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {service.spareParts.map((part, index) => (
                    <div key={index} className="bg-blue-50 p-3 rounded-md border border-blue-200">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium text-gray-900">{part.partName}</div>
                        <Badge variant="outline" className={
                          part.status === 'delivered' ? 'bg-green-100 text-green-800' :
                          part.status === 'ordered' ? 'bg-blue-100 text-blue-800' :
                          'bg-orange-100 text-orange-800'
                        }>
                          {part.status === 'delivered' ? 'Isporučen' :
                           part.status === 'ordered' ? 'Naručen' : 'Čeka se'}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        {part.quantity && <div>Količina: {part.quantity}</div>}
                        {part.productCode && <div>Šifra: {part.productCode}</div>}
                        {part.warrantyStatus && <div>Garancija: {part.warrantyStatus}</div>}
                        {part.estimatedDeliveryDate && (
                          <div>Očekivana isporuka: {formatDate(part.estimatedDeliveryDate)}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Uklonjeni delovi */}
          {service.removedParts && service.removedParts.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="h-5 w-5 text-red-600" />
                  Uklonjeni delovi ({service.removedParts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {service.removedParts.map((part, index) => (
                    <div key={index} className="bg-red-50 p-3 rounded-md border border-red-200">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium text-gray-900">{part.partName}</div>
                        <Badge variant="outline" className="bg-red-100 text-red-800">
                          {part.status || 'Uklojen'}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>Razlog: {part.removalReason}</div>
                        {part.currentLocation && <div>Lokacija: {part.currentLocation}</div>}
                        <div>Datum uklanjanja: {formatDate(part.removalDate)}</div>
                        {part.repairCost && <div>Troškovi popravke: {part.repairCost}€</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Vremenska linija */}
          {service.workTimeline && service.workTimeline.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-indigo-600" />
                  Vremenska linija
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {service.workTimeline.map((event, index) => (
                    <div key={index} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-b-0">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        event.status === 'completed' ? 'bg-green-500' :
                        event.status === 'in_progress' ? 'bg-blue-500' :
                        'bg-gray-400'
                      }`} />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{event.event}</div>
                        <div className="text-sm text-gray-500">{formatDate(event.date)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detaljni izveštaj o radu - NOVO sa completion report */}
          {service.completionReport && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-green-600" />
                  📋 Detaljni izveštaj o izvršenom radu
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Detaljni opis izvršenih radova */}
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                  <h5 className="font-medium text-blue-800 mb-2">Detaljni opis izvršenih radova</h5>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{service.completionReport.workDescription}</p>
                </div>

                {/* Dijagnoza problema */}
                <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg">
                  <h5 className="font-medium text-orange-800 mb-2">🔍 Dijagnoza problema</h5>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{service.completionReport.problemDiagnosis}</p>
                </div>

                {/* Opis rešenja */}
                <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                  <h5 className="font-medium text-green-800 mb-2">✅ Primenjena rešenja</h5>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{service.completionReport.solutionDescription}</p>
                </div>

                {/* Korišćeni rezervni delovi */}
                {service.completionReport.usedSpareParts && service.completionReport.usedSpareParts !== '[]' && (
                  <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg">
                    <h5 className="font-medium text-purple-800 mb-2">🔧 Korišćeni rezervni delovi</h5>
                    {(() => {
                      try {
                        const parts = JSON.parse(service.completionReport.usedSpareParts);
                        return (
                          <div className="space-y-2">
                            {parts.map((part: any, index: number) => (
                              <div key={index} className="border-b pb-2 last:border-b-0 text-sm">
                                <p className="font-medium text-gray-900">{part.partName}</p>
                                <div className="text-gray-600 grid grid-cols-2 gap-2 mt-1">
                                  {part.partNumber && <p>Šifra: {part.partNumber}</p>}
                                  {part.quantity && <p>Količina: {part.quantity}</p>}
                                  {part.price && <p>Cena: {part.price}</p>}
                                  {part.isWarranty && <p className="text-green-600">U garanciji</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      } catch (e) {
                        return <p className="text-sm text-gray-700">{service.completionReport.usedSpareParts}</p>;
                      }
                    })()}
                  </div>
                )}

                {/* Dodatne informacije - grid */}
                <div className="grid grid-cols-3 gap-3">
                  {service.completionReport.laborTime && (
                    <div className="bg-gray-50 border border-gray-200 p-2 rounded-lg text-center">
                      <p className="text-xs text-gray-600">Vreme rada</p>
                      <p className="text-sm font-semibold text-gray-900">{service.completionReport.laborTime} min</p>
                    </div>
                  )}
                  {service.completionReport.clientSatisfaction && (
                    <div className="bg-gray-50 border border-gray-200 p-2 rounded-lg text-center">
                      <p className="text-xs text-gray-600">Zadovoljstvo</p>
                      <p className="text-sm font-semibold text-gray-900">{service.completionReport.clientSatisfaction}/5 ⭐</p>
                    </div>
                  )}
                  {service.completionReport.warrantyPeriod && (
                    <div className="bg-gray-50 border border-gray-200 p-2 rounded-lg text-center">
                      <p className="text-xs text-gray-600">Garancija</p>
                      <p className="text-sm font-semibold text-gray-900">{service.completionReport.warrantyPeriod}</p>
                    </div>
                  )}
                </div>

                {/* Dodatne napomene */}
                {service.completionReport.additionalNotes && (
                  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                    <h5 className="font-medium text-yellow-800 mb-2">📝 Dodatne napomene</h5>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{service.completionReport.additionalNotes}</p>
                  </div>
                )}

                {/* Potpis tehničara */}
                {service.completionReport.techniciansSignature && (
                  <div className="bg-gray-100 border border-gray-300 p-2 rounded-lg text-center">
                    <p className="text-xs text-gray-600">Potpis tehničara</p>
                    <p className="text-base font-semibold text-gray-900">{service.completionReport.techniciansSignature}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Detaljan opis rada - UVEK prikazuj kada postoji */}
          {service.technicianNotes && (
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2 text-blue-700">
                  <MessageSquare className="h-5 w-5" />
                  Detaljan opis rada
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-white p-4 rounded-md border border-blue-100">
                  <p className="text-gray-800 whitespace-pre-line leading-relaxed">
                    {service.technicianNotes}
                  </p>
                </div>
                {service.technician && (
                  <div className="mt-3 flex items-center text-sm text-blue-700">
                    <Wrench className="h-4 w-4 mr-1" />
                    <span className="font-medium">Serviser: {service.technician.fullName}</span>
                    {service.completedDate && (
                      <span className="ml-3 flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatDate(service.completedDate)}
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Fallback - stari prikaz ako nema completion report */}
          {!service.completionReport && (service.usedParts || service.machineNotes) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="h-5 w-5 text-gray-600" />
                  Tehnički detalji
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {service.usedParts && (
                  <div>
                    <div className="font-medium text-gray-900 mb-1">Korišćeni delovi</div>
                    <p className="text-sm text-gray-600 bg-green-50 p-3 rounded-md border border-green-200">
                      {service.usedParts}
                    </p>
                  </div>
                )}
                {service.machineNotes && (
                  <div>
                    <div className="font-medium text-gray-900 mb-1">Tehnička napomena</div>
                    <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md border border-blue-200">
                      {service.machineNotes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Status završetka i preuzimanje */}
          {service.status === 'completed' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Status završetka
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {service.isCompletelyFixed !== null && (
                  <div className="flex items-center gap-2">
                    {service.isCompletelyFixed ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-orange-600" />
                    )}
                    <span className={`font-medium ${service.isCompletelyFixed ? 'text-green-600' : 'text-orange-600'}`}>
                      {service.isCompletelyFixed ? 'Uređaj je potpuno popravljen' : 'Uređaj nije potpuno popravljen'}
                    </span>
                  </div>
                )}
                {service.warrantyStatus && (
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-600" />
                    <span className="text-gray-700">Garancija: {service.warrantyStatus}</span>
                  </div>
                )}
                {service.devicePickedUp && (
                  <div className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-purple-600" />
                    <span className="text-gray-700">
                      Uređaj preuzet {service.pickupDate ? `- ${formatDate(service.pickupDate)}` : ''}
                    </span>
                  </div>
                )}
                {service.cost && (
                  <div className="flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-green-600" />
                    <span className="text-lg font-medium text-green-600">{service.cost}€</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Datumi */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="text-sm font-medium text-gray-700 mb-1">Kreiran</div>
              <div className="text-sm text-gray-600">{formatDate(service.createdAt)}</div>
            </div>
            {service.scheduledDate && (
              <div className="bg-purple-50 p-3 rounded-md">
                <div className="text-sm font-medium text-purple-700 mb-1">Zakazano</div>
                <div className="text-sm text-purple-600">{formatDate(service.scheduledDate)}</div>
              </div>
            )}
            {service.completedDate && (
              <div className="bg-green-50 p-3 rounded-md">
                <div className="text-sm font-medium text-green-700 mb-1">Završeno</div>
                <div className="text-sm text-green-600">{formatDate(service.completedDate)}</div>
              </div>
            )}
          </div>

          {/* Akcije */}
          {showActions && (
            <div className="pt-4 border-t space-y-3">
              {onEdit && (service.status !== 'completed' && service.status !== 'cancelled') && (
                <Button className="w-full" onClick={onEdit}>
                  Izmeni servis
                </Button>
              )}
              
              {/* PDF Opcije - Preuzimanje i Slanje */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={handleDownloadPDFReport}
                  data-testid="button-download-pdf-report"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Preuzmi PDF
                </Button>
                
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => setIsEmailDialogOpen(true)}
                  data-testid="button-send-pdf-report"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Pošalji na email
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Email Dialog za slanje PDF izvještaja */}
    <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pošalji PDF izvještaj na email</DialogTitle>
          <DialogDescription>
            Unesite email adresu na koju želite poslati PDF izvještaj servisa #{service.id}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="recipient-email">Email adresa primaoca *</Label>
            <Input
              id="recipient-email"
              type="email"
              placeholder="primatelj@example.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              data-testid="input-recipient-email"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="recipient-name">Ime primaoca (opcionalno)</Label>
            <Input
              id="recipient-name"
              type="text"
              placeholder="Ime i prezime"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              data-testid="input-recipient-name"
            />
          </div>
        </div>
        
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              setIsEmailDialogOpen(false);
              setRecipientEmail("");
              setRecipientName("");
            }}
            disabled={isSending}
            data-testid="button-cancel-email"
          >
            Otkaži
          </Button>
          <Button
            className="flex-1"
            onClick={handleSendPDFReport}
            disabled={isSending || !recipientEmail}
            data-testid="button-confirm-send-email"
          >
            {isSending ? (
              <>
                <div className="h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Šaljem...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Pošalji
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}