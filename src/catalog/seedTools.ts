import type { CatalogTool } from "@/engine/types";

/**
 * Initial solutions & pricing repository.
 * Prices are INDICATIVE starting values and are marked unverified
 * (lastVerifiedAt = null) until an admin verifies them against the vendor's
 * official pricing page via /admin/catalog. The report shows that status.
 */
type Seed = Omit<CatalogTool, "lastVerifiedAt" | "automates" | "setupHours" | "complexity" | "isAI" | "hebrewSupport"> &
  Partial<Pick<CatalogTool, "automates" | "setupHours" | "complexity" | "isAI" | "hebrewSupport">>;

const seeds: Seed[] = [
  // Bundles
  { id: "google_workspace", name: "Google Workspace", primaryCapability: "office_suite", capabilities: ["office_suite", "email", "file_storage", "video_meetings", "docs", "calendar", "team_chat"], pricingModel: "bundle", usdPerSeatMonth: 14, pricingUrl: "https://workspace.google.com/pricing", hebrewSupport: true },
  { id: "microsoft_365", name: "Microsoft 365 Business", primaryCapability: "office_suite", capabilities: ["office_suite", "email", "file_storage", "video_meetings", "docs", "calendar", "team_chat"], pricingModel: "bundle", usdPerSeatMonth: 12.5, pricingUrl: "https://www.microsoft.com/microsoft-365/business/compare-all-microsoft-365-business-products", hebrewSupport: true },
  // Communication
  { id: "slack", name: "Slack", primaryCapability: "team_chat", capabilities: ["team_chat"], pricingModel: "freemium", usdPerSeatMonth: 8.75, pricingUrl: "https://slack.com/pricing" },
  { id: "zoom", name: "Zoom Workplace", primaryCapability: "video_meetings", capabilities: ["video_meetings"], pricingModel: "freemium", usdPerSeatMonth: 13.33, pricingUrl: "https://zoom.us/pricing" },
  { id: "whatsapp_business", name: "WhatsApp Business", primaryCapability: "customer_messaging", capabilities: ["customer_messaging"], pricingModel: "free", usdPerSeatMonth: 0, pricingUrl: "https://business.whatsapp.com/", automates: { customer_inquiries: 0.2 }, setupHours: 3, complexity: 1, hebrewSupport: true },
  // Project management
  { id: "monday", name: "monday.com", primaryCapability: "project_management", capabilities: ["project_management", "crm"], pricingModel: "saas", usdPerSeatMonth: 12, pricingUrl: "https://monday.com/pricing", hebrewSupport: true },
  { id: "asana", name: "Asana", primaryCapability: "project_management", capabilities: ["project_management"], pricingModel: "freemium", usdPerSeatMonth: 13.49, pricingUrl: "https://asana.com/pricing" },
  { id: "trello", name: "Trello", primaryCapability: "project_management", capabilities: ["project_management"], pricingModel: "freemium", usdPerSeatMonth: 6, pricingUrl: "https://trello.com/pricing" },
  { id: "clickup", name: "ClickUp", primaryCapability: "project_management", capabilities: ["project_management", "docs", "timesheets"], pricingModel: "freemium", usdPerSeatMonth: 10, pricingUrl: "https://clickup.com/pricing" },
  { id: "notion", name: "Notion", primaryCapability: "docs", capabilities: ["docs", "project_management"], pricingModel: "freemium", usdPerSeatMonth: 12, pricingUrl: "https://www.notion.com/pricing" },
  // CRM
  { id: "hubspot_crm", name: "HubSpot CRM", primaryCapability: "crm", capabilities: ["crm", "email_marketing"], pricingModel: "freemium", usdPerSeatMonth: 20, pricingUrl: "https://www.hubspot.com/pricing/crm", automates: { lead_followup: 0.3, data_entry: 0.15 }, setupHours: 20, complexity: 3 },
  { id: "pipedrive", name: "Pipedrive", primaryCapability: "crm", capabilities: ["crm"], pricingModel: "saas", usdPerSeatMonth: 24, pricingUrl: "https://www.pipedrive.com/en/pricing", automates: { lead_followup: 0.3 }, setupHours: 12, complexity: 2 },
  { id: "salesforce", name: "Salesforce Starter", primaryCapability: "crm", capabilities: ["crm"], pricingModel: "saas", usdPerSeatMonth: 25, pricingUrl: "https://www.salesforce.com/pricing/", automates: { lead_followup: 0.3 }, setupHours: 40, complexity: 4 },
  { id: "zoho_crm", name: "Zoho CRM", primaryCapability: "crm", capabilities: ["crm"], pricingModel: "freemium", usdPerSeatMonth: 20, pricingUrl: "https://www.zoho.com/crm/zohocrm-pricing.html", automates: { lead_followup: 0.25 }, setupHours: 16, complexity: 3 },
  // Storage
  { id: "dropbox", name: "Dropbox Business", primaryCapability: "file_storage", capabilities: ["file_storage", "esign"], pricingModel: "saas", usdPerSeatMonth: 15, pricingUrl: "https://www.dropbox.com/plans" },
  { id: "box", name: "Box", primaryCapability: "file_storage", capabilities: ["file_storage"], pricingModel: "saas", usdPerSeatMonth: 15, pricingUrl: "https://www.box.com/pricing" },
  // Scheduling
  { id: "calendly", name: "Calendly", primaryCapability: "scheduling", capabilities: ["scheduling"], pricingModel: "freemium", usdPerSeatMonth: 12, pricingUrl: "https://calendly.com/pricing", automates: { scheduling: 0.6 }, setupHours: 3, complexity: 1 },
  { id: "google_appointment", name: "Google Calendar appointment schedules", primaryCapability: "scheduling", capabilities: ["scheduling"], pricingModel: "bundle", usdPerSeatMonth: 0, pricingUrl: "https://workspace.google.com/pricing", automates: { scheduling: 0.5 }, setupHours: 2, complexity: 1, hebrewSupport: true },
  // Automation
  { id: "zapier", name: "Zapier", primaryCapability: "automation", capabilities: ["automation"], pricingModel: "freemium", usdPerSeatMonth: 0, usdFlatMonth: 29.99, pricingUrl: "https://zapier.com/pricing", automates: { data_entry: 0.5, order_processing: 0.35, lead_followup: 0.3, reporting: 0.3 }, setupHours: 10, complexity: 2 },
  { id: "make", name: "Make", primaryCapability: "automation", capabilities: ["automation"], pricingModel: "freemium", usdPerSeatMonth: 0, usdFlatMonth: 10.59, pricingUrl: "https://www.make.com/en/pricing", automates: { data_entry: 0.5, order_processing: 0.35, lead_followup: 0.3, reporting: 0.3 }, setupHours: 14, complexity: 3 },
  // Invoicing / finance (Israel)
  { id: "morning", name: "Morning (Green Invoice)", primaryCapability: "invoicing", capabilities: ["invoicing"], pricingModel: "saas", usdPerSeatMonth: 0, usdFlatMonth: 20, pricingUrl: "https://www.greeninvoice.co.il/pricing/", automates: { invoicing: 0.6 }, setupHours: 4, complexity: 1, hebrewSupport: true },
  { id: "icount", name: "iCount", primaryCapability: "invoicing", capabilities: ["invoicing"], pricingModel: "saas", usdPerSeatMonth: 0, usdFlatMonth: 20, pricingUrl: "https://www.icount.co.il/pricing/", automates: { invoicing: 0.55 }, setupHours: 4, complexity: 1, hebrewSupport: true },
  { id: "rivhit", name: "Rivhit", primaryCapability: "accounting", capabilities: ["accounting", "invoicing", "inventory"], pricingModel: "saas", usdPerSeatMonth: 0, usdFlatMonth: 40, pricingUrl: "https://www.rivhit.co.il/", automates: { invoicing: 0.5, inventory_updates: 0.3 }, setupHours: 16, complexity: 3, hebrewSupport: true },
  // Documents
  { id: "docusign", name: "DocuSign", primaryCapability: "esign", capabilities: ["esign"], pricingModel: "saas", usdPerSeatMonth: 25, pricingUrl: "https://ecom.docusign.com/plans-and-pricing/esignature", automates: { document_prep: 0.3 }, setupHours: 2, complexity: 1 },
  { id: "dropbox_sign", name: "Dropbox Sign", primaryCapability: "esign", capabilities: ["esign"], pricingModel: "saas", usdPerSeatMonth: 15, pricingUrl: "https://sign.dropbox.com/products/dropbox-sign/pricing", automates: { document_prep: 0.3 }, setupHours: 2, complexity: 1 },
  { id: "pandadoc", name: "PandaDoc", primaryCapability: "document_automation", capabilities: ["document_automation", "esign"], pricingModel: "saas", usdPerSeatMonth: 19, pricingUrl: "https://www.pandadoc.com/pricing/", automates: { document_prep: 0.5 }, setupHours: 8, complexity: 2 },
  // Time tracking
  { id: "toggl", name: "Toggl Track", primaryCapability: "timesheets", capabilities: ["timesheets"], pricingModel: "freemium", usdPerSeatMonth: 9, pricingUrl: "https://toggl.com/track/pricing/", automates: { timesheets: 0.5 }, setupHours: 3, complexity: 1 },
  { id: "harvest", name: "Harvest", primaryCapability: "timesheets", capabilities: ["timesheets", "invoicing"], pricingModel: "saas", usdPerSeatMonth: 11, pricingUrl: "https://www.getharvest.com/pricing", automates: { timesheets: 0.5 }, setupHours: 4, complexity: 1 },
  // Reporting
  { id: "looker_studio", name: "Looker Studio", primaryCapability: "reporting", capabilities: ["reporting"], pricingModel: "free", usdPerSeatMonth: 0, pricingUrl: "https://lookerstudio.google.com/", automates: { reporting: 0.5, client_reporting: 0.5 }, setupHours: 16, complexity: 3 },
  { id: "agency_analytics", name: "AgencyAnalytics", primaryCapability: "client_reporting", capabilities: ["client_reporting", "reporting"], pricingModel: "saas", usdPerSeatMonth: 0, usdFlatMonth: 79, pricingUrl: "https://agencyanalytics.com/pricing", automates: { client_reporting: 0.6 }, setupHours: 10, complexity: 2 },
  // Customer service
  { id: "tidio", name: "Tidio", primaryCapability: "live_chat", capabilities: ["live_chat", "customer_messaging"], pricingModel: "freemium", usdPerSeatMonth: 0, usdFlatMonth: 29, pricingUrl: "https://www.tidio.com/pricing/", automates: { customer_inquiries: 0.35 }, setupHours: 8, complexity: 2, isAI: true },
  { id: "freshdesk", name: "Freshdesk", primaryCapability: "helpdesk", capabilities: ["helpdesk"], pricingModel: "freemium", usdPerSeatMonth: 15, pricingUrl: "https://www.freshworks.com/freshdesk/pricing/", automates: { customer_inquiries: 0.25, email_triage: 0.3 }, setupHours: 12, complexity: 2 },
  // Marketing
  { id: "mailchimp", name: "Mailchimp", primaryCapability: "email_marketing", capabilities: ["email_marketing"], pricingModel: "freemium", usdPerSeatMonth: 0, usdFlatMonth: 20, pricingUrl: "https://mailchimp.com/pricing/" },
  { id: "buffer", name: "Buffer", primaryCapability: "social_scheduling", capabilities: ["social_scheduling"], pricingModel: "freemium", usdPerSeatMonth: 6, pricingUrl: "https://buffer.com/pricing", automates: { social_content: 0.35 }, setupHours: 2, complexity: 1 },
  { id: "canva", name: "Canva Teams", primaryCapability: "design", capabilities: ["design"], pricingModel: "freemium", usdPerSeatMonth: 10, pricingUrl: "https://www.canva.com/pricing/", hebrewSupport: true },
  { id: "adobe_cc", name: "Adobe Creative Cloud", primaryCapability: "design_pro", capabilities: ["design_pro", "design"], pricingModel: "saas", usdPerSeatMonth: 90, pricingUrl: "https://www.adobe.com/creativecloud/plans.html" },
  { id: "figma", name: "Figma", primaryCapability: "ui_design", capabilities: ["ui_design"], pricingModel: "freemium", usdPerSeatMonth: 16, pricingUrl: "https://www.figma.com/pricing/" },
  // Security
  { id: "1password", name: "1Password Business", primaryCapability: "password_mgmt", capabilities: ["password_mgmt"], pricingModel: "saas", usdPerSeatMonth: 7.99, pricingUrl: "https://1password.com/pricing" },
  { id: "lastpass", name: "LastPass Business", primaryCapability: "password_mgmt", capabilities: ["password_mgmt"], pricingModel: "saas", usdPerSeatMonth: 7, pricingUrl: "https://www.lastpass.com/pricing" },
  // AI assistants
  { id: "chatgpt_team", name: "ChatGPT Business", primaryCapability: "ai_assistant", capabilities: ["ai_assistant"], pricingModel: "saas", usdPerSeatMonth: 30, pricingUrl: "https://openai.com/chatgpt/pricing/", automates: { document_prep: 0.25, email_triage: 0.2, social_content: 0.25 }, setupHours: 6, complexity: 2, isAI: true, hebrewSupport: true },
  { id: "claude_team", name: "Claude Team", primaryCapability: "ai_assistant", capabilities: ["ai_assistant"], pricingModel: "saas", usdPerSeatMonth: 30, pricingUrl: "https://claude.com/pricing", automates: { document_prep: 0.25, email_triage: 0.2, client_reporting: 0.2 }, setupHours: 6, complexity: 2, isAI: true, hebrewSupport: true },
  { id: "fireflies", name: "Fireflies.ai", primaryCapability: "meeting_notes", capabilities: ["meeting_notes"], pricingModel: "freemium", usdPerSeatMonth: 18, pricingUrl: "https://fireflies.ai/pricing", automates: { document_prep: 0.15 }, setupHours: 1, complexity: 1, isAI: true },
  { id: "grammarly", name: "Grammarly Business", primaryCapability: "writing_assistant", capabilities: ["writing_assistant"], pricingModel: "saas", usdPerSeatMonth: 15, pricingUrl: "https://www.grammarly.com/plans", isAI: true },
];

export const SEED_TOOLS: CatalogTool[] = seeds.map((s) => ({
  automates: {},
  setupHours: 0,
  complexity: 1,
  isAI: false,
  hebrewSupport: false,
  ...s,
  lastVerifiedAt: null,
}));

export const CAPABILITY_KEYS = Array.from(new Set(SEED_TOOLS.flatMap((t) => t.capabilities))).sort();
