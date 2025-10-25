/**
 * MODULARNA KOMPONENTA ZA RESET LOZINKE
 * 
 * Prikazuje dialog sa dva koraka:
 * 1. Zahtev za reset - unos email adrese
 * 2. Reset lozinke - unos koda i nove lozinke
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
import { KeyRound, Mail, CheckCircle2, ArrowLeft } from "lucide-react";

const requestResetSchema = z.object({
  email: z.string().email("Unesite validnu email adresu")
});

const resetPasswordSchema = z.object({
  code: z.string().length(6, "Kod mora imati tačno 6 cifara").regex(/^\d+$/, "Kod mora sadržati samo brojeve"),
  newPassword: z.string().min(6, "Lozinka mora imati najmanje 6 karaktera"),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Lozinke se ne podudaraju",
  path: ["confirmPassword"]
});

type RequestResetValues = z.infer<typeof requestResetSchema>;
type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

interface PasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PasswordResetModal({ isOpen, onClose }: PasswordResetModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<'request' | 'reset' | 'success'>('request');
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const requestForm = useForm<RequestResetValues>({
    resolver: zodResolver(requestResetSchema),
    defaultValues: { email: '' }
  });

  const resetForm = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      code: '',
      newPassword: '',
      confirmPassword: ''
    }
  });

  const handleRequestReset = async (values: RequestResetValues) => {
    setIsSending(true);

    try {
      const res = await apiRequest("/api/auth/send-password-reset", {
        method: "POST",
        body: JSON.stringify({ email: values.email })
      });

      const response = await res.json();

      if (response.success) {
        setEmail(values.email);
        setStep('reset');
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
      setIsSending(false);
    }
  };

  const handleResetPassword = async (values: ResetPasswordValues) => {
    setIsResetting(true);

    try {
      const res = await apiRequest("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          email,
          code: values.code,
          newPassword: values.newPassword
        })
      });

      const response = await res.json();

      if (response.success) {
        setStep('success');
        toast({
          title: "Lozinka promenjena! ✅",
          description: response.message,
        });
        
        // Zatvaranje nakon 2 sekunde
        setTimeout(() => {
          handleClose();
        }, 2000);
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
        description: error.message || "Došlo je do greške pri resetovanju lozinke.",
        variant: "destructive"
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleClose = () => {
    setStep('request');
    setEmail('');
    requestForm.reset();
    resetForm.reset();
    onClose();
  };

  const handleResendCode = async () => {
    try {
      const res = await apiRequest("/api/auth/send-password-reset", {
        method: "POST",
        body: JSON.stringify({ email })
      });

      const response = await res.json();

      if (response.success) {
        toast({
          title: "Novi kod poslat!",
          description: response.message,
        });
      }
    } catch (error: any) {
      toast({
        title: "Greška",
        description: error.message || "Greška pri slanju novog koda.",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        {step === 'request' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Resetovanje lozinke
              </DialogTitle>
              <DialogDescription>
                Unesite vašu email adresu. Poslaćemo vam kod za resetovanje lozinke.
              </DialogDescription>
            </DialogHeader>

            <Form {...requestForm}>
              <form onSubmit={requestForm.handleSubmit(handleRequestReset)} className="space-y-4">
                <FormField
                  control={requestForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email adresa</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="vas@email.com"
                          data-testid="input-reset-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isSending}
                  data-testid="button-send-reset-code"
                >
                  {isSending ? "Šaljem..." : "Pošalji kod"}
                </Button>
              </form>
            </Form>
          </>
        )}

        {step === 'reset' && (
          <>
            <DialogHeader>
              <Button
                variant="ghost"
                size="sm"
                className="w-fit -ml-2 mb-2"
                onClick={() => setStep('request')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Nazad
              </Button>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Unesite kod i novu lozinku
              </DialogTitle>
              <DialogDescription>
                Kod je poslat na <strong>{email}</strong>
              </DialogDescription>
            </DialogHeader>

            <Form {...resetForm}>
              <form onSubmit={resetForm.handleSubmit(handleResetPassword)} className="space-y-4">
                <FormField
                  control={resetForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kod za resetovanje</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="123456"
                          maxLength={6}
                          className="text-center text-2xl tracking-widest font-mono"
                          data-testid="input-reset-code"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={resetForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nova lozinka</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          placeholder="Unesite novu lozinku"
                          data-testid="input-new-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={resetForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Potvrdite lozinku</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          placeholder="Potvrdite novu lozinku"
                          data-testid="input-confirm-password"
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
                    disabled={isResetting}
                    data-testid="button-reset-password"
                  >
                    {isResetting ? "Resetujem..." : "Resetuj lozinku"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleResendCode}
                    data-testid="button-resend-reset-code"
                  >
                    Pošalji novi kod
                  </Button>
                </div>
              </form>
            </Form>
          </>
        )}

        {step === 'success' && (
          <div className="text-center py-6">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Lozinka uspešno promenjena!</h3>
            <p className="text-muted-foreground">
              Možete se sada prijaviti sa novom lozinkom.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
