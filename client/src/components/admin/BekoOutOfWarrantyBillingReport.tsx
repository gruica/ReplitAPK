import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, FileText, Download, Euro, User, Phone, MapPin, Wrench, Package, Clock, Edit, Trash2, ShieldOff } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface BekoOutOfWarrantyService {
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
  warrantyStatus: string;
  isWarrantyService: boolean;
  billingPrice?: number;
  billingPriceReason?: string;
}

export default function BekoOutOfWarrantyBillingReport() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<string>(String(currentDate.getMonth() + 1).padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<BekoOutOfWarrantyService | null>(null);
  const [newPrice, setNewPrice] = useState<string>('');
  const [newReason, setNewReason] = useState<string>('');
  
  const [excludeDialogOpen, setExcludeDialogOpen] = useState(false);
  const [excludingService, setExcludingService] = useState<BekoOutOfWarrantyService | null>(null);
  
  const { toast } = useToast();

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

  const { data: billingData, isLoading, refetch } = useQuery({
    queryKey: ['/api/admin/billing/beko/out-of-warranty', selectedMonth, selectedYear],
    enabled: !!selectedMonth && !!selectedYear,
    queryFn: async () => {
      const params = new URLSearchParams({
        month: selectedMonth,
        year: selectedYear.toString()
      });
      
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('Nema autentifikacije');
      
      const response = await fetch(`/api/admin/billing/beko/out-of-warranty?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Greška pri učitavanju van garancije izvještaja');
      }
      
      return response.json();
    }
  });

  const updateBillingMutation = useMutation({
    mutationFn: async ({ serviceId, price, reason }: { serviceId: number; price: string; reason: string }) => {
      return apiRequest(`/api/admin/services/${serviceId}/billing`, {
        method: 'PATCH',
        body: JSON.stringify({
          billingPrice: parseFloat(price),
          billingPriceReason: reason
        })
      });
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Uspješno ažurirano",
        description: "Cijena i dokumentacija su ažurirani",
      });
      
      // RUČNO AŽURIRAJ CACHE - promijeni cijenu i razlog servisa
      if (billingData) {
        const queryKey = ['/api/admin/billing/beko/out-of-warranty', selectedMonth, selectedYear];
        const oldService = billingData.services.find((s: BekoOutOfWarrantyService) => s.id === variables.serviceId);
        const oldPrice = oldService?.billingPrice || 0;
        const newPriceNum = parseFloat(variables.price) || 0;
        
        queryClient.setQueryData(queryKey, {
          ...billingData,
          services: billingData.services.map((s: BekoOutOfWarrantyService) => 
            s.id === variables.serviceId 
              ? { ...s, billingPrice: newPriceNum, billingPriceReason: variables.reason }
              : s
          ),
          totalAmount: billingData.totalAmount - oldPrice + newPriceNum
        });
      }
      
      setEditDialogOpen(false);
      setEditingService(null);
      setNewPrice('');
      setNewReason('');
    },
    onError: () => {
      toast({
        title: "Greška",
        description: "Nije moguće ažurirati billing podatke",
        variant: "destructive"
      });
    }
  });

  const excludeFromBillingMutation = useMutation({
    mutationFn: async ({ serviceId, exclude }: { serviceId: number; exclude: boolean }) => {
      return apiRequest(`/api/admin/services/${serviceId}/exclude-from-billing`, {
        method: 'PATCH',
        body: JSON.stringify({ exclude })
      });
    },
    onSuccess: (_, variables) => {
      toast({
        title: variables.exclude ? "Servis isključen" : "Servis uključen",
        description: variables.exclude 
          ? "Servis je isključen iz billing izvještaja" 
          : "Servis je vraćen u billing izvještaje",
      });
      
      // RUČNO AŽURIRAJ CACHE - ukloni servis iz liste
      if (variables.exclude && billingData) {
        const queryKey = ['/api/admin/billing/beko/out-of-warranty', selectedMonth, selectedYear];
        queryClient.setQueryData(queryKey, {
          ...billingData,
          services: billingData.services.filter((s: BekoOutOfWarrantyService) => s.id !== variables.serviceId),
          totalServices: billingData.totalServices - 1,
          totalAmount: billingData.totalAmount - (billingData.services.find((s: BekoOutOfWarrantyService) => s.id === variables.serviceId)?.billingPrice || 0)
        });
      }
      
      setExcludeDialogOpen(false);
      setExcludingService(null);
    },
    onError: () => {
      toast({
        title: "Greška",
        description: "Nije moguće ažurirati status servisa",
        variant: "destructive"
      });
    }
  });

  const handleEditPrice = (service: BekoOutOfWarrantyService) => {
    setEditingService(service);
    setNewPrice(service.billingPrice?.toString() || service.cost?.toString() || '');
    setNewReason(service.billingPriceReason || '');
    setEditDialogOpen(true);
  };

  const handleSavePrice = () => {
    if (!editingService) return;
    
    updateBillingMutation.mutate({
      serviceId: editingService.id,
      price: newPrice,
      reason: newReason
    });
  };

  const handleExcludeService = (service: BekoOutOfWarrantyService) => {
    setExcludingService(service);
    setExcludeDialogOpen(true);
  };

  const handleConfirmExclude = () => {
    if (!excludingService) return;
    
    excludeFromBillingMutation.mutate({
      serviceId: excludingService.id,
      exclude: true
    });
  };

  const exportToCSV = () => {
    if (!billingData?.services || billingData.services.length === 0) {
      toast({
        title: "Nema podataka",
        description: "Nema servisa za izvoz",
        variant: "destructive"
      });
      return;
    }

    const csvHeaders = [
      'Servis ID',
      'Klijent',
      'Telefon',
      'Adresa',
      'Grad',
      'Uređaj',
      'Brend',
      'Model',
      'Serijski broj',
      'Serviser',
      'Datum završetka',
      'Cijena (€)',
      'Razlog cijene'
    ].join(',');

    const csvRows = billingData.services.map((service: BekoOutOfWarrantyService) => [
      service.serviceNumber,
      `"${service.clientName}"`,
      `"${service.clientPhone}"`,
      `"${service.clientAddress}"`,
      `"${service.clientCity}"`,
      `"${service.applianceCategory}"`,
      `"${service.manufacturerName}"`,
      `"${service.applianceModel}"`,
      `"${service.serialNumber}"`,
      `"${service.technicianName}"`,
      service.completedDate ? format(new Date(service.completedDate), 'dd.MM.yyyy') : 'N/A',
      service.billingPrice || 0,
      `"${service.billingPriceReason || ''}"`
    ].join(','));

    const csvContent = [csvHeaders, ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `beko_van_garancije_${selectedMonth}_${selectedYear}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "CSV izvezen",
      description: `Izvještaj za ${months.find(m => m.value === selectedMonth)?.label} ${selectedYear} je preuzet`,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldOff className="h-5 w-5" />
            Beko Van Garancije Billing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Učitavanje...</div>
        </CardContent>
      </Card>
    );
  }

  const services = billingData?.services || [];
  const totalAmount = billingData?.totalAmount || 0;
  const totalServices = billingData?.totalServices || 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldOff className="h-5 w-5" />
            Beko Van Garancije Billing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label>Mjesec</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger data-testid="select-month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map(month => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1">
              <Label>Godina</Label>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger data-testid="select-year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2023, 2024, 2025, 2026].map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={exportToCSV} variant="outline" data-testid="button-export-csv">
                <Download className="h-4 w-4 mr-2" />
                Izvezi CSV
              </Button>
            </div>
          </div>

          <Alert>
            <AlertDescription className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>Van garancije servisi - Brendovi: Beko, Grundig, Blomberg</span>
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{totalServices}</div>
                <p className="text-xs text-muted-foreground">Ukupno servisa</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">{totalAmount.toFixed(2)} €</div>
                <p className="text-xs text-muted-foreground">Ukupna suma</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{services.length > 0 ? (totalAmount / totalServices).toFixed(2) : '0.00'} €</div>
                <p className="text-xs text-muted-foreground">Prosječna cijena</p>
              </CardContent>
            </Card>
          </div>

          {services.length === 0 ? (
            <Alert>
              <AlertDescription>
                Nema van garancije servisa za odabrani period
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {services.map((service: BekoOutOfWarrantyService) => (
                <Card key={service.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-600 mb-1">Servis & Klijent</p>
                        <p className="font-bold">#{service.serviceNumber}</p>
                        <div className="flex items-center gap-1 text-sm mt-1">
                          <User className="h-3 w-3" />
                          {service.clientName}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Phone className="h-3 w-3" />
                          {service.clientPhone}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <MapPin className="h-3 w-3" />
                          {service.clientAddress}, {service.clientCity}
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-gray-600 mb-1">Uređaj</p>
                        <div className="flex items-center gap-1">
                          <Package className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">{service.applianceCategory}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Brend: {service.manufacturerName}
                        </p>
                        <p className="text-sm text-gray-600">
                          Model: {service.applianceModel}
                        </p>
                        <p className="text-sm text-gray-600">
                          SN: {service.serialNumber}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-gray-600 mb-1">Serviser & Status</p>
                        <div className="flex items-center gap-1 mb-2">
                          <Wrench className="h-4 w-4 text-orange-600" />
                          <span className="font-medium">{service.technicianName}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Clock className="h-3 w-3" />
                          {service.completedDate ? format(new Date(service.completedDate), 'dd.MM.yyyy') : 'N/A'}
                        </div>
                        <Badge variant="outline" className="mt-2">Van garancije</Badge>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Cijena za naplatu</p>
                          <p className="text-xl font-bold text-green-600 flex items-center gap-1">
                            <Euro className="h-4 w-4" />
                            {service.billingPrice?.toFixed(2) || '0.00'}
                          </p>
                          {service.billingPriceReason && (
                            <p className="text-xs text-gray-500 mt-1">{service.billingPriceReason}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditPrice(service)}
                          data-testid={`button-edit-price-${service.id}`}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Uredi cijenu
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleExcludeService(service)}
                          data-testid={`button-exclude-${service.id}`}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Isključi
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Uredi Billing Cijenu</DialogTitle>
            <DialogDescription>
              Ažurirajte cijenu i dodajte razlog izmjene za servis #{editingService?.serviceNumber}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="price">Nova cijena (€)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="Unesite cijenu"
                data-testid="input-new-price"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="reason">Razlog/Dokumentacija</Label>
              <Textarea
                id="reason"
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                placeholder="Opišite razlog promjene cijene..."
                rows={3}
                data-testid="textarea-price-reason"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Otkaži
            </Button>
            <Button onClick={handleSavePrice} disabled={!newPrice} data-testid="button-save-price">
              Sačuvaj
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={excludeDialogOpen} onOpenChange={setExcludeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Isključi servis iz billing izvještaja</DialogTitle>
            <DialogDescription>
              Da li ste sigurni da želite isključiti servis #{excludingService?.serviceNumber} iz billing izvještaja?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setExcludeDialogOpen(false)}>
              Otkaži
            </Button>
            <Button variant="destructive" onClick={handleConfirmExclude} data-testid="button-confirm-exclude">
              Isključi servis
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
