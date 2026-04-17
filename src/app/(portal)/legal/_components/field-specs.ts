import type { FieldSpec } from "./LegalDrawerForm"

const PLAN = [
  { value: "Elite", label: "Elite" },
  { value: "Pro", label: "Pro" },
  { value: "Starter", label: "Starter" },
  { value: "Basic", label: "Basic" },
]

const CLIENT_HEALTH = [
  { value: "Healthy", label: "Healthy" },
  { value: "At Risk", label: "At Risk" },
  { value: "Churned", label: "Churned" },
  { value: "Inactive", label: "Inactive" },
]

const LLC_STATUS = [
  { value: "Pending", label: "Pending" },
  { value: "Processing", label: "Processing" },
  { value: "Delivered", label: "Delivered" },
  { value: "On Hold", label: "On Hold" },
  { value: "Cancelled", label: "Cancelled" },
]

const ONBOARDING_PHASE = [
  { value: "Onboarding", label: "Onboarding" },
  { value: "LLC Filing", label: "LLC Filing" },
  { value: "EIN", label: "EIN" },
  { value: "Bank Account", label: "Bank Account" },
  { value: "Website", label: "Website" },
  { value: "Reseller Permit", label: "Reseller Permit" },
  { value: "ITIN", label: "ITIN" },
]

const LLC_TYPE = [
  { value: "Single Member", label: "Single Member" },
  { value: "Multi Member", label: "Multi Member" },
]

const FILING_STATUS = [
  { value: "Pending", label: "Pending" },
  { value: "In progress", label: "In progress" },
  { value: "Document Collection", label: "Document Collection" },
  { value: "Filed", label: "Filed" },
  { value: "Completed", label: "Completed" },
]

const FILING_STAGE = [
  { value: "Document Collection", label: "Document Collection" },
  { value: "Preparation", label: "Preparation" },
  { value: "Filing", label: "Filing" },
  { value: "Review", label: "Review" },
  { value: "Complete", label: "Complete" },
]

const BANK_STATEMENTS_STATUS = [
  { value: "Pending", label: "Pending" },
  { value: "Received", label: "Received" },
  { value: "Complete", label: "Complete" },
]

const SEND_MAIL_STATUS = [
  { value: "Not Sent", label: "Not Sent" },
  { value: "Sent", label: "Sent" },
  { value: "Delivered", label: "Delivered" },
]

export const SPECS: Record<string, FieldSpec[]> = {
  clients: [
    { name: "client_code", label: "Client code" },
    { name: "client_name", label: "Client name", required: true },
    { name: "email", label: "Email" },
    { name: "contact_number", label: "Contact number" },
    { name: "country", label: "Country", placeholder: "India" },
    { name: "plan", label: "Plan", type: "select", options: PLAN },
    { name: "website_included", label: "Website included", type: "checkbox" },
    { name: "client_health", label: "Client health", type: "select", options: CLIENT_HEALTH },
    { name: "llc_name", label: "LLC name" },
    { name: "llc_status", label: "LLC status", type: "select", options: LLC_STATUS },
    { name: "llc_email", label: "LLC email" },
    { name: "ein", label: "EIN" },
    { name: "llc_address", label: "LLC address", type: "textarea", rows: 2 },
    { name: "website_url", label: "Website URL", type: "url" },
    { name: "bank_name", label: "Bank name" },
    { name: "bank_account_number", label: "Bank account number" },
    { name: "bank_routing_number", label: "Bank routing number" },
    { name: "date_of_payment", label: "Date of payment", placeholder: "DD/MM/YYYY" },
    { name: "date_of_onboarding", label: "Date of onboarding" },
    { name: "amount_received", label: "Amount received", type: "number", step: "0.01" },
    { name: "remaining_payment", label: "Remaining payment", type: "number", step: "0.01" },
    { name: "notes", label: "Notes", type: "textarea", rows: 3 },
  ],
  onboarding_checklist: [
    { name: "client_id", label: "Client ID", required: true, placeholder: "legal.clients.id uuid" },
    { name: "phase", label: "Phase", type: "select", options: ONBOARDING_PHASE },
    { name: "step_name", label: "Step name", required: true },
    { name: "is_completed", label: "Completed", type: "checkbox" },
    { name: "completed_at", label: "Completed at", type: "date" },
    { name: "sort_order", label: "Sort order", type: "number" },
  ],
  documents: [
    { name: "client_id", label: "Client ID", placeholder: "legal.clients.id uuid" },
    { name: "filing_id", label: "Filing ID", placeholder: "legal.tax_filings.id uuid" },
    { name: "name", label: "Name", required: true },
    { name: "doc_type", label: "Type", type: "select", options: [
      { value: "llc_filing", label: "LLC Filing" },
      { value: "ein", label: "EIN" },
      { value: "tax_return", label: "Tax Return" },
      { value: "bank_statement", label: "Bank Statement" },
      { value: "id_proof", label: "ID Proof" },
      { value: "contract", label: "Contract" },
      { value: "other", label: "Other" },
      { value: "general", label: "General" },
    ] },
    { name: "file_url", label: "File URL", type: "url" },
    { name: "uploaded_by", label: "Uploaded by" },
    { name: "notes", label: "Notes", type: "textarea", rows: 2 },
  ],
  payments: [
    { name: "client_id", label: "Client ID", required: true, placeholder: "legal.clients.id uuid" },
    { name: "amount", label: "Amount", type: "number", step: "0.01", required: true },
    { name: "currency", label: "Currency", placeholder: "INR" },
    { name: "payment_date", label: "Payment date", placeholder: "DD/MM/YYYY" },
    { name: "payment_method", label: "Payment method", type: "select", options: [
      { value: "UPI", label: "UPI" },
      { value: "bank_transfer", label: "Bank Transfer" },
      { value: "cash", label: "Cash" },
      { value: "card", label: "Card" },
      { value: "other", label: "Other" },
    ] },
    { name: "reference", label: "Reference" },
    { name: "notes", label: "Notes", type: "textarea", rows: 2 },
  ],
  tax_filings: [
    { name: "client_id", label: "Client ID", placeholder: "legal.clients.id uuid" },
    { name: "llc_name", label: "LLC name" },
    { name: "llc_type", label: "LLC type", type: "select", options: LLC_TYPE },
    { name: "amount_received", label: "Amount received", type: "number", step: "0.01" },
    { name: "main_entity_name", label: "Main entity name" },
    { name: "contact_details", label: "Contact details" },
    { name: "email_address", label: "Email address" },
    { name: "address", label: "Address", type: "textarea", rows: 2 },
    { name: "status", label: "Status", type: "select", options: FILING_STATUS },
    { name: "filing_stage", label: "Filing stage", type: "select", options: FILING_STAGE },
    { name: "date_of_formation", label: "Date of formation" },
    { name: "ein_number", label: "EIN number" },
    { name: "naics", label: "NAICS" },
    { name: "filing_done", label: "Filing done", type: "checkbox" },
    { name: "filled_1120", label: "Filled 1120", type: "checkbox" },
    { name: "filled_5472", label: "Filled 5472", type: "checkbox" },
    { name: "verified_ein_in_form", label: "Verified EIN in form", type: "checkbox" },
    { name: "annual_report_filed", label: "Annual report filed", type: "checkbox" },
    { name: "bank_statements_status", label: "Bank statements status", type: "select", options: BANK_STATEMENTS_STATUS },
    { name: "send_mail_status", label: "Send mail status", type: "select", options: SEND_MAIL_STATUS },
    { name: "notes", label: "Notes", type: "textarea", rows: 3 },
  ],
}
