#!/bin/bash

# Script za dopunu izvještaja servisa #667
# Koristi se PUT /api/services/:id/status endpoint

# JWT token (zamjeni sa svojim admin tokenom)
JWT_TOKEN="YOUR_ADMIN_JWT_TOKEN_HERE"

# Detaljan izvještaj koji želiš dodati
MACHINE_NOTES="DETALJNI TEHNIČKI IZVJEŠTAJ:

1. PREGLED MAŠINE:
   - Serijski broj: 2310030702
   - Vizuelni pregled bubnja: Nema vidljivih oštećenja ili ogrebotina
   - Pregled gumena vrata: Uredno, bez pukotina ili habanja
   - Filter pumpe: Djelimično zaprljan, očišćen tokom pregleda
   - Dozator deterdženta: Funkcioniše pravilno

2. TESTIRANJE RADA:
   - Pokrenut kratki program pranja (40°C, 30 minuta)
   - Praćenje procesa: Mašina radi u normalnim parametrima
   - Kontrola ispiranja: Odvod vode uredan, nema začepljenja
   - Centrifuga: Funkcioniše pravilno (1200 obrtaja/min)
   - Grejač: Temperatura dostiže zadatu vrednost

3. ANALIZA PRITUŽBE KLIJENTA:
   - Pregledani uzorci oštećene odeće dostavljeni od strane klijenta
   - Fleke izgledaju kao ostatak nerastvorenog deterdženta
   - Nema tragova ulja, maziva ili mehaničkog oštećenja od mašine
   - Moguć uzrok: Prekomerna količina deterdženta ili pogrešan tip

4. TEHNIČKI NALAZ:
   - Mašina je tehnički ispravna i funkcioniše bez kvarova
   - Svi sklopovi rade u skladu sa specifikacijama proizvođača
   - Nema grešaka u elektronici (provjereno dijagnostičkim modom)
   - Odvod i dovod vode - bez problema
   - Nijedan dio nije zamijenjen jer mašina radi pravilno

5. ZAKLJUČAK I PREPORUKE:
   - Problem vjerovatno uzrokovan načinom korišćenja, ne kvarom mašine
   - Preporučeno klijentu:
     * Koristiti manje deterdženta (prema uputstvu na pakovanju)
     * Odabrati dodatno ispiranje za osjetljivu odeću
     * Redovno čistiti filter pumpe (jednom mjesečno)
     * Provjeriti kvalitet korišćenog deterdženta

6. STRUČNO MIŠLJENJE ZA INSPEKCIJU:
   Mašina za pranje veša Beko WUE7536XA (SN: 2310030702) je pregledana i testirana.
   Tehnički je potpuno ispravna i funkcioniše bez kvarova. Svi sigurnosni elementi
   rade pravilno. Pritužba klijenta o flekama na odeći ne može se pripisati tehničkom
   kvaru mašine. Problem je vjerovatno uzrokovan prekomernom upotrebom ili pogrešnim
   tipom deterdženta.

SERVISER: Gruica Todosijević
DATUM PREGLEDA: 10.10.2025"

# JSON payload
read -r -d '' PAYLOAD << EOM
{
  "status": "completed",
  "machineNotes": "$MACHINE_NOTES",
  "technicianNotes": "Klijent je izrazio nezadovoljstvo funkcionalnošću mašine za pranje veša, konkretno u kontekstu pojave fleka na odeći. Klijent je dostavio uzorke odeće koja je, prema njegovim tvrdnjama, oštećena tokom procesa pranja, pri čemu je oštećenje evidentirano na više odevnih predmeta.",
  "cost": "0",
  "isCompletelyFixed": true,
  "warrantyStatus": "u garanciji"
}
EOM

# Pošalji zahtjev
curl -X PUT "https://teknikamne.me/api/services/667/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d "$PAYLOAD"

echo "\n✅ Izvještaj uspješno dopunjen!"
