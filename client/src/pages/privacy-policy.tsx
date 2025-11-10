import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SEO } from '@/components/SEO';
import { Shield, Lock, Eye, Database, Mail, Phone, Camera, FileText, Users, Calendar } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <>
      <SEO 
        title="Politika Privatnosti - Frigo Sistem Todosijević | Zaštita Podataka"
        description="Politika privatnosti i zaštita ličnih podataka - Frigo Sistem Todosijević. GDPR usklađenost, transparentnost i sigurnost vaših podataka."
        keywords="politika privatnosti, gdpr, zaštita podataka, lični podaci, bezbednost, servisna aplikacija"
        canonical="https://www.tehnikamne.me/privacy/policy"
      />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 py-12">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-blue-600 p-4 rounded-full">
                <Shield className="h-12 w-12 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Politika Privatnosti</h1>
            <p className="text-xl text-gray-600">Frigo Sistem Todosijević d.o.o.</p>
            <p className="text-sm text-gray-500 mt-2">Poslednja izmena: 10. novembar 2025.</p>
          </div>

          <Card className="shadow-xl">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <Lock className="h-6 w-6" />
                Zaštita Vaših Ličnih Podataka
              </CardTitle>
              <p className="text-blue-100 mt-2">
                Vaša privatnost je naš prioritet. Ova politika objašnjava kako prikupljamo, koristimo i štitimo vaše lične podatke u skladu sa GDPR-om i lokalnim zakonima o zaštiti podataka.
              </p>
            </CardHeader>
            
            <CardContent className="prose prose-gray max-w-none space-y-8 p-8">
              
              {/* Sekcija 1: Uvod */}
              <section className="border-l-4 border-blue-500 pl-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="h-6 w-6 text-blue-600" />
                  1. Uvod
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  Dobrodošli u aplikaciju za upravljanje servisima Frigo Sistem Todosijević d.o.o. ("Aplikacija"). Ova Politika privatnosti objašnjava kako prikupljamo, koristimo, otkrivamo i štitimo vaše informacije kada koristite našu mobilnu aplikaciju (Android/iOS) i web platformu za upravljanje servisima kućnih aparata.
                </p>
                <p className="text-gray-700 leading-relaxed mt-4">
                  Poštujemo vašu privatnost i posvećeni smo zaštiti vaših ličnih podataka. Korišćenjem naše Aplikacije pristajete na prikupljanje i korišćenje informacija u skladu sa ovom politikom.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                  <p className="text-sm text-blue-900 font-semibold">📱 Aplikacija je dostupna na:</p>
                  <ul className="text-sm text-blue-800 mt-2 space-y-1">
                    <li>• <strong>Android:</strong> Google Play Store (APK)</li>
                    <li>• <strong>iOS:</strong> Apple App Store</li>
                    <li>• <strong>Web:</strong> https://tehnikamne.me</li>
                  </ul>
                </div>
              </section>

              {/* Sekcija 2: Podatke koje prikupljamo */}
              <section className="border-l-4 border-green-500 pl-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Database className="h-6 w-6 text-green-600" />
                  2. Podaci Koje Prikupljamo
                </h2>
                
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-5">
                    <h3 className="font-bold text-lg text-gray-900 mb-3 flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-600" />
                      A) Osnovni Podaci Korisnika
                    </h3>
                    <ul className="list-disc ml-6 space-y-2 text-gray-700">
                      <li><strong>Ime i prezime:</strong> Za identifikaciju korisničkog naloga</li>
                      <li><strong>Email adresa:</strong> Za autentifikaciju i komunikaciju</li>
                      <li><strong>Broj telefona:</strong> Za SMS notifikacije i kontakt</li>
                      <li><strong>Lozinka:</strong> Šifrovana pomoću Scrypt algoritma</li>
                      <li><strong>Uloga:</strong> Administrator, tehničar, serviser, poslovni partner, dobavljač ili klijent</li>
                    </ul>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-5">
                    <h3 className="font-bold text-lg text-gray-900 mb-3 flex items-center gap-2">
                      <Camera className="h-5 w-5 text-purple-600" />
                      B) Fotografije i Multimedijalni Sadržaj
                    </h3>
                    <ul className="list-disc ml-6 space-y-2 text-gray-700">
                      <li><strong>Fotografije uređaja:</strong> Slike kvarova, servisiranih aparata i rezervnih delova snimljene mobilnom kamerom</li>
                      <li><strong>Metapodaci:</strong> Datum i vreme snimanja, naziv fajla, veličina</li>
                      <li><strong>OCR podaci:</strong> Automatski očitani tekst sa fotografija (serijski brojevi, modeli aparata)</li>
                      <li><strong>Napomena:</strong> Fotografije se skladište na Replit Object Storage serveru i vidljive su svim tehničarima i administratorima</li>
                    </ul>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-5">
                    <h3 className="font-bold text-lg text-gray-900 mb-3 flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-orange-600" />
                      C) Servisni Podaci
                    </h3>
                    <ul className="list-disc ml-6 space-y-2 text-gray-700">
                      <li><strong>Informacije o klijentima:</strong> Ime, prezime, adresa, broj telefona, email klijenata</li>
                      <li><strong>Aparati i uređaji:</strong> Marka, model, serijski broj, tip aparata, lokacija</li>
                      <li><strong>Istorija servisa:</strong> Opis kvara, dijagnoza, datum servisa, status, troškovi</li>
                      <li><strong>Rezervni delovi:</strong> Narudžbine, dobavljači, cene, dostupnost</li>
                      <li><strong>Održavanje i raspored:</strong> Zakazani termini, notifikacije, podsetnici</li>
                    </ul>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-5">
                    <h3 className="font-bold text-lg text-gray-900 mb-3 flex items-center gap-2">
                      <Phone className="h-5 w-5 text-red-600" />
                      D) Komunikacioni Podaci
                    </h3>
                    <ul className="list-disc ml-6 space-y-2 text-gray-700">
                      <li><strong>SMS poruke:</strong> Automatski poslate SMS notifikacije klijentima (status servisa, završetak rada)</li>
                      <li><strong>Email komunikacija:</strong> Poslate poruke, dokumenti, izveštaji, fakture</li>
                      <li><strong>In-app notifikacije:</strong> Push obaveštenja unutar aplikacije</li>
                    </ul>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-5">
                    <h3 className="font-bold text-lg text-gray-900 mb-3 flex items-center gap-2">
                      <Eye className="h-5 w-5 text-indigo-600" />
                      E) Tehnički i Sistemski Podaci
                    </h3>
                    <ul className="list-disc ml-6 space-y-2 text-gray-700">
                      <li><strong>Tip uređaja:</strong> Android, iOS, desktop browser</li>
                      <li><strong>Operativni sistem:</strong> Verzija OS-a</li>
                      <li><strong>IP adresa:</strong> Za detekciju bezbednosnih pretnji</li>
                      <li><strong>Session podaci:</strong> JWT tokeni, sesije autentifikacije (PostgreSQL session store)</li>
                      <li><strong>Logovi aktivnosti:</strong> Vreme pristupa, korišćene funkcionalnosti, greške</li>
                      <li><strong>Geolokacija:</strong> NIJE prikupljana (aplikacija NE koristi GPS tracking)</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Sekcija 3: Kako koristimo podatke */}
              <section className="border-l-4 border-purple-500 pl-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Kako Koristimo Vaše Podatke</h2>
                <p className="text-gray-700 mb-4">Prikupljene podatke koristimo isključivo u sledeće svrhe:</p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h4 className="font-semibold text-purple-900 mb-2">🔧 Operativne Svrhe</h4>
                    <ul className="text-sm text-purple-800 space-y-1">
                      <li>• Kreiranje i upravljanje nalozima</li>
                      <li>• Praćenje statusa servisa</li>
                      <li>• Zakazivanje i raspored tehničara</li>
                      <li>• Komunikacija sa klijentima</li>
                    </ul>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">📊 Administrativne Svrhe</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Fakturisanje i naplata</li>
                      <li>• Generisanje izveštaja</li>
                      <li>• Upravljanje zalihama delova</li>
                      <li>• Statistika i analitika</li>
                    </ul>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-900 mb-2">🔔 Notifikacije</h4>
                    <ul className="text-sm text-green-800 space-y-1">
                      <li>• SMS obaveštenja o statusu servisa</li>
                      <li>• Email potvrde i izveštaji</li>
                      <li>• Push notifikacije u aplikaciji</li>
                      <li>• Podsetnici za održavanje</li>
                    </ul>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h4 className="font-semibold text-orange-900 mb-2">🔒 Bezbednost</h4>
                    <ul className="text-sm text-orange-800 space-y-1">
                      <li>• Detekcija neovlašćenog pristupa</li>
                      <li>• Praćenje bezbednosnih incidenata</li>
                      <li>• Rate limiting za API endpoint</li>
                      <li>• Zaštita od XSS napada</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Sekcija 4: Pravni osnov */}
              <section className="border-l-4 border-red-500 pl-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Pravni Osnov za Obradu Podataka (GDPR)</h2>
                <p className="text-gray-700 mb-4">
                  U skladu sa Opštom Uredbom o Zaštiti Podataka (GDPR), pravni osnov za obradu vaših podataka je:
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 rounded-full p-2 mt-1">
                      <span className="text-blue-600 font-bold text-sm">✓</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Pristanak (Consent)</h4>
                      <p className="text-gray-600 text-sm">Pristajete na obradu podataka registracijom i korišćenjem aplikacije</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="bg-green-100 rounded-full p-2 mt-1">
                      <span className="text-green-600 font-bold text-sm">✓</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Izvršenje Ugovora</h4>
                      <p className="text-gray-600 text-sm">Podaci su neophodni za pružanje servisnih usluga koje ste zatražili</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="bg-purple-100 rounded-full p-2 mt-1">
                      <span className="text-purple-600 font-bold text-sm">✓</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Legitimni Interes</h4>
                      <p className="text-gray-600 text-sm">Operacija sistema, prevencija prevare, bezbednost</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="bg-orange-100 rounded-full p-2 mt-1">
                      <span className="text-orange-600 font-bold text-sm">✓</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Zakonska Obaveza</h4>
                      <p className="text-gray-600 text-sm">Računovodstvene knjige, poreska dokumentacija, fakturisanje</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Sekcija 5: Deljenje podataka */}
              <section className="border-l-4 border-yellow-500 pl-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Deljenje Podataka sa Trećim Licima</h2>
                <p className="text-gray-700 mb-4">
                  <strong>NE PRODAJEMO</strong> vaše lične podatke. Delimo podatke samo u sledećim slučajevima:
                </p>
                <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-5 space-y-3">
                  <div>
                    <h4 className="font-semibold text-yellow-900">📧 Email Servis (Nodemailer)</h4>
                    <p className="text-sm text-yellow-800">Za slanje email notifikacija i izveštaja klijentima</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-yellow-900">📱 SMS Servis (SMS Mobile API)</h4>
                    <p className="text-sm text-yellow-800">Za automatske SMS poruke o statusu servisa</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-yellow-900">☁️ Cloud Hosting (Replit/Neon Database)</h4>
                    <p className="text-sm text-yellow-800">Za skladištenje podataka i fotografija (enkriptovani serveri u EU)</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-yellow-900">⚖️ Zakonski Zahtevi</h4>
                    <p className="text-sm text-yellow-800">Podaci mogu biti otkriveni državnim organima na osnovu validnog sudskog naloga ili zakona</p>
                  </div>
                </div>
              </section>

              {/* Sekcija 6: Bezbednost */}
              <section className="border-l-4 border-indigo-500 pl-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Lock className="h-6 w-6 text-indigo-600" />
                  6. Bezbednost Podataka
                </h2>
                <p className="text-gray-700 mb-4">Primenjujemo industrijske standarde zaštite:</p>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-center">
                    <div className="text-3xl mb-2">🔐</div>
                    <h4 className="font-semibold text-indigo-900 mb-1">Enkripcija</h4>
                    <p className="text-xs text-indigo-700">SSL/TLS (HTTPS) za sve API pozive</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                    <div className="text-3xl mb-2">🔑</div>
                    <h4 className="font-semibold text-blue-900 mb-1">Autentifikacija</h4>
                    <p className="text-xs text-blue-700">JWT tokeni + Scrypt hashovanje</p>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                    <div className="text-3xl mb-2">🛡️</div>
                    <h4 className="font-semibold text-purple-900 mb-1">Firewall</h4>
                    <p className="text-xs text-purple-700">Rate limiting i XSS zaštita</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-4 italic">
                  Napomena: Nijedan metod prenosa preko Interneta ili skladištenja nije 100% siguran. Trudimo se da koristimo komercijalno prihvatljive mere zaštite.
                </p>
              </section>

              {/* Sekcija 7: Vaša prava */}
              <section className="border-l-4 border-green-500 pl-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Vaša Prava</h2>
                <p className="text-gray-700 mb-4">U skladu sa GDPR-om, imate sledeća prava:</p>
                <div className="space-y-3">
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-blue-400 transition-colors">
                    <h4 className="font-bold text-gray-900 mb-1">👁️ Pravo na Pristup</h4>
                    <p className="text-sm text-gray-600">Možete zatražiti kopiju svih podataka koje držimo o vama</p>
                  </div>
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-blue-400 transition-colors">
                    <h4 className="font-bold text-gray-900 mb-1">✏️ Pravo na Ispravku</h4>
                    <p className="text-sm text-gray-600">Možete zatražiti ispravku netačnih ili nepotpunih podataka</p>
                  </div>
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-blue-400 transition-colors">
                    <h4 className="font-bold text-gray-900 mb-1">🗑️ Pravo na Brisanje ("Pravo da budete zaboravljeni")</h4>
                    <p className="text-sm text-gray-600">Možete zatražiti brisanje vaših podataka pod određenim uslovima</p>
                  </div>
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-blue-400 transition-colors">
                    <h4 className="font-bold text-gray-900 mb-1">📦 Pravo na Prenosivost</h4>
                    <p className="text-sm text-gray-600">Možete dobiti vaše podatke u mašinski čitljivom formatu (CSV, JSON)</p>
                  </div>
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-blue-400 transition-colors">
                    <h4 className="font-bold text-gray-900 mb-1">🚫 Pravo na Povlačenje Saglasnosti</h4>
                    <p className="text-sm text-gray-600">Možete povući saglasnost za obradu podataka u bilo kom trenutku</p>
                  </div>
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-blue-400 transition-colors">
                    <h4 className="font-bold text-gray-900 mb-1">⚖️ Pravo na Prigovor</h4>
                    <p className="text-sm text-gray-600">Možete uložiti prigovor na obradu podataka u određenim situacijama</p>
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-300 rounded-lg p-4 mt-5">
                  <p className="text-sm text-blue-900 font-semibold">Za ostvarivanje vaših prava, kontaktirajte nas na:</p>
                  <p className="text-sm text-blue-800 mt-1">📧 Email: <a href="mailto:gruica@frigosistemtodosijevic.com" className="underline hover:text-blue-600">gruica@frigosistemtodosijevic.com</a></p>
                  <p className="text-sm text-blue-700 mt-2">Odgovorićemo na vaš zahtev u roku od <strong>30 dana</strong>.</p>
                </div>
              </section>

              {/* Sekcija 8: Čuvanje podataka */}
              <section className="border-l-4 border-orange-500 pl-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Period Čuvanja Podataka</h2>
                <p className="text-gray-700 mb-4">Vaše podatke čuvamo onoliko dugo koliko je neophodno za:</p>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-5">
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-orange-600 font-bold">•</span>
                      <span><strong>Aktivne servise:</strong> Dok je servis u toku i do 5 godina nakon završetka (zakonska obaveza)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-600 font-bold">•</span>
                      <span><strong>Klijentske podatke:</strong> Dok postoji aktivna poslovna veza ili zakonska obaveza čuvanja</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-600 font-bold">•</span>
                      <span><strong>Fakture i finansijsku dokumentaciju:</strong> Minimalno 5 godina (zakonska obaveza)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-600 font-bold">•</span>
                      <span><strong>Fotografije servisa:</strong> Do 2 godine nakon završetka servisa ili na zahtev klijenta za brisanje</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-600 font-bold">•</span>
                      <span><strong>Logovi sistema:</strong> Maksimalno 12 meseci za bezbednosne svrhe</span>
                    </li>
                  </ul>
                </div>
              </section>

              {/* Sekcija 9: Deca */}
              <section className="border-l-4 border-pink-500 pl-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Privatnost Dece</h2>
                <div className="bg-pink-50 border border-pink-200 rounded-lg p-5">
                  <p className="text-gray-700">
                    Naša aplikacija <strong>NIJE namenjena deci mlađoj od 13 godina</strong>. Ne prikupljamo svesno lične podatke od dece ispod 13 godina. Ako saznamo da je dete ispod 13 godina dalo lične podatke, odmah ćemo ih obrisati iz naših sistema.
                  </p>
                  <p className="text-gray-700 mt-3">
                    Ako ste roditelj ili staratelj i saznate da je vaše dete dalo lične podatke, molimo vas da nas kontaktirate.
                  </p>
                </div>
              </section>

              {/* Sekcija 10: Kolačići */}
              <section className="border-l-4 border-brown-500 pl-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Kolačići (Cookies)</h2>
                <p className="text-gray-700 mb-4">Naša aplikacija koristi sledeće kolačiće:</p>
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900">🔐 Sesijski Kolačići (Obavezni)</h4>
                    <p className="text-sm text-gray-600 mt-1">Za održavanje autentifikacije i sesije korisnika (PostgreSQL session store)</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900">🎯 Funkcionalni Kolačići</h4>
                    <p className="text-sm text-gray-600 mt-1">Za pamćenje podešavanja korisnika i preferencija</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900">❌ Marketing Kolačići</h4>
                    <p className="text-sm text-gray-600 mt-1">NE koristimo kolačiće za marketing ili praćenje trećih lica</p>
                  </div>
                </div>
              </section>

              {/* Sekcija 11: Izmene politike */}
              <section className="border-l-4 border-gray-500 pl-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Izmene Ove Politike</h2>
                <p className="text-gray-700">
                  Zadržavamo pravo da ažuriramo ovu Politiku privatnosti s vremena na vreme. Sve izmene će biti objavljene na ovoj stranici sa ažuriranim datumom "Poslednja izmena". Važne izmene će biti komunicirane putem email-a ili notifikacije u aplikaciji.
                </p>
                <p className="text-gray-700 mt-3">
                  Preporučujemo da periodično pregledate ovu stranicu kako biste bili informisani o tome kako štitimo vaše podatke.
                </p>
              </section>

              {/* Sekcija 12: Kontakt */}
              <section className="border-l-4 border-blue-500 pl-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Mail className="h-6 w-6 text-blue-600" />
                  12. Kontakt Informacije
                </h2>
                <p className="text-gray-700 mb-4">
                  Ako imate bilo kakva pitanja ili brige o ovoj Politici privatnosti ili našim praksama zaštite podataka, molimo vas da nas kontaktirate:
                </p>
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg p-6">
                  <h3 className="font-bold text-xl text-blue-900 mb-4">Frigo Sistem Todosijević d.o.o.</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-200 rounded-full p-2">
                        <Mail className="h-5 w-5 text-blue-700" />
                      </div>
                      <div>
                        <p className="text-sm text-blue-700 font-semibold">Email (Glavni):</p>
                        <a href="mailto:gruica@frigosistemtodosijevic.com" className="text-blue-900 font-bold hover:underline">
                          gruica@frigosistemtodosijevic.com
                        </a>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-200 rounded-full p-2">
                        <Mail className="h-5 w-5 text-blue-700" />
                      </div>
                      <div>
                        <p className="text-sm text-blue-700 font-semibold">Email (Alternativni):</p>
                        <a href="mailto:jelena@frigosistemtodosijevic.me" className="text-blue-900 font-bold hover:underline">
                          jelena@frigosistemtodosijevic.me
                        </a>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-200 rounded-full p-2">
                        <Phone className="h-5 w-5 text-blue-700" />
                      </div>
                      <div>
                        <p className="text-sm text-blue-700 font-semibold">Telefon:</p>
                        <a href="tel:+38267123456" className="text-blue-900 font-bold hover:underline">
                          +382 67 XXX XXX
                        </a>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-200 rounded-full p-2">
                        <FileText className="h-5 w-5 text-blue-700" />
                      </div>
                      <div>
                        <p className="text-sm text-blue-700 font-semibold">Web Stranica:</p>
                        <a href="https://www.tehnikamne.me" className="text-blue-900 font-bold hover:underline" target="_blank" rel="noopener noreferrer">
                          www.tehnikamne.me
                        </a>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 pt-4 border-t border-blue-300">
                    <p className="text-sm text-blue-800">
                      <strong>Odgovorno lice za zaštitu podataka:</strong> Gruica Todosijević
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                      Odgovorićemo na sve upite u roku od 30 dana.
                    </p>
                  </div>
                </div>
              </section>

              {/* App Store i Google Play compliance */}
              <section className="bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-lg p-6 -mx-8">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Shield className="h-6 w-6" />
                  Usklađenost sa App Store i Google Play Store
                </h2>
                <p className="text-gray-300 mb-4">
                  Ova Politika privatnosti je kreirana u skladu sa zahtevima:
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-white/10 rounded-lg p-4">
                    <h4 className="font-bold mb-2">🍎 Apple App Store</h4>
                    <ul className="text-sm text-gray-300 space-y-1">
                      <li>✓ App Privacy Details</li>
                      <li>✓ Data Collection Disclosure</li>
                      <li>✓ User Rights & Deletion</li>
                      <li>✓ Third-party SDKs Disclosure</li>
                    </ul>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4">
                    <h4 className="font-bold mb-2">🤖 Google Play Store</h4>
                    <ul className="text-sm text-gray-300 space-y-1">
                      <li>✓ Data Safety Section</li>
                      <li>✓ Privacy Policy Link</li>
                      <li>✓ Permissions Justification</li>
                      <li>✓ GDPR Compliance</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Footer */}
              <div className="mt-12 pt-8 border-t-2 border-gray-300 text-center">
                <p className="text-gray-600 font-semibold">
                  © 2025 Frigo Sistem Todosijević d.o.o. Sva prava zadržana.
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Poslednja izmena: 10. novembar 2025. | Verzija 2.0
                </p>
                <div className="flex justify-center gap-4 mt-4 text-sm">
                  <a href="/terms-of-service" className="text-blue-600 hover:underline">Uslovi Korišćenja</a>
                  <span className="text-gray-400">|</span>
                  <a href="/data-deletion" className="text-blue-600 hover:underline">Brisanje Podataka</a>
                  <span className="text-gray-400">|</span>
                  <a href="/download-app" className="text-blue-600 hover:underline">Preuzmi Aplikaciju</a>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
