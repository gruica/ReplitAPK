import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { AdminLayout } from "@/components/layout/admin-layout";
import { SparePartsManagement } from "@/components/admin/SparePartsManagement";
import SparePartsOrders from "@/components/admin/SparePartsOrders";
import { SparePartsWorkflowEnhanced } from "@/components/admin/SparePartsWorkflow";
import { AvailablePartsManagement } from "@/components/admin/AvailablePartsManagement";
import { PartsActivityLog } from "@/components/admin/PartsActivityLog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminSparePartsPage() {
  const [location] = useLocation();
  const [activeTab, setActiveTab] = useState("workflow");
  
  // Check for partId query parameter and switch to orders tab
  const [highlightedPartId, setHighlightedPartId] = useState<string | null>(null);
  
  useEffect(() => {
    // Guard for non-browser environments (SSR, tests)
    if (typeof window === 'undefined') return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const partIdString = urlParams.get('partId');
    
    if (partIdString) {
      // Parse and validate partId as number, then keep as string for component compatibility
      const partId = parseInt(partIdString, 10);
      
      if (!isNaN(partId) && partId > 0) {
        // Switch to orders tab where parts are typically managed
        setActiveTab("orders");
        setHighlightedPartId(partIdString); // Keep original string format
      }
    }
  }, [location]);
  
  return (
    <AdminLayout>
      <div className="container mx-auto py-6 px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Rezervni delovi</h1>
          <p className="text-muted-foreground mt-1">
            Upravljanje rezervnim delovima i porudžbinama
          </p>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="workflow" data-testid="tab-workflow">🔄 Workflow</TabsTrigger>
            <TabsTrigger value="orders" data-testid="tab-orders">Trenutne porudžbine</TabsTrigger>
            <TabsTrigger value="available" data-testid="tab-available">Djelovi na stanju</TabsTrigger>
            <TabsTrigger value="activity" data-testid="tab-activity">Real-time aktivnost</TabsTrigger>
            <TabsTrigger value="management" data-testid="tab-management">Upravljanje delovima</TabsTrigger>
          </TabsList>
          
          <TabsContent value="workflow" className="space-y-4">
            <SparePartsWorkflowEnhanced />
          </TabsContent>
          
          <TabsContent value="orders" className="space-y-4">
            <SparePartsOrders highlightedPartId={highlightedPartId} />
          </TabsContent>
          
          <TabsContent value="available" className="space-y-4">
            <AvailablePartsManagement />
          </TabsContent>
          
          <TabsContent value="activity" className="space-y-4">
            <PartsActivityLog />
          </TabsContent>
          
          <TabsContent value="management" className="space-y-4">
            <SparePartsManagement />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}