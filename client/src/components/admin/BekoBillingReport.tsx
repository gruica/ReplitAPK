import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, FileText, Download, Euro, CheckCircle, User, Phone, MapPin, Wrench, Package, Clock, Printer, Zap, AlertCircle, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface UsedPartDetail {
  partName: string;
  partNumber: string;
  quantity: number;
  unitCost: string;
}

interface BekoBillingService {
  id: number;
  serviceNumber: string;
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  clientCity: string;
  applianceCategory: string;
  manufacturerName: string;
  applianceModel: string;
  serialNumber: string;
  technicianName: string;
  completedDate: string;
  originalCompletedDate?: string;
  cost: number;
  description: string;
  technicianNotes?: string;
  usedParts?: string;
  usedPartsDetails?: UsedPartDetail[];
  warrantyStatus: string;
  isWarrantyService: boolean;
  isAutoDetected?: boolean;
  detectionMethod?: string;
  billingPrice?: number;
  billingPriceReason?: string;
}

interface BekoBrandBreakdown {
  brand: string;
  count: number;
  cost: number;
  billingAmount?: number;
}

interface BekoMonthlyReport {
  month: string;
  year: number;
  brandGroup: string;
  bekoBrands: string[];
  services: BekoBillingService[];
  servicesByBrand: Record<string, BekoBillingService[]>;
  totalServices: number;
  totalCost: number;
  autoDetectedCount?: number;
  detectionSummary?: {
    withCompletedDate: number;
    withUpdatedDateFallback: number;
  };
  brandBreakdown: BekoBrandBreakdown[];
  totalBillingAmount?: number;
}

