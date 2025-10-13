-- PRIMJER: Dopuna servisa #667 sa tehničkim izvještajem

UPDATE services 
SET machine_notes = 'DETALJNI TEHNIČKI IZVJEŠTAJ:

1. PREGLED MAŠINE:
   - Što si pregledao
   - Što si našao

2. TESTIRANJE:
   - Koje testove si uradio
   - Rezultati testova

3. NALAZ:
   - Tehnički nalaz
   - Da li ima kvar

4. ZAKLJUČAK:
   - Tvoj zaključak
   - Preporuke

SERVISER: [Ime servisera]
DATUM: [Datum]'
WHERE id = 667;

-- Provjeri rezultat:
SELECT id, LEFT(machine_notes, 100) as preview 
FROM services 
WHERE id = 667;
