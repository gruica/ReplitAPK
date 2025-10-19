import UniversalBillingReport from './UniversalBillingReport';

export default function ComplusBillingReport() {
  return (
    <UniversalBillingReport 
      brandGroup="complus"
      theme="blue"
      title="ComPlus Fakturisanje"
      subtitle="Electrolux, Elica, Candy & Hoover"
      brands={['Electrolux', 'Elica', 'Candy', 'Hoover', 'Turbo Air']}
      apiEndpoint="/api/admin/billing/complus"
      csvFilename={`Complus_garancija_${new Date().getMonth() + 1}_${new Date().getFullYear()}.csv`}
      pdfFilename={`ComPlus_Izvjestaj_${new Date().getFullYear()}_${String(new Date().getMonth() + 1).padStart(2, '0')}.pdf`}
    />
  );
}
