-- ============================================================================
-- PROFESSIONAL SERVICE MANAGEMENT SYSTEM (PMS)
-- SEED DATA: ROLES, PERMISSIONS, SERVICES, DEPARTMENTS, WORKFLOWS & MOCK DATA
-- ============================================================================

-- 1. ROLES
INSERT INTO roles (id, name, code, description, hierarchy_level, is_system) VALUES
('11111111-1111-1111-1111-111111111101', 'Super Admin', 'SUPER_ADMIN', 'Full system access and master configuration authority', 1, true),
('11111111-1111-1111-1111-111111111102', 'Director', 'DIRECTOR', 'Executive leadership with access to finance, clients and approvals', 2, true),
('11111111-1111-1111-1111-111111111103', 'Head', 'HEAD', 'Department Head supervising teams, projects and allocations', 3, true),
('11111111-1111-1111-1111-111111111104', 'Supervisor', 'SUPERVISOR', 'Team supervisor overseeing task execution and reviewing work', 4, true),
('11111111-1111-1111-1111-111111111105', 'Employee', 'EMPLOYEE', 'Full-time professional staff managing assigned deliverables', 5, true),
('11111111-1111-1111-1111-111111111106', 'Trainee', 'TRAINEE', 'Articled assistant or intern with supervised task execution', 6, true)
ON CONFLICT (code) DO NOTHING;

-- 2. PERMISSIONS
INSERT INTO permissions (id, module, action, code, description) VALUES
('22222222-2222-2222-2222-222222220001', 'clients', 'read', 'clients.read', 'View client records'),
('22222222-2222-2222-2222-222222220002', 'clients', 'create', 'clients.create', 'Onboard new clients'),
('22222222-2222-2222-2222-222222220003', 'clients', 'update', 'clients.update', 'Update client details'),
('22222222-2222-2222-2222-222222220004', 'clients', 'delete', 'clients.delete', 'Archive or delete clients'),
('22222222-2222-2222-2222-222222220005', 'services', 'manage', 'services.manage', 'Add and edit service catalog'),
('22222222-2222-2222-2222-222222220006', 'projects', 'manage', 'projects.manage', 'Create and oversee projects'),
('22222222-2222-2222-2222-222222220007', 'tasks', 'execute', 'tasks.execute', 'Update assigned tasks'),
('22222222-2222-2222-2222-222222220008', 'finance', 'read', 'finance.read', 'View invoices and receipts'),
('22222222-2222-2222-2222-222222220009', 'finance', 'manage', 'finance.manage', 'Generate invoices and record payments'),
('22222222-2222-2222-2222-222222220010', 'employees', 'manage', 'employees.manage', 'Onboard and manage employees'),
('22222222-2222-2222-2222-222222220011', 'workflows', 'manage', 'workflows.manage', 'Design and publish workflow templates')
ON CONFLICT (code) DO NOTHING;

-- 3. DEPARTMENTS
INSERT INTO departments (id, department_code, name, description, status) VALUES
('33333333-3333-3333-3333-333333330001', 'TAX', 'Tax & Regulatory Services', 'Direct, Indirect taxation, GST and International Tax', 'Active'),
('33333333-3333-3333-3333-333333330002', 'CORP', 'Corporate Law & Secretarial', 'ROC compliances, incorporations and corporate filings', 'Active'),
('33333333-3333-3333-3333-333333330003', 'AUDIT', 'Assurance & Audit', 'Statutory, internal and specialized tax audits', 'Active'),
('33333333-3333-3333-3333-333333330004', 'ADVISORY', 'Advisory & Transactions', 'Valuation, Virtual CFO and business restructuring', 'Active'),
('33333333-3333-3333-3333-333333330005', 'ACCT', 'Accounting & Payroll', 'Bookkeeping, management reporting and payroll processing', 'Active')
ON CONFLICT (department_code) DO NOTHING;

-- 4. DESIGNATIONS
INSERT INTO designations (id, title, code, level, description) VALUES
('44444444-4444-4444-4444-444444440001', 'Managing Partner / Director', 'DIR', 1, 'Strategic lead and firm principal'),
('44444444-4444-4444-4444-444444440002', 'Practice Head', 'HEAD', 2, 'Head of practice group'),
('44444444-4444-4444-4444-444444440003', 'Senior Manager / Supervisor', 'MGR', 3, 'Operational team supervisor'),
('44444444-4444-4444-4444-444444440004', 'Senior Consultant', 'SR_CONS', 4, 'Senior professional consultant'),
('44444444-4444-4444-4444-444444440005', 'Associate Consultant', 'ASSOC', 5, 'Executive consultant'),
('44444444-4444-4444-4444-444444440006', 'Articled Assistant / Trainee', 'TRAINEE', 6, 'Trainee or apprentice')
ON CONFLICT (code) DO NOTHING;

