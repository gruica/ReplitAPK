import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { warrantyStatusStrictEnum } from "@shared/schema";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import BusinessLayout from "@/components/layout/business-layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowLeft, CheckCircle2, ChevronUp, ChevronDown } from "lucide-react";
import {
import { logger } from '@/utils/logger';
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Tip za kategoriju uređaja
interface ApplianceCategory {
  id: number;
  name: string;
  icon: string;
}

// Tip za proizvođača
interface Manufacturer {
  id: number;
  name: string;
}

// Jednostavna validaciona šema usklađena sa backend logikom
const newServiceSchema = z.object({
  // Podaci o klijentu - pojednostavljeno
  clientFullName: z.string().min(1, "Ime i prezime klijenta je obavezno"),
  clientPhone: z.string().min(1, "Telefon klijenta je obavezan"),
  clientEmail: z.string().optional().or(z.literal("")),
  clientAddress: z.string().optional().or(z.literal("")),
  clientCity: z.string().optional().or(z.literal("")),
  
  // Podaci o uređaju - pojednostavljeno
  categoryId: z.string().min(1, "Izaberite kategoriju uređaja"),
  manufacturerId: z.string().min(1, "Izaberite proizvođača"),
  model: z.string().min(1, "Model uređaja je obavezan"),
  serialNumber: z.string().optional().or(z.literal("")),
  purchaseDate: z.string().optional().or(z.literal("")),
  
  // Podaci o servisu
  description: z.string().min(1, "Opis problema je obavezan"),
  warrantyStatus: warrantyStatusStrictEnum,
  saveClientData: z.boolean().default(true),
});

type NewServiceFormValues = z.infer<typeof newServiceSchema>;

export default function NewBusinessServiceRequest() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    client: true,
    appliance: true,
    warranty: true,
    description: true
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  // Dohvatanje kategorija uređaja
  const { data: categories, isLoading: isLoadingCategories } = useQuery<ApplianceCategory[]>({
    queryKey: ["/api/categories"],
  });
  
  // Dohvatanje proizvođača
  const { data: manufacturers, isLoading: isLoadingManufacturers } = useQuery<Manufacturer[]>({
    queryKey: ["/api/manufacturers"],
  });
  
  // Dohvatanje clientId iz URL-a ako postoji
  const [location] = useLocation();
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const clientId = urlParams.get('clientId');
  
  // Dohvatanje podataka klijenta ako je clientId prosleđen
  const { data: client, isLoading: isLoadingClient } = useQuery({
    queryKey: ['/api/clients', clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const response = await fetch(`/api/clients/${clientId}`);
      if (!response.ok) throw new Error('Greška pri dohvatanju klijenta');
      return await response.json();
    },
    enabled: !!clientId
  });
  
  // Inicijalizacija forme
  const form = useForm<NewServiceFormValues>({
    resolver: zodResolver(newServiceSchema),
    defaultValues: {
      clientFullName: client?.fullName || "",
      clientPhone: client?.phone || "",
      clientEmail: client?.email || "",
      clientAddress: client?.address || "",
      clientCity: client?.city || "",
      categoryId: "",
      manufacturerId: "",
      model: "",
      serialNumber: "",
      purchaseDate: "",
      description: "",
      warrantyStatus: undefined,
      saveClientData: true,
    },
  });
  
  // Mutacija za kreiranje servisa putem business partner API-ja
  const createServiceMutation = useMutation({
    mutationFn: async (data: NewServiceFormValues) => {
      setIsSubmitting(true);
      
      try {
        
        // Koristimo specijalizovanu business partner rutu sa JWT autentifikacijom
        const serviceResponse = await apiRequest("/api/business/services", {
          method: "POST",
          body: JSON.stringify({
            // Podaci o klijentu
            clientFullName: data.clientFullName.trim(),
            clientPhone: data.clientPhone.trim(),
            clientEmail: data.clientEmail?.trim() || "",
            clientAddress: data.clientAddress?.trim() || "",
            clientCity: data.clientCity?.trim() || "",
            
            // Podaci o uređaju
            categoryId: data.categoryId,
            manufacturerId: data.manufacturerId,
            model: data.model.trim(),
            serialNumber: data.serialNumber?.trim() || "",
            
            // Opis servisa
            description: data.description.trim(),
            
            // OBAVEZNO - Status garancije
            warrantyStatus: data.warrantyStatus.trim()
          })
        });
        
        if (!serviceResponse.ok) {
          const errorData = await serviceResponse.json().catch(() => null);
          logger.error("Greška response:", errorData);
          
          if (errorData && (errorData.message || errorData.error)) {
            throw new Error(errorData.message || errorData.error);
          } else {
            throw new Error("Greška prilikom kreiranja servisa. Proverite podatke i pokušajte ponovo.");
          }
        }
        
        return await serviceResponse.json();
      } catch (error) {
        logger.error("Greška pri kreiranju servisa:", error);
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    onSuccess: () => {
      setSubmitSuccess(true);
      // Invalidate services cache to refresh the services list
      queryClient.invalidateQueries({ queryKey: ["/api/business/services"] });
      toast({
        title: "Zahtev uspešno kreiran",
        description: "Vaš zahtev za servis je uspešno kreiran i biće uskoro obrađen.",
      });
    },
    onError: (error: Error) => {
      
      // Pokušaj da izvučeš više informacija iz greške ako postoje
      let errorMessage = error.message || "Došlo je do greške prilikom kreiranja zahteva za servis.";
      
      // Pokušaj da parsiraš poruku greške ako je JSON string
      try {
        if (error.message && error.message.includes('{')) {
          const jsonStartIndex = error.message.indexOf('{');
          const jsonString = error.message.substring(jsonStartIndex);
          const errorData = JSON.parse(jsonString);
          
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = typeof errorData.error === 'string' 
              ? errorData.error 
              : "Nevažeći podaci. Proverite sve unete informacije.";
          }
        }
      } catch (parseError) {
      }
      
      toast({
        title: "Greška pri kreiranju zahteva",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (values: NewServiceFormValues) => {
    createServiceMutation.mutate(values);
  };
  
  if (submitSuccess) {
    return (
      <BusinessLayout>
        <div className="max-w-md mx-auto text-center py-12">
          <div className="bg-green-100 rounded-full p-3 inline-flex mb-6">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold mb-4">Zahtev uspešno kreiran</h2>
          <p className="text-gray-600 mb-8">
            Vaš zahtev za servis je uspešno kreiran i prosleđen našem timu. Možete pratiti status zahteva u sekciji servisni zahtevi.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => navigate("/business/services")}>
              Pregledaj zahteve
            </Button>
            <Button variant="outline" onClick={() => {
              form.reset();
              setSubmitSuccess(false);
            }}>
              Kreiraj novi zahtev
            </Button>
          </div>
        </div>
      </BusinessLayout>
    );
  }

  return (
    <BusinessLayout>
      <div className="space-y-6 max-w-4xl mx-auto pb-20">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate("/business/services")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Novi servisni zahtev</h2>
            <p className="text-muted-foreground">
              Kreirajte zahtev za servis u ime klijenta
            </p>
          </div>
        </div>
        

        {/* Service creation form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Quick action buttons */}
              <div className="flex gap-2 mb-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setExpandedSections({ client: true, appliance: true, warranty: true, description: true });
                  }}
                >
                  Otvori sve sekcije
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setExpandedSections({ client: false, appliance: false, warranty: false, description: true });
                  }}
                >
                  Zatvori sve sekcije
                </Button>
              </div>

              {/* Client Section */}
              <Card>
                <CardHeader 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleSection('client')}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle>Podaci o klijentu</CardTitle>
                    {expandedSections.client ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                  <CardDescription>
                    Unesite informacije o klijentu za koga se kreira servisni zahtev
                  </CardDescription>
                </CardHeader>
                {expandedSections.client && (
                  <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="clientFullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ime i prezime klijenta</FormLabel>
                      <FormControl>
                        <Input placeholder="npr. Marko Petrović" {...field} />
                      </FormControl>
                      <FormDescription>
                        Obavezno polje - unesite puno ime i prezime (min. 3 karaktera)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="clientPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefon klijenta</FormLabel>
                        <FormControl>
                          <Input placeholder="npr. 067123456 ili +382 67 123 456" {...field} />
                        </FormControl>
                        <FormDescription>
                          Obavezno polje - unesite važeći broj telefona (najmanje 6 cifara)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="clientEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email klijenta (opciono)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="npr. klijent@example.com" 
                            type="email" 
                            {...field} 
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormDescription>
                          Opcionalno polje - unesite validnu email adresu za kontakt
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="clientAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Adresa klijenta</FormLabel>
                        <FormControl>
                          <Input placeholder="npr. Ulica Slobode 25" {...field} />
                        </FormControl>
                        <FormDescription>
                          Obavezno polje - unesite punu adresu (min. 5 karaktera)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="clientCity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Grad klijenta</FormLabel>
                        <FormControl>
                          <Input placeholder="npr. Podgorica" {...field} />
                        </FormControl>
                        <FormDescription>
                          Obavezno polje - unesite grad klijenta (min. 2 karaktera)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="saveClientData"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Sačuvaj podatke o klijentu</FormLabel>
                        <FormDescription>
                          Čekirajte ovo polje ako želite da sačuvate podatke o klijentu za buduće zahteve
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                  </CardContent>
                )}
              </Card>
              
              {/* Appliance Section */}
              <Card>
                <CardHeader 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleSection('appliance')}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle>Podaci o uređaju</CardTitle>
                    {expandedSections.appliance ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                  <CardDescription>
                    Unesite informacije o uređaju koji treba servisirati
                  </CardDescription>
                </CardHeader>
                {expandedSections.appliance && (
                  <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kategorija uređaja</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Izaberite kategoriju uređaja" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isLoadingCategories ? (
                              <div className="flex items-center justify-center p-4">
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                <span>Učitavanje kategorija...</span>
                              </div>
                            ) : (
                              categories?.map((category) => (
                                <SelectItem
                                  key={category.id}
                                  value={category.id.toString()}
                                >
                                  {category.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="manufacturerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Proizvođač</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Izaberite proizvođača" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isLoadingManufacturers ? (
                              <div className="flex items-center justify-center p-4">
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                <span>Učitavanje proizvođača...</span>
                              </div>
                            ) : (
                              manufacturers?.map((manufacturer) => (
                                <SelectItem
                                  key={manufacturer.id}
                                  value={manufacturer.id.toString()}
                                >
                                  {manufacturer.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Model uređaja</FormLabel>
                        <FormControl>
                          <Input placeholder="npr. WV60-1860" {...field} />
                        </FormControl>
                        <FormDescription>
                          Obavezno polje - unesite tačan model uređaja (min. 2 karaktera)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="serialNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Serijski broj (opciono)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="npr. SN-12345678" 
                            {...field} 
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormDescription>
                          Opcionalno polje - unesite serijski broj ako je dostupan
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="purchaseDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Datum kupovine (opciono)</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        Opcionalno polje - unesite približan datum kupovine ako je poznat
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                  </CardContent>
                )}
              </Card>

              {/* Warranty Status Section */}
              <Card>
                <CardHeader 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleSection('warranty')}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle>Status garancije</CardTitle>
                    {expandedSections.warranty ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                  <CardDescription>
                    Odaberite da li je uređaj pod garancijom
                  </CardDescription>
                </CardHeader>
                {expandedSections.warranty && (
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="warrantyStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status garancije</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className={!field.value ? "border-red-300" : ""}>
                                <SelectValue placeholder="⚠️ OBAVEZNO - Odaberite status garancije" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="u garanciji">🛡️ U garanciji</SelectItem>
                              <SelectItem value="van garancije">💰 Van garancije</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription className="text-amber-600 font-medium">
                            ⚠️ OBAVEZNO POLJE - Morate odabrati da li je uređaj pod garancijom ili van garancije
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                )}
              </Card>
              
              {/* Description Section */}
              <Card>
                <CardHeader 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleSection('description')}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle>Opis problema</CardTitle>
                    {expandedSections.description ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                  <CardDescription>
                    Opišite problem sa uređajem koji treba servisirati
                  </CardDescription>
                </CardHeader>
                {expandedSections.description && (
                  <CardContent>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Detaljan opis problema</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="npr. Frižider ne hladi dovoljno, čuje se glasno zujanje iz zadnjeg dela uređaja. Problem je počeo pre dva dana." 
                          className="min-h-[120px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        <p>Obavezno polje - opišite problem što detaljnije (min. 10 karaktera)</p>
                        <p className="mt-2 text-muted-foreground">Uključite informacije kao što su:</p>
                        <ul className="list-disc pl-5 text-sm text-muted-foreground">
                          <li>Kako se problem manifestuje</li>
                          <li>Kada je problem primećen</li>
                          <li>Da li postoje specifični zvukovi ili simptomi</li>
                          <li>Prethodne opravke (ako ih je bilo)</li>
                        </ul>
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                  </CardContent>
                )}
                <CardFooter className="flex justify-between">
                  <div className="text-sm text-gray-500">
                    * Sva polja označena kao obavezna moraju biti popunjena
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full md:w-auto"
                    disabled={isSubmitting}
                    size="lg"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Kreiranje zahteva...
                      </span>
                    ) : "Kreiraj servisni zahtev"}
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </Form>
      </div>
    </BusinessLayout>
  );
}