export default function BekoBillingReport() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<string>(String(currentDate.getMonth() + 1).padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [enhancedMode, setEnhancedMode] = useState<boolean>(true); // Defaultno koristi enhanced mode

  // Dialog state za uređivanje cijene
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<BekoBillingService | null>(null);
  const [newPrice, setNewPrice] = useState<string>('');
  const [newReason, setNewReason] = useState<string>('');
  
  // Dialog state za isključivanje servisa iz billinga
  const [excludeDialogOpen, setExcludeDialogOpen] = useState(false);
  const [excludingService, setExcludingService] = useState<BekoBillingService | null>(null);
  
  const { toast } = useToast();

  const bekoBrands = ['Beko', 'Grundig', 'Blomberg'];
  const months = [
    { value: '01', label: 'Januar' },
    { value: '02', label: 'Februar' },
    { value: '03', label: 'Mart' },
    { value: '04', label: 'April' },
    { value: '05', label: 'Maj' },
    { value: '06', label: 'Jun' },
    { value: '07', label: 'Jul' },
    { value: '08', label: 'Avgust' },
    { value: '09', label: 'Septembar' },
    { value: '10', label: 'Oktobar' },
    { value: '11', label: 'Novembar' },
    { value: '12', label: 'Decembar' }
  ];

  // Fetch warranty services for all Beko brands in selected period
  const { data: billingData, isLoading, refetch: refetchBillingData } = useQuery({
    queryKey: [enhancedMode ? '/api/admin/billing/beko/enhanced' : '/api/admin/billing/beko', selectedMonth, selectedYear, enhancedMode],
    staleTime: 0, // Uvijek refetch fresh podatke
    enabled: !!selectedMonth && !!selectedYear,
    queryFn: async () => {
      const params = new URLSearchParams({
        month: selectedMonth,
        year: selectedYear.toString()
      });
      
      // Get JWT token from localStorage
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('Nema autentifikacije');
      
      const endpoint = enhancedMode ? '/api/admin/billing/beko/enhanced' : '/api/admin/billing/beko';
      const response = await fetch(`${endpoint}?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        // Backend error handled with user notification - sanitized for production
        throw new Error('Greška pri dohvatanju podataka za Beko fakturisanje. Molimo pokušajte ponovo.');
      }
      return await response.json() as BekoMonthlyReport;
    }
  });

  // Mutation za ažuriranje billing podataka
  const updateBillingMutation = useMutation({
    mutationFn: async ({ serviceId, billingPrice, billingPriceReason }: { 
      serviceId: number; 
      billingPrice: number; 
      billingPriceReason: string 
    }) => {
      return await apiRequest(`/api/admin/services/${serviceId}/billing`, {
        method: 'PATCH',
        body: JSON.stringify({
          billingPrice,
          billingPriceReason
        })
      });
    },
    onSuccess: async (data, variables) => {
      toast({
        title: "Uspješno ažurirano",
        description: "Billing cijena i dokumentacija su uspješno ažurirani.",
      });
      
      // Invalidiraj keš i forsiraj immediate refetch
      await queryClient.invalidateQueries({
        queryKey: [
          enhancedMode ? '/api/admin/billing/beko/enhanced' : '/api/admin/billing/beko'
        ],
        refetchType: 'active'
      });
      
      setEditDialogOpen(false);
      setEditingService(null);
      setNewPrice('');
      setNewReason('');
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: error.message || "Greška pri ažuriranju billing podataka",
        variant: "destructive",
      });
    }
  });

  // Mutation za isključivanje servisa iz billing izvještaja
  const excludeFromBillingMutation = useMutation({
    mutationFn: async ({ serviceId, exclude }: { 
      serviceId: number; 
      exclude: boolean 
    }) => {
      return await apiRequest(`/api/admin/services/${serviceId}/exclude-from-billing`, {
        method: 'PATCH',
        body: JSON.stringify({ exclude })
      });
    },
    onSuccess: async (_, variables) => {
      toast({
        title: "Uspješno",
        description: "Servis je uklonjen iz billing izvještaja.",
      });
      
      // Direktno refetch podataka iz baze
      await refetchBillingData();
      
      setExcludeDialogOpen(false);
      setExcludingService(null);
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: error.message || "Greška pri isključivanju servisa",
        variant: "destructive",
      });
    }
  });

  // Handler za otvaranje edit dialoga
  const handleEditPrice = (service: BekoBillingService) => {
    setEditingService(service);
    setNewPrice((service.billingPrice || service.cost || 0).toString());
    setNewReason(service.billingPriceReason || '');
    setEditDialogOpen(true);
  };

  // Handler za čuvanje izmjena
  const handleSavePrice = () => {
    if (!editingService) return;
    
    const priceValue = parseFloat(newPrice);
    if (isNaN(priceValue) || priceValue < 0) {
      toast({
        title: "Greška",
        description: "Molimo unesite važeću cijenu",
        variant: "destructive",
      });
      return;
    }

    updateBillingMutation.mutate({
      serviceId: editingService.id,
      billingPrice: priceValue,
      billingPriceReason: newReason
    });
  };

  // Handler za otvaranje exclude dialoga
  const handleExcludeFromBilling = (service: BekoBillingService) => {
    setExcludingService(service);
    setExcludeDialogOpen(true);
  };

  // Handler za potvrdu isključivanja servisa
  const handleConfirmExclude = () => {
    if (!excludingService) return;
    
    excludeFromBillingMutation.mutate({
      serviceId: excludingService.id,
      exclude: true
    });
  };

  // Generate export data
  const handleExportToCSV = () => {
    if (!billingData?.services.length) return;

    const csvHeaders = 'Broj servisa,Klijent,Telefon,Adresa,Grad,Uređaj,Brend,Model,Serijski broj,Serviser,Datum završetka,Cena,Opis problema,Izvršeni rad,Utrošeni rezervni dijelovi\n';
    
    const csvData = billingData.services.map(service => {
      // Formatiraj utrošene rezervne dijelove
      const partsText = service.usedPartsDetails && service.usedPartsDetails.length > 0
        ? service.usedPartsDetails.map(p => `${p.partName} (${p.partNumber}) x${p.quantity}`).join('; ')
        : (service.usedParts || 'Nema');
        
      return `${service.serviceNumber},"${service.clientName}","${service.clientPhone}","${service.clientAddress}","${service.clientCity}","${service.applianceCategory}","${service.manufacturerName}","${service.applianceModel}","${service.serialNumber}","${service.technicianName}","${format(new Date(service.completedDate), 'dd.MM.yyyy')}","${(service.billingPrice || service.cost || 0).toFixed(2)}","${(service.description || '').replace(/"/g, '""')}","${(service.technicianNotes || '').replace(/"/g, '""')}","${partsText.replace(/"/g, '""')}"`;
    }).join('\n');

    const blob = new Blob([csvHeaders + csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Beko_garancija_${selectedMonth}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle print functionality for horizontal table layout (20 services per page)
  const handlePrintReport = () => {
    if (!billingData?.services.length) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const printContent = `
      <html>
        <head>
          <title>Beko Fakturisanje - ${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}</title>
          <style>
            @page { size: A4 landscape; margin: 15mm; }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              font-size: 9px; 
              line-height: 1.2; 
            }
            .header { 
              text-align: center; 
              margin-bottom: 15px; 
              border-bottom: 2px solid #333; 
              padding-bottom: 8px; 
            }
            .header h1 { margin: 0; font-size: 16px; color: #d32f2f; }
            .header h2 { margin: 5px 0; font-size: 14px; }
            .header p { margin: 0; font-size: 10px; }
            .summary { 
              background: #f5f5f5; 
              padding: 8px; 
              margin-bottom: 10px; 
              font-size: 10px;
              display: flex;
              justify-content: space-between;
            }
            .services-table { 
              width: 100%; 
              border-collapse: collapse; 
              font-size: 8px;
            }
            .services-table th { 
              background: #ffebee; 
              border: 1px solid #ccc; 
              padding: 4px 2px; 
              text-align: left; 
              font-weight: bold;
              white-space: nowrap;
            }
            .services-table td { 
              border: 1px solid #ccc; 
              padding: 3px 2px; 
              vertical-align: top;
              max-width: 80px;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .services-table tr:nth-child(even) { background: #f9f9f9; }
            .services-table tr:hover { background: #fff3e0; }
            .service-number { font-weight: bold; color: #d32f2f; }
            .cost { font-weight: bold; color: #2e7d32; }
            .brand { font-size: 7px; color: #666; }
            .phone { font-size: 7px; }
            .serial { font-size: 6px; font-family: monospace; }
            .footer { 
              margin-top: 10px; 
              text-align: center; 
              font-size: 8px; 
              color: #666; 
            }
            @media print { 
              body { margin: 0; } 
              .no-print { display: none; }
              .services-table { page-break-inside: auto; }
              .services-table tr { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Beko Fakturisanje</h1>
            <h2>${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}</h2>
            <p>Završeni garancijski servisi - Svi Beko brendovi (Beko, Grundig, Blomberg)</p>
          </div>
          
          <div class="summary">
            <div><strong>Ukupno servisa:</strong> ${billingData.totalServices}</div>
            <div><strong>Ukupna vrednost:</strong> ${Number(billingData.totalBillingAmount || billingData.totalCost || 0).toFixed(2)} €</div>
            <div><strong>Brendovi:</strong> ${billingData.brandBreakdown.map(b => `${b.brand} (${b.count})`).join(', ')}</div>
          </div>
          
          <table class="services-table">
            <thead>
              <tr>
                <th style="width: 4%;">Servis #</th>
                <th style="width: 10%;">Klijent</th>
                <th style="width: 7%;">Telefon</th>
                <th style="width: 10%;">Adresa</th>
                <th style="width: 6%;">Grad</th>
                <th style="width: 8%;">Uređaj</th>
                <th style="width: 6%;">Brend</th>
                <th style="width: 8%;">Model</th>
                <th style="width: 8%;">Serijski #</th>
                <th style="width: 7%;">Serviser</th>
                <th style="width: 5%;">Završeno</th>
                <th style="width: 4%;">Cena</th>
                <th style="width: 10%;">Izvršeni rad</th>
                <th style="width: 10%;">Utrošeni dijelovi</th>
              </tr>
            </thead>
            <tbody>
              ${billingData.services.map(service => {
                const partsText = service.usedPartsDetails && service.usedPartsDetails.length > 0
                  ? service.usedPartsDetails.map(p => `${p.partName} x${p.quantity}`).join(', ')
                  : (service.usedParts || '-');
                return `
                <tr>
                  <td class="service-number">#${service.serviceNumber}</td>
                  <td>${service.clientName}</td>
                  <td class="phone">${service.clientPhone}</td>
                  <td>${service.clientAddress}</td>
                  <td>${service.clientCity}</td>
                  <td>${service.applianceCategory}</td>
                  <td class="brand">${service.manufacturerName}</td>
                  <td>${service.applianceModel}</td>
                  <td class="serial">${service.serialNumber}</td>
                  <td>${service.technicianName}</td>
                  <td>${format(new Date(service.completedDate), 'dd.MM.yy')}</td>
                  <td class="cost">${Number(service.billingPrice || service.cost || 0).toFixed(2)}€</td>
                  <td style="font-size: 7px;">${service.technicianNotes || '-'}</td>
                  <td style="font-size: 7px;">${partsText}</td>
                </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            Izveštaj generisan: ${format(new Date(), 'dd.MM.yyyy HH:mm')} | Frigo Sistem Todosijević | Beko Fakturisanje
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Beko Fakturisanje</h1>
          <p className="text-muted-foreground">
            Pregled garantnih servisa za Beko brandove za fakturisanje
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4" />
          <span className="text-sm text-muted-foreground">
            {billingData ? `${billingData.month} ${billingData.year}` : 'Izaberite period'}
          </span>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Filteri i postavke
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Mesec</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Izaberite mesec" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Godina</label>
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Izaberite godinu" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i).map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col justify-end">
              <div className="flex items-center space-x-2">
                <Switch
                  id="enhanced-mode"
                  checked={enhancedMode}
                  onCheckedChange={setEnhancedMode}
                />
                <label 
                  htmlFor="enhanced-mode" 
                  className="text-sm font-medium cursor-pointer"
                >
                  Enhanced Mode
                </label>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Automatski hvata sve završene servise
              </p>
            </div>

            <div className="flex items-end gap-2">
              <Button 
                onClick={handleExportToCSV} 
                disabled={!billingData?.services.length}
                className="flex-1"
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button 
                onClick={handlePrintReport} 
                disabled={!billingData?.services.length}
                className="flex-1"
              >
                <Printer className="h-4 w-4 mr-2" />
                Štampaj
              </Button>
              <Button 
                onClick={() => {
                  const url = `/api/admin/billing/beko/enhanced/pdf/${selectedYear}/${selectedMonth}`;
                  window.open(url, '_blank');
                }}
                disabled={!selectedMonth || !selectedYear}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                data-testid="button-download-pdf"
              >
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {billingData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Ukupno servisa</p>
                  <p className="text-2xl font-bold">{billingData.totalServices}</p>
                </div>
                <Package className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Ukupna vrednost za naplatu</p>
                  <p className="text-2xl font-bold">{(billingData.totalServices * 30.25).toFixed(2)}€</p>
                </div>
                <Euro className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Brendovi</p>
                  <p className="text-2xl font-bold">{billingData.brandBreakdown.length}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          {billingData.autoDetectedCount !== undefined && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Auto-detektovano</p>
                    <p className="text-2xl font-bold">{billingData.autoDetectedCount}</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="py-12">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <span className="ml-2">Učitavam podatke...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Data */}
      {!isLoading && billingData && billingData.totalServices === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Nema garantnih servisa za Beko brendove u izabranom periodu ({billingData.month} {billingData.year}).
          </AlertDescription>
        </Alert>
      )}

      {/* Brand Breakdown */}
      {billingData && billingData.brandBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5" />
              Raspored po brendovima
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {billingData.brandBreakdown.map((brand) => (
                <div key={brand.brand} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                    <div>
                      <p className="font-medium">{brand.brand}</p>
                      <p className="text-sm text-muted-foreground">{brand.count} servisa</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{Number(brand.billingAmount || brand.cost || 0).toFixed(2)}€</p>
                    <p className="text-sm text-muted-foreground">
                      {brand.count > 0 ? (Number(brand.billingAmount || brand.cost || 0) / brand.count).toFixed(2) : '0.00'}€ po servisu
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Services Table */}
      {billingData && billingData.services.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detaljni pregled servisa ({billingData.services.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Servis</th>
                    <th className="text-left p-2">Klijent</th>
                    <th className="text-left p-2">Uređaj</th>
                    <th className="text-left p-2">Serviser</th>
                    <th className="text-left p-2">Datum</th>
                    <th className="text-left p-2">Cena</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Akcije</th>
                  </tr>
                </thead>
                <tbody>
                  {billingData.services.map((service) => (
                    <tr key={service.id} className="border-b hover:bg-muted/50">
                      <td className="p-2">
                        <div>
                          <p className="font-medium">#{service.serviceNumber}</p>
                          {service.description && (
                            <p className="text-sm text-muted-foreground">{service.description.substring(0, 40)}...</p>
                          )}
                          {service.technicianNotes && (
                            <p className="text-sm text-blue-600 font-medium mt-1">
                              <span className="text-xs text-blue-500">Rad:</span> {service.technicianNotes.substring(0, 60)}...
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-2">
                        <div>
                          <p className="font-medium">{service.clientName}</p>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {service.clientPhone}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {service.clientCity}
                          </div>
                        </div>
                      </td>
                      <td className="p-2">
                        <div>
                          <p className="font-medium">{service.manufacturerName}</p>
                          <p className="text-sm text-muted-foreground">{service.applianceModel}</p>
                          <p className="text-xs text-muted-foreground">{service.serialNumber}</p>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span className="text-sm">{service.technicianName}</span>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span className="text-sm">
                            {format(new Date(service.completedDate), 'dd.MM.yyyy')}
                          </span>
                        </div>
                        {service.isAutoDetected && (
                          <Badge variant="secondary" className="text-xs mt-1">
                            Auto-detektovano
                          </Badge>
                        )}
                      </td>
                      <td className="p-2">
                        <p className="font-bold">{Number(service.billingPrice || service.cost || 0).toFixed(2)}€</p>
                        <p className="text-xs text-muted-foreground">
                          {service.billingPriceReason || 'Standardna tarifa'}
                        </p>
                      </td>
                      <td className="p-2">
                        <Badge variant="default" className="bg-green-500">
                          Garantni
                        </Badge>
                      </td>
                      <td className="p-2">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditPrice(service)}
                            data-testid={`button-edit-price-${service.id}`}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Uredi
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hover:border-red-600"
                            onClick={() => handleExcludeFromBilling(service)}
                            data-testid={`button-exclude-${service.id}`}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Obriši
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Mode Info */}
      {billingData && enhancedMode && billingData.detectionSummary && (
        <Alert>
          <Zap className="h-4 w-4" />
          <AlertDescription>
            <strong>Enhanced Mode aktiviran:</strong> Automatski detektovano {billingData.detectionSummary.withCompletedDate} servisa sa datumom završetka i {billingData.detectionSummary.withUpdatedDateFallback} servisa sa backup datumom kreiranja.
          </AlertDescription>
        </Alert>
      )}

      {/* Dialog za uređivanje cijene */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Uredi cijenu i dokumentaciju</DialogTitle>
            <DialogDescription>
              Servis #{editingService?.serviceNumber} - {editingService?.clientName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="price">Nova cijena (€)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="Unesite novu cijenu"
                data-testid="input-billing-price"
              />
              <p className="text-xs text-gray-500">
                Trenutna cijena: {(editingService?.billingPrice || editingService?.cost || 0).toFixed(2)} €
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Dokumentacija / Razlog promjene</Label>
              <Textarea
                id="reason"
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                placeholder="Napomena o promjeni cijene (npr: 'Dodatan deo', 'Specijalan popust', itd.)"
                rows={4}
                data-testid="input-billing-reason"
              />
              <p className="text-xs text-gray-500">
                Ova dokumentacija će biti prikazana uz servis
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={updateBillingMutation.isPending}
              data-testid="button-cancel-edit"
            >
              Otkaži
            </Button>
            <Button
              onClick={handleSavePrice}
              disabled={updateBillingMutation.isPending}
              data-testid="button-save-billing"
            >
              {updateBillingMutation.isPending ? 'Čuvanje...' : 'Sačuvaj'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog za potvrdu brisanja iz billing izvještaja */}
      <Dialog open={excludeDialogOpen} onOpenChange={setExcludeDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Obriši servis iz billing izvještaja
            </DialogTitle>
            <DialogDescription>
              Servis #{excludingService?.serviceNumber} - {excludingService?.clientName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Alert className="border-yellow-500 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-900">
                <p className="font-semibold mb-2">Da li ste sigurni da želite da uklonite ovaj servis iz billing izvještaja?</p>
                <p className="text-sm">
                  Servis će biti trajno isključen iz svih budućih izvještaja za ComPlus i Beko fakturisanje. 
                  Ova akcija se preporučuje samo ako je servis greškom dodat u billing listu.
                </p>
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setExcludeDialogOpen(false)}
              disabled={excludeFromBillingMutation.isPending}
              data-testid="button-cancel-exclude"
            >
              Otkaži
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmExclude}
              disabled={excludeFromBillingMutation.isPending}
              data-testid="button-confirm-exclude"
            >
              {excludeFromBillingMutation.isPending ? 'Brisanje...' : 'Obriši iz izvještaja'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}