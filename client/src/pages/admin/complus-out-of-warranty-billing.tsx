import { AdminLayout } from "@/components/layout/admin-layout";
import ComplusOutOfWarrantyBillingReport from "@/components/admin/ComplusOutOfWarrantyBillingReport";

export default function ComplusOutOfWarrantyBillingPage() {
  return (
    <AdminLayout>
      <div className="p-6">
        <ComplusOutOfWarrantyBillingReport />
      </div>
    </AdminLayout>
  );
}