-- 5. INITIAL 17 SERVICES CATALOG (Exceeds required 15 services)
INSERT INTO services (id, service_code, service_name, description, default_fee, default_gst_rate, billing_type, status) VALUES
('55555555-5555-5555-5555-555555550001', 'SRV-GST-01', 'GST Registration & Core Amendment', 'New GST registration, ARN tracking and core field modifications', 3500.00, 18.00, 'One-time', 'Active'),
('55555555-5555-5555-5555-555555550002', 'SRV-GST-02', 'Monthly GST Return Compliance (GSTR-1 & 3B)', 'Monthly sales ledger upload, 2B ITC reconciliation and return filing', 5000.00, 18.00, 'Recurring', 'Active'),
('55555555-5555-5555-5555-555555550003', 'SRV-GST-03', 'Annual GST Return & Reconciliation (GSTR-9/9C)', 'Annual consolidation, reverse charge check and table 9C audit memo', 15000.00, 18.00, 'One-time', 'Active'),
('55555555-5555-5555-5555-555555550004', 'SRV-ITR-01', 'Corporate Income Tax Return (ITR-6)', 'Company tax return preparation, MAT computation and e-verification', 25000.00, 18.00, 'One-time', 'Active'),
('55555555-5555-5555-5555-555555550005', 'SRV-ITR-02', 'Non-Corporate & Individual ITR (ITR-2/3/5)', 'Partnership, LLP and High Networth Individual income tax filing', 8500.00, 18.00, 'One-time', 'Active'),
('55555555-5555-5555-5555-555555550006', 'SRV-AUD-01', 'Statutory Financial Audit', 'Independent financial statement examination under Companies Act 2013', 45000.00, 18.00, 'One-time', 'Active'),
('55555555-5555-5555-5555-555555550007', 'SRV-AUD-02', 'Tax Audit u/s 44AB', 'Form 3CA/3CB and Form 3CD electronic certification and reporting', 30000.00, 18.00, 'One-time', 'Active'),
('55555555-5555-5555-5555-555555550008', 'SRV-TDS-01', 'Quarterly TDS/TCS Return Compliance', 'Quarterly 24Q, 26Q, 27Q processing, challan tagging and Form 16 issuance', 4500.00, 18.00, 'Recurring', 'Active'),
('55555555-5555-5555-5555-555555550009', 'SRV-ROC-01', 'Private Limited Company Incorporation', 'RUN name reservation, SPICe+ filing, PAN/TAN, DIN and Certificate of Incorporation', 12000.00, 18.00, 'One-time', 'Active'),
('55555555-5555-5555-5555-555555550010', 'SRV-ROC-02', 'LLP Formation & Agreement Drafting', 'LLP name reservation, FiLLiP filing and supplementary LLP agreement stamping', 10000.00, 18.00, 'One-time', 'Active'),
('55555555-5555-5555-5555-555555550011', 'SRV-ROC-03', 'Annual MCA ROC Compliance (AOC-4 & MGT-7)', 'Board report drafting, financial XBRL conversion and annual returns', 18000.00, 18.00, 'One-time', 'Active'),
('55555555-5555-5555-5555-555555550012', 'SRV-IPR-01', 'Trademark Application & Clearance Search', 'Pre-filing classification, TM-A filing and tracking examiner reports', 7500.00, 18.00, 'One-time', 'Active'),
('55555555-5555-5555-5555-555555550013', 'SRV-PAY-01', 'Monthly Payroll & Statutory ESI/PF Filing', 'Payslip preparation, ECR generation, Form 5/10 and monthly compliance', 8000.00, 18.00, 'Recurring', 'Active'),
('55555555-5555-5555-5555-555555550014', 'SRV-ACC-01', 'End-to-End Accounting & Bookkeeping', 'Cloud ledger maintenance, bank reconciliation and monthly MIS preparation', 15000.00, 18.00, 'Recurring', 'Active'),
('55555555-5555-5555-5555-555555550015', 'SRV-TP-01', 'Transfer Pricing Study & Form 3CEB', 'International benchmark analysis, TP study documentation and accountant report', 60000.00, 18.00, 'One-time', 'Active'),
('55555555-5555-5555-5555-555555550016', 'SRV-CFO-01', 'Virtual CFO & Financial Advisory', 'Budgeting, cash flow forecasting, board presentations and investor reporting', 50000.00, 18.00, 'Recurring', 'Active'),
('55555555-5555-5555-5555-555555550017', 'SRV-EXIM-01', 'DGFT Import Export Code (IEC) & Registration', 'DGFT application, ICEGATE linking and digital token validation', 4000.00, 18.00, 'One-time', 'Active')
ON CONFLICT (service_code) DO NOTHING;

