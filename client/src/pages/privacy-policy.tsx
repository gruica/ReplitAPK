import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { ArrowLeft, Shield, Lock, MessageCircle, Database, Eye } from 'lucide-react';
import { SEO } from '@/components/SEO';

export default function PrivacyPolicyPage() {
  return (
    <>
      <SEO 
        title="Politika Privatnosti - Frigo Sistem Todosijević | Zaštita Podataka"
        description="Politika privatnosti i zaštita ličnih podataka - Frigo Sistem Todosijević. GDPR usklađenost, WhatsApp Business API komunikacija, transparentnost i sigurnost vaših podataka."
        keywords="politika privatnosti, gdpr, zaštita podataka, lični podaci, bezbednost, whatsapp business"
        canonical="https://www.tehnikamne.me/privacy-policy"
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
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Politika privatnosti</h1>
            <p className="text-gray-600">Poslednja izmena: {new Date().toLocaleDateString('sr-RS')}</p>
          </div>

          {/* Main Content */}
          <div className="space-y-6">
            {/* Introduction */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-600" />
                  Uvod
                </CardTitle>
              </CardHeader>
              <CardContent className="prose max-w-none">
                <p>
                  Dobrodošli u Frigo Sistem Todosijević aplikaciju. Ova politika privatnosti objašnjava kako 
                  prikupljamo, koristimo, otkrivamo i čuvamo vaše informacije kada koristite našu mobilnu 
                  aplikaciju, web platformu i WhatsApp Business API usluge.
                </p>
                <p>
                  Poštujemo vašu privatnost i posvećeni smo zaštiti vaših ličnih podataka. Korišćenjem naših 
                  usluga pristajete na prikupljanje i upotrebu informacija u skladu sa ovom politikom.
                </p>
              </CardContent>
            </Card>

            {/* Company Information */}
            <Card>
              <CardHeader>
                <CardTitle>Informacije o kompaniji</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p><strong>Naziv:</strong> Frigo Sistem Todosijević</p>
                  <p><strong>Adresa:</strong> Lastva Grbaljska 85317 Kotor, Crna Gora</p>
                  <p><strong>Telefon:</strong> +382 67 051 141</p>
                  <p><strong>Email:</strong> info@frigosistemtodosijevic.me</p>
                  <p><strong>Website:</strong> www.frigosistemtodosijevic.me</p>
                  <p><strong>Email za privatnost:</strong> privacy@frigosistemtodosijevic.me</p>
                </div>
              </CardContent>
            </Card>

            {/* Data Collection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-green-600" />
                  Informacije koje prikupljamo
                </CardTitle>
              </CardHeader>
              <CardContent className="prose max-w-none">
                <h4>Informacije koje nam pružate direktno:</h4>
                <ul>
                  <li><strong>Osnovne informacije:</strong> Ime, prezime, broj telefona, email adresa, fizička adresa</li>
                  <li><strong>Informacije o uređajima:</strong> Model, serijski broj, opis kvara, fotografije uređaja</li>
                  <li><strong>Istorija servisa:</strong> Datum servisa, izvedeni radovi, korišćeni delovi, status servisa</li>
                  <li><strong>Email korespondencija:</strong> Komunikacija putem email-a o servisima i zahtevima</li>
                </ul>

                <h4>Informacije koje automatski prikupljamo:</h4>
                <ul>
                  <li><strong>Podaci o korišćenju aplikacije:</strong> Tip uređaja, operativni sistem, IP adresa</li>
                  <li><strong>Tehnički podaci:</strong> Jedinstveni identifikatori uređaja, informacije o korišćenju funkcija i usluga</li>
                  <li><strong>Log podaci:</strong> Datumi i vremena pristupa, akcije u aplikaciji</li>
                </ul>

                <h4>WhatsApp Business API komunikacija:</h4>
                <ul>
                  <li><strong>Broj telefona:</strong> WhatsApp broj za slanje obaveštenja</li>
                  <li><strong>Poruke:</strong> Sadržaj WhatsApp poruka koje razmenjujemo (potvrde, obaveštenja, status servisa)</li>
                  <li><strong>Fotografije:</strong> Fotografije sa servisa poslate putem WhatsApp-a</li>
                  <li><strong>Metapodaci:</strong> Vreme slanja/primanja poruka, status isporuke</li>
                </ul>
              </CardContent>
            </Card>

            {/* WhatsApp Communication */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-green-600" />
                  WhatsApp Business API komunikacija
                </CardTitle>
              </CardHeader>
              <CardContent className="prose max-w-none">
                <h4>Kako koristimo WhatsApp Business API:</h4>
                <p>
                  Koristimo Meta WhatsApp Business Cloud API za komunikaciju sa klijentima. Ovaj servis omogućava:
                </p>
                <ul>
                  <li>Slanje automatskih potvrda prijema zahteva za servis</li>
                  <li>Obaveštenja o zakazanim terminima</li>
                  <li>Statusne poruke o napretku servisa</li>
                  <li>Obaveštenja o potrebnim rezervnim delovima i cenama</li>
                  <li>Potvrde o završetku servisa</li>
                  <li>Slanje fotografija sa servisa uz vaš pristanak</li>
                </ul>

                <h4>Saglasnost za WhatsApp komunikaciju:</h4>
                <p>
                  Prilikom registracije ili podnošenja zahteva za servis, možete da date saglasnost za primanje 
                  WhatsApp poruka. Vaš broj telefona će biti korišćen isključivo za komunikaciju vezanu za vaše servise.
                </p>

                <h4>Odustajanje od WhatsApp komunikacije:</h4>
                <p>
                  Možete u bilo kom trenutku da se odjavite od primanja WhatsApp poruka tako što:
                </p>
                <ul>
                  <li>Pošaljete poruku "STOP" na naš WhatsApp broj</li>
                  <li>Kontaktirate našu podršku na info@frigosistemtodosijevic.me</li>
                  <li>Pozovete nas na +382 67 051 141</li>
                </ul>

                <h4>WhatsApp podaci koji se dele sa Meta platformom:</h4>
                <p>
                  Kada koristimo WhatsApp Business API, Meta (Facebook) može prikupljati:
                </p>
                <ul>
                  <li>Vaš WhatsApp broj telefona</li>
                  <li>Metapodatke poruka (vreme, status isporuke)</li>
                  <li>Informacije o vašem uređaju i vezi</li>
                </ul>
                <p>
                  Meta procesuira ove podatke u skladu sa svojom <a href="https://www.whatsapp.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">politikom privatnosti WhatsApp-a</a>.
                </p>
              </CardContent>
            </Card>

            {/* Data Usage */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-purple-600" />
                  Kako koristimo vaše informacije
                </CardTitle>
              </CardHeader>
              <CardContent className="prose max-w-none">
                <p>Vaše informacije koristimo za sledeće svrhe:</p>
                <ul>
                  <li><strong>Pružanje usluga:</strong> Kreiranje naloga, upravljanje servisima, praćenje statusa</li>
                  <li><strong>Komunikacija:</strong> Slanje obaveštenja, potvrda, tehničkih poruka putem WhatsApp-a, email-a ili SMS-a</li>
                  <li><strong>Poboljšanje usluge:</strong> Personalizacija iskustva, analiza trendova korišćenja</li>
                  <li><strong>Tehnička podrška:</strong> Rešavanje problema, pružanje pomoći</li>
                  <li><strong>Sigurnost:</strong> Otkrivanje i sprečavanje zloupotreba, zaštita sistema</li>
                  <li><strong>Pravne obaveze:</strong> Ispunjavanje pravnih i regulatornih zahteva</li>
                </ul>
              </CardContent>
            </Card>

            {/* GDPR Compliance */}
            <Card>
              <CardHeader>
                <CardTitle>Pravni osnov za obradu podataka (GDPR usklađenost)</CardTitle>
              </CardHeader>
              <CardContent className="prose max-w-none">
                <p>Ako se nalazite u Evropskom ekonomskom prostoru (EEA), naš pravni osnov za prikupljanje i korišćenje vaših informacija je:</p>
                <ul>
                  <li><strong>Vaša saglasnost:</strong> Davanjem dozvole za WhatsApp komunikaciju i korišćenje aplikacije pristajete na prikupljanje i upotrebu vaših informacija</li>
                  <li><strong>Izvršavanje ugovora:</strong> Pružanje usluga koje ste zatražili</li>
                  <li><strong>Legitimni interesi:</strong> Upravljanje našim poslom i uslugama, pod uslovom da vaša osnovna prava ne prevazilaze te interese</li>
                  <li><strong>Pravne obaveze:</strong> Čuvanje podataka u skladu sa poreskim i računovodstvenim zakonima</li>
                </ul>
              </CardContent>
            </Card>

            {/* Data Sharing */}
            <Card>
              <CardHeader>
                <CardTitle>Deljenje informacija</CardTitle>
              </CardHeader>
              <CardContent className="prose max-w-none">
                <p>Ne prodajemo, ne trgujemo niti iznajmljujemo vaše lične podatke trećim stranama. Možemo deliti informacije u sledećim situacijama:</p>
                <ul>
                  <li><strong>Pružaoci usluga:</strong> Možemo deliti informacije sa trećim stranama koje pružaju usluge u naše ime (npr. cloud hosting servisi, WhatsApp Business API, email servisi). Ove strane su obavezne da drže vaše informacije poverljivim.</li>
                  <li><strong>Pravni zahtevi:</strong> Možemo otkriti vaše informacije ako je to zakonom propisano ili kao odgovor na validne zahteve javnih organa</li>
                  <li><strong>Meta (WhatsApp):</strong> Kada koristite WhatsApp komunikaciju, Meta procesuira određene podatke u skladu sa svojom politikom privatnosti</li>
                </ul>

                <h4>Politika odgovora na zahteve vlasti:</h4>
                <p>Svaki zahtev vladinih organa podleže obaveznom pravnom pregledu. Pružamo samo minimalno potrebne podatke i, gde je zakonom dozvoljeno, obaveštavamo korisnike o zahtevima.</p>
              </CardContent>
            </Card>

            {/* Data Security */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-red-600" />
                  Sigurnost podataka
                </CardTitle>
              </CardHeader>
              <CardContent className="prose max-w-none">
                <p>Koristimo administrativne, tehničke i fizičke sigurnosne mere za zaštitu vaših ličnih podataka:</p>
                <ul>
                  <li><strong>Šifrovanje:</strong> SSL/TLS šifrovanje za prenos podataka</li>
                  <li><strong>Kontrola pristupa:</strong> Ograničen pristup podacima samo ovlašćenom osoblju</li>
                  <li><strong>Sigurne baze podataka:</strong> PostgreSQL baza sa modernim sigurnosnim mehanizmima</li>
                  <li><strong>Redovne rezerve:</strong> Automatske backup kopije podataka</li>
                  <li><strong>Monitoring:</strong> Praćenje sistema za otkrivanje neovlašćenog pristupa</li>
                </ul>
                <p className="mt-4 text-sm text-gray-600">
                  Napomena: Nijedan metod prenosa preko interneta ili metod elektronskog skladištenja nije 100% siguran.
                </p>
              </CardContent>
            </Card>

            {/* Data Retention */}
            <Card>
              <CardHeader>
                <CardTitle>Zadržavanje podataka</CardTitle>
              </CardHeader>
              <CardContent className="prose max-w-none">
                <p>
                  Zadržavamo vaše lične podatke samo onoliko koliko je potrebno za svrhe navedene u ovoj politici privatnosti, 
                  za ispunjavanje naših pravnih obaveza, rešavanje sporova i sprovođenje naših politika.
                </p>
                <ul>
                  <li><strong>Aktivni korisnički podaci:</strong> Dok je vaš nalog aktivan</li>
                  <li><strong>Istorija servisa:</strong> 5 godina radi garancije i podrške</li>
                  <li><strong>Finansijski zapisi:</strong> Prema zakonskim obavezama (obično 10 godina)</li>
                  <li><strong>WhatsApp komunikacija:</strong> 2 godine ili dok ne zatražite brisanje</li>
                  <li><strong>Fotografije servisa:</strong> 1 godina nakon završetka servisa</li>
                </ul>
              </CardContent>
            </Card>

            {/* User Rights */}
            <Card>
              <CardHeader>
                <CardTitle>Vaša prava na zaštitu podataka</CardTitle>
              </CardHeader>
              <CardContent className="prose max-w-none">
                <p>U zavisnosti od vaše lokacije, možete imati sledeća prava u vezi sa vašim ličnim podacima:</p>
                <ul>
                  <li><strong>Pristup i prenosivost:</strong> Pravo da zatražite kopije svojih ličnih podataka</li>
                  <li><strong>Ispravka:</strong> Pravo da zatražite ispravku netačnih podataka</li>
                  <li><strong>Brisanje ("Pravo na zaborav"):</strong> Pravo da zatražite brisanje svojih ličnih podataka pod određenim uslovima</li>
                  <li><strong>Ograničenje obrade:</strong> Pravo da zatražite ograničenje obrade vaših podataka</li>
                  <li><strong>Prigovor na obradu:</strong> Pravo da prigovorite obradi vaših podataka</li>
                  <li><strong>Povlačenje saglasnosti:</strong> Pravo da povučete saglasnost u bilo kom trenutku</li>
                </ul>
                <p className="mt-4">
                  Da biste ostvarili bilo koje od ovih prava, kontaktirajte nas na{' '}
                  <a href="mailto:privacy@frigosistemtodosijevic.me" className="text-blue-600 hover:underline">
                    privacy@frigosistemtodosijevic.me
                  </a>{' '}
                  ili posetite našu{' '}
                  <Link href="/data-deletion" className="text-blue-600 hover:underline">
                    stranicu za brisanje podataka
                  </Link>.
                </p>
              </CardContent>
            </Card>

            {/* Children's Privacy */}
            <Card>
              <CardHeader>
                <CardTitle>Privatnost dece</CardTitle>
              </CardHeader>
              <CardContent className="prose max-w-none">
                <p>
                  Naša aplikacija nije namenjena deci mlađoj od 13 godina. Svesno ne prikupljamo lične podatke 
                  od dece mlađe od 13 godina. Ako saznate da je dete pružilo lične podatke, molimo vas da nas kontaktirate.
                </p>
              </CardContent>
            </Card>

            {/* International Transfers */}
            <Card>
              <CardHeader>
                <CardTitle>Međunarodni transferi podataka</CardTitle>
              </CardHeader>
              <CardContent className="prose max-w-none">
                <p>
                  Vaši podaci mogu biti preneti i održavani na serverima koji se nalaze van vaše države, 
                  provincije, zemlje ili druge vladine jurisdikcije gde zakoni o zaštiti podataka mogu biti 
                  različiti od onih u vašoj jurisdikciji.
                </p>
                <p>
                  Koristimo odgovarajuće zaštitne mere da osiguramo da vaši lični podaci budu bezbedno i 
                  u skladu sa ovom politikom privatnosti.
                </p>
              </CardContent>
            </Card>

            {/* Changes to Policy */}
            <Card>
              <CardHeader>
                <CardTitle>Izmene ove politike privatnosti</CardTitle>
              </CardHeader>
              <CardContent className="prose max-w-none">
                <p>
                  Možemo s vremena na vreme ažurirati našu politiku privatnosti. O svim izmenama ćemo vas 
                  obavestiti postavljanjem nove politike privatnosti na ovu stranicu i ažuriranjem datuma 
                  "Poslednja izmena" na vrhu ove stranice.
                </p>
                <p>
                  O značajnim izmenama ćemo vas obavestiti putem WhatsApp poruke, email-a ili istaknutim 
                  obaveštenjem u aplikaciji pre nego što izmene stupe na snagu.
                </p>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card>
              <CardHeader>
                <CardTitle>Kontakt</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">
                  Ako imate pitanja ili nedoumice u vezi sa ovom politikom privatnosti ili našim praksama u vezi sa podacima, kontaktirajte nas:
                </p>
                <div className="space-y-2">
                  <p><strong>Email za privatnost:</strong> <a href="mailto:privacy@frigosistemtodosijevic.me" className="text-blue-600 hover:underline">privacy@frigosistemtodosijevic.me</a></p>
                  <p><strong>Email za podršku:</strong> <a href="mailto:info@frigosistemtodosijevic.me" className="text-blue-600 hover:underline">info@frigosistemtodosijevic.me</a></p>
                  <p><strong>Telefon:</strong> +382 67 051 141</p>
                  <p><strong>WhatsApp:</strong> +382 67 051 141</p>
                  <p><strong>Website:</strong> <a href="https://www.tehnikamne.me" className="text-blue-600 hover:underline">www.tehnikamne.me</a></p>
                  <p><strong>Adresa:</strong> Lastva Grbaljska 85317 Kotor, Crna Gora</p>
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
