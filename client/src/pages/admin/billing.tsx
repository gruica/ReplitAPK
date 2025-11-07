import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { FileText, DollarSign, TrendingUp, Shield } from "lucide-react";

export default function AdminBilling() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing izvještaji</h1>
          <p className="text-muted-foreground mt-2">
            Generišite i pregledajte fakturne izvještaje za sve brendove
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Beko Warranty Billing */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-blue-600" />
              <div>
                <CardTitle>Beko - Garancijski servisi</CardTitle>
                <CardDescription>Izvještaj servisa u garanciji za Beko, Grundig i Blomberg</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Servisi sa warranty_status = "u garanciji" i cost = 0. Beko plaća standardnu tarifu (30.25€).
            </p>
            <Link href="/admin/beko-billing">
              <Button className="w-full" data-testid="button-beko-warranty">
                <FileText className="mr-2 h-4 w-4" />
                Otvori izvještaj
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* ComPlus Warranty Billing */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-green-600" />
              <div>
                <CardTitle>ComPlus - Garancijski servisi</CardTitle>
                <CardDescription>Izvještaj servisa u garanciji za Electrolux, AEG, Zanussi</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Servisi sa warranty_status = "u garanciji" i cost = 0. ComPlus plaća standardnu tarifu (25.00€).
            </p>
            <Link href="/admin/complus-billing">
              <Button className="w-full" variant="secondary" data-testid="button-complus-warranty">
                <FileText className="mr-2 h-4 w-4" />
                Otvori izvještaj
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Beko Out-of-Warranty */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-orange-600" />
              <div>
                <CardTitle>Beko - Van garancije</CardTitle>
                <CardDescription>Izvještaj servisa van garancije za Beko brendove</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Servisi sa warranty_status = "van garancije" i cost {'>'} 0. Klijent plaća servis.
            </p>
            <Link href="/admin/beko-out-of-warranty-billing">
              <Button className="w-full" variant="outline" data-testid="button-beko-out-warranty">
                <TrendingUp className="mr-2 h-4 w-4" />
                Otvori izvještaj
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* ComPlus Out-of-Warranty */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-red-600" />
              <div>
                <CardTitle>ComPlus - Van garancije</CardTitle>
                <CardDescription>Izvještaj servisa van garancije za ComPlus brendove</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Servisi sa warranty_status = "van garancije" i cost {'>'} 0. Klijent plaća servis.
            </p>
            <Link href="/admin/complus-out-of-warranty-billing">
              <Button className="w-full" variant="outline" data-testid="button-complus-out-warranty">
                <TrendingUp className="mr-2 h-4 w-4" />
                Otvori izvještaj
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-lg">Napomene o billing logici</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex gap-2">
            <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
            <p>
              <strong>Garancijski servisi:</strong> warranty_status = "u garanciji" AND cost = NULL/0 
              → Brend plaća standardnu tarifu
            </p>
          </div>
          <div className="flex gap-2">
            <DollarSign className="h-4 w-4 text-orange-600 mt-0.5" />
            <p>
              <strong>Van garancije:</strong> warranty_status = "van garancije" AND cost {'>'}  0 
              → Klijent plaća unesenu cijenu
            </p>
          </div>
          <div className="flex gap-2">
            <TrendingUp className="h-4 w-4 text-green-600 mt-0.5" />
            <p>
              <strong>Prioritet cijene:</strong> billingPrice (admin override) → cost (serviser unos) → 0
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
