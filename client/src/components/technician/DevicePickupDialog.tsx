import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Package, Calendar, FileText, CheckCircle } from "lucide-react";
import { logger } from '@/utils/logger';

const devicePickupSchema = z.object({
  confirmPickup: z.boolean().refine(val => val === true, {
    message: "Morate potvrditi preuzimanje aparata"
  }),
  pickupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum mora biti u formatu YYYY-MM-DD"),
  pickupNotes: z.string().max(500, "Napomene su predugačke (maksimum 500 karaktera)").optional()
});

type DevicePickupFormData = z.infer<typeof devicePickupSchema>;

interface DevicePickupDialogProps {
  service: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function DevicePickupDialog({ service, isOpen, onClose, onSuccess }: DevicePickupDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<DevicePickupFormData>({
    resolver: zodResolver(devicePickupSchema),
    defaultValues: {
      confirmPickup: false,
      pickupDate: new Date().toISOString().split('T')[0],
      pickupNotes: ""
    }
  });

  const pickupMutation = useMutation({
    mutationFn: async (data: DevicePickupFormData) => {
      logger.log(`📦 [DEVICE PICKUP] Označavam preuzimanje aparata za servis #${service.id}`);
      
      return apiRequest(`/api/services/${service.id}/status`, {
        method: "PUT",
        body: JSON.stringify({
          status: service.status || "in_progress",
          devicePickedUp: true,
          pickupDate: data.pickupDate,
          pickupNotes: data.pickupNotes || ""
        })
      });
    },
    onSuccess: () => {
      logger.log(`✅ [DEVICE PICKUP] Aparat uspešno označen kao preuzet za servis #${service.id}`);
      
      toast({
        title: "Aparat preuzet",
        description: `Aparat je uspešno označen kao preuzet. Datum: ${form.getValues('pickupDate')}`
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/services/technician"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-services"] });
      
      form.reset();
      onClose();
      
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: any) => {
      logger.error('❌ [DEVICE PICKUP] Greška pri označavanju preuzimanja:', error);
      
      toast({
        title: "Greška",
        description: error?.message || "Greška pri označavanju preuzimanja aparata",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: DevicePickupFormData) => {
    pickupMutation.mutate(data);
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  if (!service) return null;

  const clientName = service.client?.fullName || service.clientName || "Nepoznat klijent";
  const applianceName = service.appliance?.category?.name || service.categoryName || "Nepoznat uređaj";
  const applianceModel = service.appliance?.model || service.applianceModel || "";

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Preuzimanje aparata
          </DialogTitle>
          <DialogDescription>
            Označite da ste preuzeli aparat od klijenta za servisiranje
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Servis:</span>
              <span className="text-sm font-bold text-blue-700">#{service.id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Klijent:</span>
              <span className="text-sm text-gray-900">{clientName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Uređaj:</span>
              <span className="text-sm text-gray-900">
                {applianceName} {applianceModel && `- ${applianceModel}`}
              </span>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="confirmPickup"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-green-50 border-green-200">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-confirm-pickup"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-medium text-gray-900">
                        Potvrđujem da sam preuzeo/la aparat od klijenta
                      </FormLabel>
                      <p className="text-xs text-gray-600">
                        Aparat će biti označen kao preuzet u sistemu
                      </p>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pickupDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Datum preuzimanja
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field}
                        data-testid="input-pickup-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pickupNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Napomene o stanju (opciono)
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Npr: Aparat bele boje, ispravan kabl, bez vidljivih oštećenja, serijski broj..."
                        className="resize-none"
                        rows={3}
                        {...field}
                        data-testid="textarea-pickup-notes"
                      />
                    </FormControl>
                    <p className="text-xs text-gray-500">
                      Dokumentujte stanje aparata prilikom preuzimanja
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleClose}
                  disabled={pickupMutation.isPending}
                  data-testid="button-cancel-pickup"
                >
                  Otkaži
                </Button>
                <Button 
                  type="submit"
                  disabled={pickupMutation.isPending || !form.watch('confirmPickup')}
                  data-testid="button-confirm-pickup"
                >
                  {pickupMutation.isPending ? (
                    <>Označavam...</>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Potvrdi preuzimanje
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