-- 6. DEFAULT WORKFLOW TEMPLATE: Annual Corporate Tax & ROC Filing
INSERT INTO workflow_templates (id, workflow_code, workflow_name, service_id, description, is_active) VALUES
('66666666-6666-6666-6666-666666660001', 'WF-ANNUAL-FILING', 'Annual Corporate Tax & ROC Filing Workflow', '55555555-5555-5555-5555-555555550004', 'Standard 6-stage lifecycle for corporate statutory accounts, tax audit and MCA return filing', true)
ON CONFLICT (workflow_code) DO NOTHING;

INSERT INTO workflow_template_versions (id, workflow_template_id, version_number, is_published, published_at) VALUES
('66666666-6666-6666-6666-666666660002', '66666666-6666-6666-6666-666666660001', 1, true, NOW())
ON CONFLICT (workflow_template_id, version_number) DO NOTHING;

-- 6 Stages for the Workflow
INSERT INTO workflow_stages (id, template_version_id, stage_name, description, sequence_number, default_days, assigned_department_id) VALUES
('77777777-7777-7777-7777-777777770001', '66666666-6666-6666-6666-666666660002', 'Document Collection', 'Client checklist dispatch, trial balance and ledger collection', 1, 7, '33333333-3333-3333-3333-333333330005'),
('77777777-7777-7777-7777-777777770002', '66666666-6666-6666-6666-666666660002', 'Document Verification & Scrutiny', 'Vouching, bank statements cross-checking and 26AS/AIS verification', 2, 5, '33333333-3333-3333-3333-333333330003'),
('77777777-7777-7777-7777-777777770003', '66666666-6666-6666-6666-666666660002', 'Draft Preparation', 'Financial statement preparation, schedule building and draft tax computation', 3, 10, '33333333-3333-3333-3333-333333330001'),
('77777777-7777-7777-7777-777777770004', '66666666-6666-6666-6666-666666660002', 'Internal Review & Partner Sign-off', 'Supervisory check, partner quality control and client sign-off', 4, 3, '33333333-3333-3333-3333-333333330001'),
('77777777-7777-7777-7777-777777770005', '66666666-6666-6666-6666-666666660002', 'Statutory Portal Filing', 'Portal XML/JSON generation, DSC signing and filing on IT/MCA portals', 5, 2, '33333333-3333-3333-3333-333333330002'),
('77777777-7777-7777-7777-777777770006', '66666666-6666-6666-6666-666666660002', 'Completion & Documentation', 'Client acknowledgment delivery, archiving workpapers to R2 storage', 6, 2, '33333333-3333-3333-3333-333333330005')
ON CONFLICT DO NOTHING;

-- Tasks for each stage
INSERT INTO workflow_tasks (stage_id, task_name, description, sequence_number, default_days, priority, is_mandatory) VALUES
('77777777-7777-7777-7777-777777770001', 'Send Document Requirement Checklist', 'Transmit standardized PBC checklist to client finance team', 1, 2, 'High', true),
('77777777-7777-7777-7777-777777770001', 'Collect Final Trial Balance & Ledgers', 'Receive signed trial balance and supporting schedules', 2, 5, 'High', true),
('77777777-7777-7777-7777-777777770002', 'Reconcile 26AS, AIS and TIS with Books', 'Identify any TDS mismatches or unreported incomes', 1, 3, 'Urgent', true),
('77777777-7777-7777-7777-777777770002', 'Verify Statutory Dues & Loan Compliances', 'Check PF, ESI, GST payment receipts before due dates', 2, 2, 'Medium', true),
('77777777-7777-7777-7777-777777770003', 'Prepare Draft Balance Sheet and P&L', 'Prepare Schedule III compliant financial statements', 1, 5, 'High', true),
('77777777-7777-7777-7777-777777770003', 'Calculate Advance Tax & MAT under 115JB', 'Tax provision and deferred tax asset/liability calculation', 2, 3, 'High', true),
('77777777-7777-7777-7777-777777770004', 'Partner Review & Scrutiny', 'Comprehensive review by practice director before submission', 1, 2, 'Urgent', true),
('77777777-7777-7777-7777-777777770004', 'Client Approval & Signature on Declarations', 'Receive signed management representation letter (MRL)', 2, 2, 'High', true),
('77777777-7777-7777-7777-777777770005', 'Upload ITR & Generate Acknowledgement', 'DSC affixation, portal submission and ITR-V download', 1, 1, 'Urgent', true),
('77777777-7777-7777-7777-777777770006', 'Invoice Generation and Workpaper Archival', 'Ensure final billing is raised and papers archived in R2', 1, 2, 'Medium', true)
ON CONFLICT DO NOTHING;

