import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, FileText, Download, Euro, CheckCircle, User, Phone, MapPin, Package, Clock, Printer, Zap, AlertCircle, Edit, Trash2, TrendingUp, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequestWithAuth, queryClient } from '@/lib/queryClient';
import { logger } from '@/utils/logger';

interface UsedPartDetail {
  partName: string;
  partNumber: string;
  quantity: number;
  unitCost: string;
}

interface BillingService {
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
  isWarrantyService?: boolean;
  isAutoDetected?: boolean;
  detectionMethod?: string;
  billingPrice?: number;
  billingPriceReason?: string;
}

interface BrandBreakdown {
  brand: string;
  count: number;
  cost: number;
  billingAmount?: number;
}

interface MonthlyReport {
  month: string;
  year: number;
  brandGroup: string;
  services: BillingService[];
  servicesByBrand: Record<string, BillingService[]>;
  totalServices: number;
  totalCost: number;
  autoDetectedCount?: number;
  detectionSummary?: {
    withCompletedDate: number;
    withUpdatedDateFallback: number;
  };
  brandBreakdown: BrandBreakdown[];
  totalBillingAmount?: number;
}

interface ThemeColors {
  primary: string;
  primaryHover: string;
  gradient: string;
  cardGradient: string;
  bgGradient: string;
  border: string;
  hover: string;
  text: string;
  light: string;
}

interface UniversalBillingReportProps {
  brandGroup: 'beko' | 'complus';
  theme: 'red' | 'blue';
  title: string;
  subtitle: string;
  brands: string[];
  apiEndpoint: string;
  csvFilename: string;
  pdfFilename: string;
}

const themeConfig: Record<'red' | 'blue', ThemeColors> = {
  red: {
    primary: 'red-600',
    primaryHover: 'red-700',
    gradient: 'from-red-600 via-red-700 to-red-800',
    cardGradient: 'from-white to-red-50',
    bgGradient: 'from-slate-50 via-red-50 to-slate-50',
    border: 'border-red-100',
    hover: 'hover:border-red-300 hover:bg-red-50',
    text: 'text-red-600',
    light: 'bg-red-50'
  },
  blue: {
    primary: 'blue-600',
    primaryHover: 'blue-700',
    gradient: 'from-blue-600 via-blue-700 to-blue-800',
    cardGradient: 'from-white to-blue-50',
    bgGradient: 'from-slate-50 via-blue-50 to-slate-50',
    border: 'border-blue-100',
    hover: 'hover:border-blue-300 hover:bg-blue-50',
    text: 'text-blue-600',
    light: 'bg-blue-50'
  }
};

