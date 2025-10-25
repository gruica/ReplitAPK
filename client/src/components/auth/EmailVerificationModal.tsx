/**
 * MODULARNA KOMPONENTA ZA EMAIL VERIFIKACIJU
 * 
 * Prikazuje dialog sa formom za unos 6-cifrenog verifikacionog koda
 * Može se koristiti nakon registracije ili kada korisnik zatraži novi kod
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, CheckCircle2 } from "lucide-react";

const verificationSchema = z.object({
  code: z.string().length(6, "Kod mora imati tačno 6 cifara").regex(/^\d+$/, "Kod mora sadržati samo brojeve")
});

type VerificationValues = z.infer<typeof verificationSchema>;

interface EmailVerificationModalProps {
  isOpen: boolean;
  email: string;
  onSuccess: () => void;
  onClose: () => void;
}

export function EmailVerificationModal({ 
  isOpen, 
  email, 
  onSuccess, 
  onClose 
}: EmailVerificationModalProps) {
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const form = useForm<VerificationValues>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      code: ""
    }
  });

  const handleVerify = async (values: VerificationValues) => {
    setIsVerifying(true);

    try {
      const res = await apiRequest("/api/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({
          email,
          code: values.code
        })
      });

      const response = await res.json();

      if (response.success) {
        setIsVerified(true);
        toast({
          title: "Email verifikovan! ✅",
          description: response.message,
        });
        
        // Zatvaranje dijaloga nakon 1.5 sekunde
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        toast({
          title: "Greška pri verifikaciji",
          description: response.message,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Greška",
        description: error.message || "Došlo je do greške pri verifikaciji.",
        variant: "destructive"
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    setIsResending(true);

    try {
      const res = await apiRequest("/api/auth/send-email-verification", {
        method: "POST",
        body: JSON.stringify({ email })
      });

      const response = await res.json();

      if (response.success) {
        toast({
          title: "Kod poslat! 📧",
          description: response.message,
        });
      } else {
        toast({
          title: "Greška",
          description: response.message,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Greška",
        description: error.message || "Došlo je do greške pri slanju koda.",
        variant: "destructive"
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {!isVerified ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Verifikacija email adrese
              </DialogTitle>
              <DialogDescription>
                Uneli smo 6-cifreni kod na <strong>{email}</strong>. Molimo proverite vaš inbox i unesite kod ispod.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleVerify)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Verifikacijski kod</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="123456"
                          maxLength={6}
                          className="text-center text-2xl tracking-widest font-mono"
                          data-testid="input-verification-code"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex flex-col gap-2">
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isVerifying}
                    data-testid="button-verify-email"
                  >
                    {isVerifying ? "Proveravam..." : "Potvrdi kod"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleResendCode}
                    disabled={isResending}
                    data-testid="button-resend-code"
                  >
                    {isResending ? "Šaljem..." : "Pošalji novi kod"}
                  </Button>
                </div>
              </form>
            </Form>
          </>
        ) : (
          <div className="text-center py-6">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Email uspešno verifikovan!</h3>
            <p className="text-muted-foreground">
              Sada možete da se prijavite na svoj nalog.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
