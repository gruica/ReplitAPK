import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { AppIcons } from "@/lib/app-icons";
import { memo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface SidebarProps {
  isMobileOpen: boolean;
  closeMobileMenu: () => void;
}

// Interface for menu groups
interface MenuGroup {
  id: string;
  title: string;
  icon: any;
  items: MenuItemType[];
  defaultExpanded?: boolean;
}

interface MenuItemType {
  path: string;
  label: string;
  icon: any;
  isProfessionalIcon?: boolean;
  badge?: number;
  highlight?: boolean;
}

export const Sidebar = memo(function Sidebar({ isMobileOpen, closeMobileMenu }: SidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'dashboard': true,
    'operations': true,
    'clients': false,
    'parts': false,
    'reports': false,
    'settings': false
  });

  // Fetch pending spare parts orders count for admin users
  const { data: pendingSparePartsCount = 0 } = useQuery({
    queryKey: ['/api/admin/spare-parts'],
    enabled: user?.role === 'admin',
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 1,
    select: (data: any[]) => Array.isArray(data) ? data.length : 0,
  });

  // Fetch pending business partner requests count for admin users
  const { data: pendingBusinessPartnerCount = 0 } = useQuery({
    queryKey: ['/api/admin/business-partner-pending-count'],
    enabled: user?.role === 'admin',
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 1,
    select: (data: any) => data?.count || 0,
  });

  // Toggle group expansion
  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  // Define modern grouped menu items for admin
  const adminMenuGroups: MenuGroup[] = [
    {
      id: 'dashboard',
      title: 'KONTROLNA TABLA',
      icon: AppIcons.admin.dashboard,
      defaultExpanded: true,
      items: [
        { path: "/", label: "Glavni dashboard", icon: AppIcons.admin.dashboard, highlight: true, isProfessionalIcon: true }
      ]
    },
    {
      id: 'operations',
      title: 'OPERACIJE',
      icon: AppIcons.admin.serviceManagement,
      defaultExpanded: true,
      items: [
        { path: "/admin/services", label: "Servisi", icon: AppIcons.admin.serviceManagement, isProfessionalIcon: true },
        { path: "/admin/services?filter=picked_up", label: "Preuzeti aparati", icon: AppIcons.appliances.refrigerator, highlight: true, isProfessionalIcon: true },
        { path: "/technician-services", label: "Servisi po serviserima", icon: AppIcons.technician.mobile, isProfessionalIcon: true },
        { path: "/appliances", label: "Bela tehnika", icon: AppIcons.appliances.washingMachine, isProfessionalIcon: true }
      ]
    },
    {
      id: 'clients',
      title: 'KLIJENTI I PARTNERI',
      icon: AppIcons.customer.profile,
      items: [
        { path: "/admin/clients", label: "Klijenti", icon: AppIcons.customer.profile, isProfessionalIcon: true },
        { path: "/admin/business-partners", label: "Poslovni partneri", icon: AppIcons.business.partner, highlight: true, badge: pendingBusinessPartnerCount, isProfessionalIcon: true },
        { path: "/users", label: "Upravljaj korisnicima", icon: AppIcons.system.userManagement, isProfessionalIcon: true },
        { path: "/admin/user-verification", label: "Verifikuj korisnike", icon: AppIcons.system.userManagement, isProfessionalIcon: true }
      ]
    },
    {
      id: 'parts',
      title: 'REZERVNI DELOVI',
      icon: AppIcons.status.waitingParts,
      items: [
        { path: "/admin/spare-parts", label: "Porudžbine delova", icon: AppIcons.status.waitingParts, highlight: true, badge: pendingSparePartsCount, isProfessionalIcon: true },
        { path: "/admin/suppliers", label: "Dobavljači", icon: AppIcons.business.partner, highlight: true, isProfessionalIcon: true },
        { path: "/admin/available-parts", label: "Dostupni delovi", icon: AppIcons.system.warehouse, highlight: true, isProfessionalIcon: true },
        { path: "/admin/spare-parts-catalog", label: "PartKeepr Katalog", icon: AppIcons.system.partsCatalog, highlight: true, isProfessionalIcon: true },
        { path: "/admin/web-scraping", label: "Web Scraping", icon: AppIcons.system.webScraping, highlight: true, isProfessionalIcon: true }
      ]
    },
    {
      id: 'reports',
      title: 'IZVEŠTAJI',
      icon: AppIcons.admin.analytics,
      items: [
        { path: "/admin/comprehensive-analytics", label: "Analiza podataka", icon: AppIcons.admin.analytics, highlight: true, isProfessionalIcon: true },
        { path: "/admin/data-export", label: "Izvoz podataka", icon: AppIcons.admin.analytics, highlight: true, isProfessionalIcon: true },
        { path: "/admin/complus-billing", label: "ComPlus fakturisanje", icon: "euro", highlight: true },
        { path: "/admin/beko-billing", label: "Beko fakturisanje", icon: "euro", highlight: true },
        { path: "/admin/complus-out-of-warranty-billing", label: "ComPlus van garancije", icon: "euro", highlight: false },
        { path: "/admin/beko-out-of-warranty-billing", label: "Beko van garancije", icon: "euro", highlight: false },
        { path: "/admin/servis-komerc", label: "Servis Komerc", icon: "local_shipping", highlight: true }
      ]
    },
    {
      id: 'settings',
      title: 'POSTAVKE',
      icon: AppIcons.business.communication,
      items: [
        { path: "/admin/sms-mobile-api-config", label: "SMS Mobile API", icon: AppIcons.business.communication, highlight: true, isProfessionalIcon: true },
        { path: "/admin/sms-bulk", label: "Masovno SMS", icon: AppIcons.system.bulkSMS, highlight: true, isProfessionalIcon: true },
        { path: "/admin/whatsapp-web", label: "WhatsApp Web", icon: AppIcons.business.communication, highlight: true, isProfessionalIcon: true },
        { path: "/admin/whatsapp-business-api", label: "WhatsApp Business API", icon: AppIcons.business.communication, highlight: true, isProfessionalIcon: true },
        { path: "/email-settings", label: "Email postavke", icon: "mail" },
        { path: "/sql-admin", label: "SQL upravljač", icon: "storage" },
        { path: "/excel", label: "Excel uvoz/izvoz", icon: "import_export" },
        { path: "/admin/page-management", label: "Upravljanje stranicama", icon: "description", highlight: true },
        { path: "/profile", label: "Moj profil", icon: "account_circle" }
      ]
    }
  ];

  const technicianMenuGroups: MenuGroup[] = [
    {
      id: 'technician',
      title: 'MOJA ZONA',
      icon: AppIcons.technician.serviceWork,
      defaultExpanded: true,
      items: [
        { path: "/tech", label: "Moji servisi", icon: AppIcons.technician.serviceWork, isProfessionalIcon: true },
        { path: "/tech/profile", label: "Moj profil", icon: AppIcons.technician.mobile, isProfessionalIcon: true }
      ]
    }
  ];
  
  // Use the appropriate menu based on user role
  const menuGroups = user?.role === "technician" ? technicianMenuGroups : adminMenuGroups;

  // Generate initials from user fullName
  const getInitials = (name: string) => {
    if (!name || typeof name !== 'string') return '';
    
    return name
      .split(' ')
      .filter(word => word.length > 0)
      .map(word => word[0]?.toUpperCase() || '')
      .join('');
  };

  return (
    <div 
      className={cn(
        "bg-white shadow-lg w-64 h-full flex-shrink-0 transition-all duration-300 transform",
        "flex flex-col",
        isMobileOpen 
          ? "fixed inset-y-0 left-0 z-50" 
          : "hidden md:flex md:relative"
      )}
    >
      <div className="flex items-center justify-center h-16 px-4 border-b border-gray-200">
        <h1 className="text-xl font-medium text-primary">Frigo Sistem Todosijević</h1>
      </div>
      <div className="py-4 flex-1 overflow-y-auto">
        <div className="px-4 mb-6">
          {user && (
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center">
                <span className="font-medium">
                  {getInitials(user.fullName)}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-800">{user.fullName}</p>
                <p className="text-sm text-gray-500">
                  {user.role === "admin" 
                    ? "Administrator" 
                    : user.role === "technician" 
                      ? "Serviser" 
                      : "Korisnik"}
                </p>
              </div>
            </div>
          )}
        </div>
        <nav className="space-y-1">
          {menuGroups.map((group) => (
            <div key={group.id} className="mb-2">
              {/* Group Header */}
              <div 
                onClick={() => toggleGroup(group.id)}
                className="flex items-center px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <img src={group.icon} alt="" className="w-4 h-4 mr-2 opacity-60" />
                <span className="flex-1">{group.title}</span>
                {expandedGroups[group.id] ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </div>
              
              {/* Group Items */}
              {expandedGroups[group.id] && (
                <div className="ml-2 space-y-1">
                  {group.items.map((item) => (
                    <Link
                      key={item.path}
                      href={item.path}
                      onClick={() => closeMobileMenu && closeMobileMenu()}
                    >
                      <div 
                        className={cn(
                          "flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 transition-colors rounded-lg mx-2",
                          location === item.path 
                            ? "bg-blue-100 border-l-4 border-primary text-blue-700 font-medium" 
                            : "",
                          item.highlight
                            ? "font-medium text-blue-600"
                            : ""
                        )}
                      >
                        {item.icon && (
                          item.isProfessionalIcon ? (
                            <img src={item.icon} alt="" className="w-4 h-4 mr-3 opacity-75" />
                          ) : (
                            <span className="material-icons mr-3 text-base opacity-75">{item.icon}</span>
                          )
                        )}
                        <span className="flex-1">{item.label}</span>
                        
                        {/* New badges */}
                        {(item.path === "/admin/services" || item.path === "/admin/user-verification") && (
                          <span className="ml-2 bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">Nova</span>
                        )}
                        
                        {/* Dynamic badges */}
                        {item.badge && item.badge > 0 && (
                          <span className={cn(
                            "ml-2 text-white text-xs px-2 py-1 rounded-full animate-pulse font-medium",
                            item.path === "/admin/spare-parts" ? "bg-red-500" : "bg-purple-500"
                          )}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>
      
      {/* Logout button at the bottom */}
      <div className="p-4 border-t border-gray-200">
        <LogoutButton />
      </div>
    </div>
  );
});

function LogoutButton() {
  const { logoutMutation } = useAuth();
  
  return (
    <button 
      onClick={() => logoutMutation.mutate()}
      className="flex items-center w-full px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
      disabled={logoutMutation.isPending}
    >
      <span>Odjavi se</span>
    </button>
  );
}
