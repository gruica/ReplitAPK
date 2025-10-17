// Centralni sistem grafika za Frigo Sistem aplikaciju
// Sve generirane grafike organizovane po ulogama i kategorijama

// NAPOMENA: Privremeno koriste placeholder vrednosti dok se slike ne dodaju
// Status indikatori (već integrisani u mobile app)
const serviceTodoIcon = "";
const serviceCompletedIcon = "";
const servicePendingIcon = "";
const servicePartsIcon = "";

// Admin grafike
const adminDashboardIcon = "";
const analyticsIcon = "";
const serviceManagementIcon = "";

// Technician grafike
const fridgeServiceIcon = "";
const washingMachineServiceIcon = "";
const dishwasherServiceIcon = "";
const stoveServiceIcon = "";
const mobileTechnicianIcon = "";

// Business i Customer grafike
const businessPartnerIcon = "";
const customerIcon = "";
const serviceTrackingIcon = "";
const communicationIcon = "";

// Brand grafike
const bekoIcon = "";
const candyIcon = "";

// Dashboard hero grafike
const dashboardHeroGraphic = "";

// Additional system icons
const warehouseIcon = "";
const partsCatalogIcon = "";
const webScrapingIcon = "";
const userManagementIcon = "";
const bulkSMSIcon = "";
const aiPredictiveIcon = "";

// App Icons organizovane po kategorijama
export const AppIcons = {
  // Status indikatori
  status: {
    inProgress: serviceTodoIcon,
    completed: serviceCompletedIcon,
    pending: servicePendingIcon,
    waitingParts: servicePartsIcon,
  },

  // Admin ikone
  admin: {
    dashboard: adminDashboardIcon,
    analytics: analyticsIcon,
    serviceManagement: serviceManagementIcon,
    hero: dashboardHeroGraphic,
  },

  // Appliance category ikone
  appliances: {
    refrigerator: fridgeServiceIcon,
    washingMachine: washingMachineServiceIcon,
    dishwasher: dishwasherServiceIcon,
    stove: stoveServiceIcon,
  },

  // Technician ikone
  technician: {
    mobile: mobileTechnicianIcon,
    serviceWork: serviceTodoIcon,
  },

  // Business ikone
  business: {
    partner: businessPartnerIcon,
    tracking: serviceTrackingIcon,
    communication: communicationIcon,
  },

  // Customer ikone
  customer: {
    profile: customerIcon,
    tracking: serviceTrackingIcon,
    communication: communicationIcon,
  },

  // Brand ikone
  brands: {
    beko: bekoIcon,
    candy: candyIcon,
  },

  // System management ikone
  system: {
    warehouse: warehouseIcon,
    partsCatalog: partsCatalogIcon,
    webScraping: webScrapingIcon,
    userManagement: userManagementIcon,
    bulkSMS: bulkSMSIcon,
    aiPredictive: aiPredictiveIcon,
  },
};

// Utility funkcije za lakše korišćenje
export const getApplianceIcon = (category: string) => {
  const categoryMap: Record<string, string> = {
    'frižider': AppIcons.appliances.refrigerator,
    'frizider': AppIcons.appliances.refrigerator,
    'refrigerator': AppIcons.appliances.refrigerator,
    'veš mašina': AppIcons.appliances.washingMachine,
    'ves masina': AppIcons.appliances.washingMachine,
    'washing machine': AppIcons.appliances.washingMachine,
    'sudopera': AppIcons.appliances.dishwasher,
    'mašina za pranje sudova': AppIcons.appliances.dishwasher,
    'dishwasher': AppIcons.appliances.dishwasher,
    'šporet': AppIcons.appliances.stove,
    'sporet': AppIcons.appliances.stove,
    'stove': AppIcons.appliances.stove,
  };
  
  return categoryMap[category.toLowerCase()] || AppIcons.appliances.refrigerator;
};

export const getBrandIcon = (brand: string) => {
  const brandMap: Record<string, string> = {
    'beko': AppIcons.brands.beko,
    'candy': AppIcons.brands.candy,
  };
  
  return brandMap[brand.toLowerCase()];
};

export const getStatusIcon = (status: string) => {
  const statusMap: Record<string, string> = {
    'in_progress': AppIcons.status.inProgress,
    'completed': AppIcons.status.completed,
    'pending': AppIcons.status.pending,
    'assigned': AppIcons.status.pending,
    'scheduled': AppIcons.status.pending,
    'waiting_parts': AppIcons.status.waitingParts,
  };
  
  return statusMap[status] || AppIcons.status.pending;
};

// Export pojedinačnih ikona za lakši import
export {
  serviceTodoIcon,
  serviceCompletedIcon,
  servicePendingIcon,
  servicePartsIcon,
  adminDashboardIcon,
  analyticsIcon,
  serviceManagementIcon,
  fridgeServiceIcon,
  washingMachineServiceIcon,
  dishwasherServiceIcon,
  stoveServiceIcon,
  mobileTechnicianIcon,
  businessPartnerIcon,
  customerIcon,
  serviceTrackingIcon,
  communicationIcon,
  bekoIcon,
  candyIcon,
  dashboardHeroGraphic,
  warehouseIcon,
  partsCatalogIcon,
  webScrapingIcon,
  userManagementIcon,
  bulkSMSIcon,
  aiPredictiveIcon,
};