export default function UniversalBillingReport({
  brandGroup,
  theme,
  title,
  subtitle,
  brands,
  apiEndpoint,
  csvFilename,
  pdfFilename
}: UniversalBillingReportProps) {
  const currentDate = new Date();
  const colors = themeConfig[theme];
  
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const savedMonth = localStorage.getItem(`${brandGroup}_billing_month`);
    return savedMonth || String(currentDate.getMonth() + 1).padStart(2, '0');
  });
  
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    const savedYear = localStorage.getItem(`${brandGroup}_billing_year`);
    return savedYear ? parseInt(savedYear) : currentDate.getFullYear();
  });
  
  const [enhancedMode, setEnhancedMode] = useState<boolean>(() => {
    const savedEnhanced = localStorage.getItem(`${brandGroup}_billing_enhanced`);
    return savedEnhanced ? savedEnhanced === 'true' : true;
  });

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<BillingService | null>(null);
  const [newPrice, setNewPrice] = useState<string>('');
  const [newReason, setNewReason] = useState<string>('');
  
  const [excludeDialogOpen, setExcludeDialogOpen] = useState(false);
  const [excludingService, setExcludingService] = useState<BillingService | null>(null);
  
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

  useEffect(() => {
    localStorage.setItem(`${brandGroup}_billing_month`, selectedMonth);
  }, [selectedMonth, brandGroup]);

  useEffect(() => {
    localStorage.setItem(`${brandGroup}_billing_year`, selectedYear.toString());
  }, [selectedYear, brandGroup]);

  useEffect(() => {
    localStorage.setItem(`${brandGroup}_billing_enhanced`, enhancedMode.toString());
  }, [enhancedMode, brandGroup]);

  const { data: billingData, isLoading, refetch: refetchBillingData } = useQuery({
    queryKey: [enhancedMode ? `${apiEndpoint}/enhanced` : apiEndpoint, selectedMonth, selectedYear, enhancedMode],
    staleTime: 0,
    enabled: !!selectedMonth && !!selectedYear,
    queryFn: async () => {
      const params = new URLSearchParams({
        month: selectedMonth,
        year: selectedYear.toString()
      });
      
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('Nema autentifikacije');
      
      const endpoint = enhancedMode 
        ? `${apiEndpoint}/enhanced?${params}`
        : `${apiEndpoint}?${params}`;
      
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Greška pri učitavanju podataka');
      return response.json();
    }
  });

  const updateBillingMutation = useMutation({
    mutationFn: async ({ serviceId, billingPrice, billingPriceReason }: { 
      serviceId: number; 
      billingPrice: number; 
      billingPriceReason: string;
    }) => {
      return apiRequestWithAuth('PATCH', `/api/admin/services/${serviceId}/billing`, {
        billingPrice,
        billingPriceReason
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ 
        queryKey: [enhancedMode ? `${apiEndpoint}/enhanced` : apiEndpoint, selectedMonth, selectedYear, enhancedMode],
        exact: true
      });
      await refetchBillingData();
      toast({
        title: "Uspjeh",
        description: "Cijena uspješno ažurirana",
      });
      setEditDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Greška",
        description: "Greška pri ažuriranju cijene",
        variant: "destructive",
      });
    }
  });

  const excludeFromBillingMutation = useMutation({
    mutationFn: async ({ serviceId, exclude }: { serviceId: number; exclude: boolean }) => {
      return apiRequestWithAuth('PATCH', `/api/admin/services/${serviceId}/exclude`, { exclude });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ 
        queryKey: [enhancedMode ? `${apiEndpoint}/enhanced` : apiEndpoint, selectedMonth, selectedYear, enhancedMode],
        exact: true
      });
      await refetchBillingData();
      toast({
        title: "Uspjeh",
        description: "Servis isključen iz billinga",
      });
      setExcludeDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Greška",
        description: "Greška pri isključivanju servisa",
        variant: "destructive",
      });
    }
  });

  const handleEditPrice = (service: BillingService) => {
    setEditingService(service);
    setNewPrice(service.billingPrice?.toString() || service.cost?.toString() || '30.25');
    setNewReason(service.billingPriceReason || '');
    setEditDialogOpen(true);
  };

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

  const handleExcludeFromBilling = (service: BillingService) => {
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

  const handleExportToCSV = () => {
    logger.log('CSV Export clicked!', billingData?.services.length);
    if (!billingData?.services.length) {
      logger.log('No billing data, returning early');
      return;
    }

    const csvHeaders = 'Broj servisa;Klijent;Telefon;Adresa;Grad;Uređaj;Brend;Model;Serijski broj;Serviser;Datum završetka;Cena;Opis problema;Izvršeni rad;Utrošeni rezervni dijelovi\n';
    
    const csvData = billingData.services.map((service: BillingService) => {
      const partsText = service.usedPartsDetails && service.usedPartsDetails.length > 0
        ? service.usedPartsDetails.map((p: UsedPartDetail) => `${p.partName} (${p.partNumber}) x${p.quantity}`).join(', ')
        : (service.usedParts || 'Nema');
      
      const billingPriceNum = parseFloat(service.billingPrice as any);
      const costNum = parseFloat(service.cost as any);
      const price = !isNaN(billingPriceNum) ? billingPriceNum : (!isNaN(costNum) ? costNum : 0);
        
      return `${service.serviceNumber};"${service.clientName}";"${service.clientPhone}";"${service.clientAddress}";"${service.clientCity}";"${service.applianceCategory}";"${service.manufacturerName}";"${service.applianceModel}";"${service.serialNumber}";"${service.technicianName}";"${format(new Date(service.completedDate), 'dd.MM.yyyy')}";"${price.toFixed(2)}";"${(service.description || '').replace(/"/g, '""')}";"${(service.technicianNotes || '').replace(/"/g, '""')}";"${partsText.replace(/"/g, '""')}"`;
    }).join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvHeaders + csvData], { type: 'text/csv;charset=utf-8;' });
    logger.log('CSV Blob created, size:', blob.size);
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', csvFilename);
    logger.log('CSV Download filename:', csvFilename);
    document.body.appendChild(link);
    link.click();
    logger.log('CSV Link clicked!');
    document.body.removeChild(link);
  };

  const handleDownloadPDF = async () => {
    logger.log('PDF Download clicked!', selectedMonth, selectedYear);
    if (!selectedMonth || !selectedYear) {
      logger.log('No month/year selected, returning early');
      return;
    }
    
    try {
      const token = localStorage.getItem('auth_token');
      logger.log('Auth token exists:', !!token);
      if (!token) {
        toast({
          title: "Greška",
          description: "Nema autentifikacije",
          variant: "destructive"
        });
        return;
      }

      const url = `${apiEndpoint}/enhanced/pdf/${selectedYear}/${selectedMonth}`;
      logger.log('Fetching PDF from:', url);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Greška pri preuzimanju PDF-a');
      }

      const blob = await response.blob();
      logger.log('PDF Blob received, size:', blob.size);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = pdfFilename;
      logger.log('PDF Download filename:', pdfFilename);
      document.body.appendChild(link);
      link.click();
      logger.log('PDF Link clicked!');
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      toast({
        title: "Uspjeh",
        description: "PDF uspješno preuzet",
      });
    } catch (error) {
      logger.error('PDF download error:', error);
      toast({
        title: "Greška",
        description: "Greška pri preuzimanju PDF-a",
        variant: "destructive"
      });
    }
  };

  const handlePrintReport = () => {
    if (!billingData?.services.length) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const printContent = `
      <html>
        <head>
          <title>${title} - ${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}</title>
          <style>
            @page { size: A4 landscape; margin: 15mm; }
            body { 
              font-family: Arial, sans-serif; 
              font-size: 8px;
              margin: 0;
              padding: 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 2px solid ${theme === 'red' ? '#dc2626' : '#2563eb'};
              padding-bottom: 10px;
            }
            .header h1 {
              margin: 0;
              color: ${theme === 'red' ? '#dc2626' : '#2563eb'};
              font-size: 18px;
            }
            .header p {
              margin: 5px 0;
              color: #666;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 10px;
            }
            th {
              background-color: ${theme === 'red' ? '#dc2626' : '#2563eb'};
              color: white;
              padding: 8px 4px;
              text-align: left;
              font-weight: bold;
              font-size: 8px;
              border: 1px solid ${theme === 'red' ? '#b91c1c' : '#1d4ed8'};
            }
            td {
              padding: 6px 4px;
              border: 1px solid #ddd;
              font-size: 7px;
            }
            tr:nth-child(even) {
              background-color: #f9fafb;
            }
            .service-number { font-weight: bold; color: ${theme === 'red' ? '#dc2626' : '#2563eb'}; }
            .phone { font-size: 7px; }
            .brand { font-weight: bold; }
            .serial { font-family: monospace; font-size: 6px; }
            .cost { font-weight: bold; color: #059669; }
            .footer {
              margin-top: 20px;
              text-align: center;
              font-size: 7px;
              color: #666;
              border-top: 1px solid #ddd;
              padding-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${title} - ${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}</h1>
            <p>Garantni servisi | Ukupno: ${billingData.totalServices} servisa | Vrijednost: ${(billingData.totalServices * 30.25).toFixed(2)}€</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Servis</th>
                <th>Klijent</th>
                <th>Telefon</th>
                <th>Adresa</th>
                <th>Grad</th>
                <th>Kategorija</th>
                <th>Brend</th>
                <th>Model</th>
                <th>S/N</th>
                <th>Serviser</th>
                <th>Datum</th>
                <th>Cijena</th>
                <th>Rad</th>
                <th>Dijelovi</th>
              </tr>
            </thead>
            <tbody>
              ${billingData.services.map((service: BillingService) => {
                const partsText = service.usedPartsDetails && service.usedPartsDetails.length > 0
                  ? service.usedPartsDetails.map((p: UsedPartDetail) => `${p.partName} x${p.quantity}`).join(', ')
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
            Izveštaj generisan: ${format(new Date(), 'dd.MM.yyyy HH:mm')} | Frigo Sistem Todosijević | ${title}
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  const brandColors = ['600', '500', '500', '500', '500'];

  return (
    <div className={`min-h-screen bg-gradient-to-br ${colors.bgGradient} p-6 space-y-6`}>
      {/* Premium Header */}
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${colors.gradient} p-8 shadow-2xl`}>
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]"></div>
        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                  <Building2 className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-white tracking-tight">{title}</h1>
                  <p className={`text-${theme}-100 text-lg mt-1`}>
                    Garantni servisi · {subtitle}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-6 py-3 border border-white/20">
              <div className="flex items-center gap-2 text-white">
                <Calendar className="h-5 w-5" />
                <span className="font-semibold text-lg">
                  {billingData ? `${billingData.month} ${billingData.year}` : 'Izaberite period'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters - Premium Design */}
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader className={`border-b bg-gradient-to-r from-slate-50 to-${theme}-50`}>
          <CardTitle className="flex items-center gap-2 text-xl">
            <div className={`p-2 bg-${theme}-100 rounded-lg`}>
              <Zap className={`h-5 w-5 text-${theme}-600`} />
            </div>
            Postavke i filteri
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Calendar className={`h-4 w-4 text-${theme}-600`} />
                Mesec
              </label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className={`h-11 border-2 hover:border-${theme}-300 transition-colors`}>
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
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Godina</label>
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger className={`h-11 border-2 hover:border-${theme}-300 transition-colors`}>
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

            <div className="flex flex-col justify-end space-y-2">
              <div className={`flex items-center space-x-3 p-3 bg-gradient-to-r from-${theme}-50 to-${theme === 'red' ? 'orange' : 'cyan'}-50 rounded-lg border-2 ${colors.border}`}>
                <Switch
                  id="enhanced-mode"
                  checked={enhancedMode}
                  onCheckedChange={setEnhancedMode}
                  className={`data-[state=checked]:bg-${theme}-600`}
                />
                <label 
                  htmlFor="enhanced-mode" 
                  className="text-sm font-semibold cursor-pointer text-slate-700"
                >
                  Enhanced Mode
                </label>
              </div>
              <p className="text-xs text-slate-500 pl-3">
                Automatski hvata sve završene servise
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Button 
                onClick={handleExportToCSV} 
                disabled={!billingData?.services.length}
                variant="outline"
                className="h-11 border-2 hover:border-emerald-400 hover:bg-emerald-50"
              >
                <Download className="h-4 w-4 mr-2" />
                CSV Export
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={handlePrintReport} 
                  disabled={!billingData?.services.length}
                  variant="outline"
                  className={`h-11 border-2 ${colors.hover}`}
                >
                  <Printer className="h-4 w-4" />
                </Button>
                <Button 
                  onClick={handleDownloadPDF}
                  disabled={!selectedMonth || !selectedYear}
                  className={`h-11 bg-gradient-to-r from-${theme}-600 to-${theme}-700 hover:from-${theme}-700 hover:to-${theme}-800 text-white shadow-lg`}
                  data-testid={`button-download-pdf-${brandGroup}`}
                >
                  <FileText className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats - Premium Cards */}
      {billingData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium mb-1">Ukupno servisa</p>
                  <p className="text-4xl font-bold">{billingData.totalServices}</p>
                </div>
                <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
                  <Package className="h-10 w-10" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm font-medium mb-1">Ukupna vrijednost</p>
                  <p className="text-4xl font-bold">{(billingData.totalServices * 30.25).toFixed(2)}€</p>
                </div>
                <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
                  <Euro className="h-10 w-10" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`border-0 shadow-lg bg-gradient-to-br from-${theme === 'red' ? 'orange' : 'cyan'}-500 to-${theme === 'red' ? 'orange' : 'cyan'}-600 text-white overflow-hidden`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-${theme === 'red' ? 'orange' : 'cyan'}-100 text-sm font-medium mb-1`}>Brendovi</p>
                  <p className="text-4xl font-bold">{billingData.brandBreakdown.length}</p>
                </div>
                <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
                  <CheckCircle className="h-10 w-10" />
                </div>
              </div>
            </CardContent>
          </Card>

          {billingData.autoDetectedCount !== undefined && (
            <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-500 to-amber-600 text-white overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-amber-100 text-sm font-medium mb-1">Auto-detektovano</p>
                    <p className="text-4xl font-bold">{billingData.autoDetectedCount}</p>
                  </div>
                  <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
                    <Zap className="h-10 w-10" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card className="border-0 shadow-xl">
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="relative">
                <div className={`animate-spin rounded-full h-16 w-16 border-4 border-${theme}-200`}></div>
                <div className={`animate-spin rounded-full h-16 w-16 border-t-4 border-${theme}-600 absolute top-0 left-0`}></div>
              </div>
              <p className="text-lg font-medium text-slate-600">Učitavam podatke...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Data */}
      {!isLoading && billingData && billingData.totalServices === 0 && (
        <Alert className="border-0 bg-gradient-to-r from-amber-50 to-orange-50 shadow-lg">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <AlertDescription className="text-slate-700 font-medium">
            Nema garantnih servisa za {brands.join(', ')} brendove u izabranom periodu ({billingData.month} {billingData.year}).
          </AlertDescription>
        </Alert>
      )}

      {/* Brand Breakdown - Premium Design */}
      {billingData && billingData.brandBreakdown.length > 0 && (
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader className={`border-b bg-gradient-to-r from-slate-50 to-${theme}-50`}>
            <CardTitle className="flex items-center gap-2 text-xl">
              <div className={`p-2 bg-${theme}-100 rounded-lg`}>
                <TrendingUp className={`h-5 w-5 text-${theme}-600`} />
              </div>
              Raspored po brendovima
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className={`grid grid-cols-1 md:grid-cols-3 ${brands.length > 3 ? 'lg:grid-cols-5' : ''} gap-4`}>
              {billingData.brandBreakdown.map((brand: BrandBreakdown, idx: number) => (
                <div key={brand.brand} className={`group relative overflow-hidden rounded-xl bg-gradient-to-br ${colors.cardGradient} p-6 border-2 ${colors.border} ${colors.hover} transition-all hover:shadow-lg`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full bg-${theme}-${brandColors[idx]}`}></div>
                      <p className={`font-bold ${brands.length > 3 ? 'text-sm' : 'text-base'} text-slate-800`}>{brand.brand}</p>
                    </div>
                  </div>
                  <Badge className={`bg-${theme}-100 text-${theme}-700 border-0 mb-3`}>{brand.count} servisa</Badge>
                  <div>
                    <p className={`text-${brands.length > 3 ? '2xl' : '3xl'} font-bold text-${theme}-600`}>{Number(brand.billingAmount || brand.cost || 0).toFixed(2)}€</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {brand.count > 0 ? (Number(brand.billingAmount || brand.cost || 0) / brand.count).toFixed(2) : '0.00'}€ po servisu
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Services Table - Premium Design */}
      {billingData && billingData.services.length > 0 && (
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader className={`border-b bg-gradient-to-r from-slate-50 to-${theme}-50`}>
            <CardTitle className="flex items-center gap-2 text-xl">
              <div className={`p-2 bg-${theme}-100 rounded-lg`}>
                <FileText className={`h-5 w-5 text-${theme}-600`} />
              </div>
              Detaljni pregled servisa
              <Badge className={`ml-auto bg-${theme}-600 text-white`}>{billingData.services.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`border-b-2 ${colors.border}`}>
                    <th className={`text-left p-4 font-semibold text-slate-700 ${colors.light}`}>Servis</th>
                    <th className={`text-left p-4 font-semibold text-slate-700 ${colors.light}`}>Klijent</th>
                    <th className={`text-left p-4 font-semibold text-slate-700 ${colors.light}`}>Uređaj</th>
                    <th className={`text-left p-4 font-semibold text-slate-700 ${colors.light}`}>Serviser</th>
                    <th className={`text-left p-4 font-semibold text-slate-700 ${colors.light}`}>Izvršeni rad</th>
                    <th className={`text-left p-4 font-semibold text-slate-700 ${colors.light}`}>Korišteni dijelovi</th>
                    <th className={`text-left p-4 font-semibold text-slate-700 ${colors.light}`}>Datum</th>
                    <th className={`text-left p-4 font-semibold text-slate-700 ${colors.light}`}>Cijena</th>
                    <th className={`text-left p-4 font-semibold text-slate-700 ${colors.light}`}>Status</th>
                    <th className={`text-left p-4 font-semibold text-slate-700 ${colors.light}`}>Akcije</th>
                  </tr>
                </thead>
                <tbody>
                  {billingData.services.map((service: BillingService, idx: number) => (
                    <tr key={service.id} className={`border-b hover:bg-${theme}-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                      <td className="p-4">
                        <div>
                          <p className={`font-bold ${colors.text}`}>#{service.serviceNumber}</p>
                          {service.description && (
                            <p className="text-sm text-slate-600 mt-1">{service.description.substring(0, 40)}...</p>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-800">{service.clientName}</p>
                          <div className="flex items-center gap-1.5 text-sm text-slate-600">
                            <Phone className={`h-3.5 w-3.5 text-${theme}-500`} />
                            {service.clientPhone}
                          </div>
                          <div className="flex items-center gap-1.5 text-sm text-slate-600">
                            <MapPin className={`h-3.5 w-3.5 text-${theme}-500`} />
                            {service.clientCity}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-800">{service.manufacturerName}</p>
                          <p className="text-sm text-slate-600">{service.applianceModel}</p>
                          <p className="text-xs text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded inline-block">{service.serialNumber}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 bg-${theme}-100 rounded-full`}>
                            <User className={`h-4 w-4 text-${theme}-600`} />
                          </div>
                          <span className="text-sm font-medium text-slate-700">{service.technicianName}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="max-w-xs">
                          <p className="text-sm text-slate-700 leading-relaxed">
                            {service.technicianNotes || '-'}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="max-w-xs">
                          {service.usedPartsDetails && service.usedPartsDetails.length > 0 ? (
                            <div className="space-y-1">
                              {service.usedPartsDetails.map((part: UsedPartDetail, idx: number) => (
                                <div key={idx} className={`text-xs ${colors.light} px-2 py-1 rounded`}>
                                  <span className="font-semibold">{part.partName}</span>
                                  {part.partNumber && <span className="text-slate-500 ml-1">({part.partNumber})</span>}
                                  <span className={`ml-1 ${colors.text}`}>x{part.quantity}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-600">{service.usedParts || '-'}</p>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-slate-400" />
                          <span className="text-sm font-medium text-slate-700">
                            {format(new Date(service.completedDate), 'dd.MM.yyyy')}
                          </span>
                        </div>
                        {service.isAutoDetected && (
                          <Badge variant="secondary" className="text-xs mt-2 bg-amber-100 text-amber-700 border-0">
                            Auto
                          </Badge>
                        )}
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="text-lg font-bold text-emerald-600">{Number(service.billingPrice || service.cost || 0).toFixed(2)}€</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {service.billingPriceReason || 'Standardna tarifa'}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-0 shadow-sm">
                          Garantni
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditPrice(service)}
                            className={`hover:bg-${theme}-50 hover:border-${theme}-300`}
                            data-testid={`button-edit-price-${service.id}`}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-300"
                            onClick={() => handleExcludeFromBilling(service)}
                            data-testid={`button-exclude-${service.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

      {/* Edit Price Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Uredi billing cijenu</DialogTitle>
            <DialogDescription>
              {editingService && `Servis #${editingService.serviceNumber} - ${editingService.clientName}`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="price">Nova cijena (€)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="30.25"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reason">Razlog izmjene</Label>
              <Textarea
                id="reason"
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                placeholder="Opciono: objasnite razlog izmjene cijene"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Otkaži
            </Button>
            <Button onClick={handleSavePrice} disabled={updateBillingMutation.isPending} className={`bg-${theme}-600 hover:bg-${theme}-700`}>
              {updateBillingMutation.isPending ? "Čuvanje..." : "Sačuvaj"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exclude Dialog */}
      <Dialog open={excludeDialogOpen} onOpenChange={setExcludeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Isključi iz billinga?</DialogTitle>
            <DialogDescription>
              {excludingService && `Da li ste sigurni da želite isključiti servis #${excludingService.serviceNumber}?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExcludeDialogOpen(false)}>
              Otkaži
            </Button>
            <Button 
              onClick={handleConfirmExclude} 
              disabled={excludeFromBillingMutation.isPending}
              className={`bg-${theme}-600 hover:bg-${theme}-700`}
            >
              {excludeFromBillingMutation.isPending ? "Isključivanje..." : "Isključi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
