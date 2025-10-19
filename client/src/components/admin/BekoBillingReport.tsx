import UniversalBillingReport from './UniversalBillingReport';

export default function BekoBillingReport() {
  return (
    <UniversalBillingReport 
      brandGroup="beko"
      theme="red"
      title="Beko Fakturisanje"
      subtitle="Beko, Grundig & Blomberg"
      brands={['Beko', 'Grundig', 'Blomberg']}
      apiEndpoint="/api/admin/billing/beko"
      csvFilename={`Beko_garancija_${new Date().getMonth() + 1}_${new Date().getFullYear()}.csv`}
      pdfFilename={`Beko_Izvjestaj_${new Date().getFullYear()}_${String(new Date().getMonth() + 1).padStart(2, '0')}.pdf`}
    />
  );
}
