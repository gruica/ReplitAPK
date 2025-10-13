import { AdminLayout } from "@/components/layout/admin-layout";
import BekoOutOfWarrantyBillingReport from "@/components/admin/BekoOutOfWarrantyBillingReport";

export default function BekoOutOfWarrantyBillingPage() {
  return (
    <AdminLayout>
      <div className="p-6">
        <BekoOutOfWarrantyBillingReport />
      </div>
    </AdminLayout>
  );
}
