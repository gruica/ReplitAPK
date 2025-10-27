import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { ArrowLeft, Phone, Mail, MapPin, MessageCircle, Clock, Wrench } from 'lucide-react';
import { SEO } from '@/components/SEO';

export default function ContactPage() {
  return (
    <>
      <SEO 
        title="Kontakt - Frigo Sistem Todosijević | Pozovite Nas"
        description="Kontaktirajte Frigo Sistem Todosijević za servis bele tehnike. Telefon, WhatsApp, email - dostupni smo radnim danima 08:00-17:00h."
        keywords="kontakt, telefon, email, whatsapp, servis, frigo sistem, kotor"
        canonical="https://www.tehnikamne.me/contact"
      />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto max-w-4xl px-4">
          {/* Header */}
          <div className="mb-8">
            <Button variant="ghost" asChild className="mb-4">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Nazad na početnu
              </Link>
            </Button>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Kontaktirajte nas</h1>
            <p className="text-gray-600">Tu smo da vam pomognemo sa servisom bele tehnike</p>
          </div>

          {/* Main Content */}
          <div className="space-y-6">
            {/* Quick Contact */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                      <Phone className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="font-semibold mb-2">Telefon</h3>
                    <a href="tel:+38267051141" className="text-blue-600 hover:underline">
                      +382 67 051 141
                    </a>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                      <MessageCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="font-semibold mb-2">WhatsApp</h3>
                    <a href="https://wa.me/38267051141" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">
                      +382 67 051 141
                    </a>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                      <Mail className="h-6 w-6 text-purple-600" />
                    </div>
                    <h3 className="font-semibold mb-2">Email</h3>
                    <a href="mailto:info@frigosistemtodosijevic.me" className="text-purple-600 hover:underline text-sm">
                      info@frigosistemtodosijevic.me
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Working Hours */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  Radno vreme
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="font-semibold mb-2">Radni dani</p>
                    <p className="text-gray-600">Ponedeljak - Petak: 08:00 - 17:00h</p>
                  </div>
                  <div>
                    <p className="font-semibold mb-2">Subota</p>
                    <p className="text-gray-600">08:00 - 14:00h</p>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Hitni pozivi:</strong> Za hitne slučajeve dostupni smo i van radnog vremena putem telefona.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Location */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-red-600" />
                  Naša lokacija
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="font-semibold mb-2">Adresa</p>
                    <p className="text-gray-600">Lastva Grbaljska 85317</p>
                    <p className="text-gray-600">Kotor, Crna Gora</p>
                  </div>
                  <div>
                    <p className="font-semibold mb-2">Područje pokrivenosti</p>
                    <p className="text-gray-600">Kotor, Tivat, Budva, Herceg Novi i okolina</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Services */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-orange-600" />
                  Naše usluge
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Bela tehnika</h4>
                    <ul className="text-sm space-y-1 text-gray-600">
                      <li>• Frižideri i zamrzivači</li>
                      <li>• Veš mašine</li>
                      <li>• Mašine za sudove</li>
                      <li>• Šporeti i rerne</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Klima uređaji</h4>
                    <ul className="text-sm space-y-1 text-gray-600">
                      <li>• Instalacija klima uređaja</li>
                      <li>• Servis i održavanje</li>
                      <li>• Dopuna gasa</li>
                      <li>• Čišćenje filtera</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Methods */}
            <Card>
              <CardHeader>
                <CardTitle>Kako nas možete kontaktirati</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-blue-600 mt-1" />
                    <div>
                      <h4 className="font-semibold">Pozovite nas</h4>
                      <p className="text-sm text-gray-600">Direktan kontakt sa našim stručnjacima. Dostupni radnim danima.</p>
                      <a href="tel:+38267051141" className="text-blue-600 hover:underline text-sm">+382 67 051 141</a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MessageCircle className="h-5 w-5 text-green-600 mt-1" />
                    <div>
                      <h4 className="font-semibold">WhatsApp poruka</h4>
                      <p className="text-sm text-gray-600">Pošaljite nam poruku sa opisom problema. Odgovaramo u toku radnog vremena.</p>
                      <a href="https://wa.me/38267051141" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline text-sm">Pošalji WhatsApp poruku</a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-purple-600 mt-1" />
                    <div>
                      <h4 className="font-semibold">Email</h4>
                      <p className="text-sm text-gray-600">Pošaljite nam email sa detaljima o vašem uređaju i problemu.</p>
                      <a href="mailto:info@frigosistemtodosijevic.me" className="text-purple-600 hover:underline text-sm">info@frigosistemtodosijevic.me</a>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* FAQ */}
            <Card>
              <CardHeader>
                <CardTitle>Često postavljana pitanja</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-1">Koliko brzo možete doći?</h4>
                    <p className="text-sm text-gray-600">Obično dolazimo isti ili sledeći radni dan, u zavisnosti od lokacije i zauzetosti.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Da li dolazite na lokaciju?</h4>
                    <p className="text-sm text-gray-600">Da, dolazimo na vašu adresu u Kotoru, Tivtu, Budvi, Herceg Novom i okolini.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Koliko košta dolazak?</h4>
                    <p className="text-sm text-gray-600">Dolazak naplaćujemo samo ako se servis ne izvrši. Kontaktirajte nas za više informacija.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Da li imate rezervne delove?</h4>
                    <p className="text-sm text-gray-600">Imamo veliki izbor originalnih rezervnih delova za sve brendove bele tehnike.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Important Links */}
            <Card>
              <CardHeader>
                <CardTitle>Korisni linkovi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" asChild size="sm">
                    <Link href="/privacy-policy">Politika privatnosti</Link>
                  </Button>
                  <Button variant="outline" asChild size="sm">
                    <Link href="/terms-of-service">Uslovi korišćenja</Link>
                  </Button>
                  <Button variant="outline" asChild size="sm">
                    <Link href="/data-deletion">Brisanje podataka</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>© 2025 Frigo Sistem Todosijević. Sva prava zadržana.</p>
          </div>
        </div>
      </div>
    </>
  );
}
