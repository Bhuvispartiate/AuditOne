-- ============================================================================
-- DIRECT SUPABASE DATABASE PERSISTENCE POLICIES
-- Enables direct INSERT, UPDATE, SELECT, and DELETE across all PMS tables
-- Guarantees that data entered on the website persists directly into Supabase
-- ============================================================================

-- 1. CLIENTS & CONTACTS & ADDRESSES & REGISTRATIONS
DROP POLICY IF EXISTS "Direct access to clients" ON clients;
CREATE POLICY "Direct access to clients" ON clients FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Direct access to client_contacts" ON client_contacts;
CREATE POLICY "Direct access to client_contacts" ON client_contacts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Direct access to client_addresses" ON client_addresses;
CREATE POLICY "Direct access to client_addresses" ON client_addresses FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Direct access to client_registrations" ON client_registrations;
CREATE POLICY "Direct access to client_registrations" ON client_registrations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Direct access to client_bank_accounts" ON client_bank_accounts;
CREATE POLICY "Direct access to client_bank_accounts" ON client_bank_accounts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Direct access to client_documents" ON client_documents;
CREATE POLICY "Direct access to client_documents" ON client_documents FOR ALL USING (true) WITH CHECK (true);

-- 2. SERVICES & ENGAGEMENTS
DROP POLICY IF EXISTS "Direct access to services" ON services;
CREATE POLICY "Direct access to services" ON services FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Direct access to service_engagements" ON service_engagements;
CREATE POLICY "Direct access to service_engagements" ON service_engagements FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Direct access to service_fee_records" ON service_fee_records;
CREATE POLICY "Direct access to service_fee_records" ON service_fee_records FOR ALL USING (true) WITH CHECK (true);

-- 3. PROJECTS & TASKS & COMMENTS
DROP POLICY IF EXISTS "Direct access to projects" ON projects;
CREATE POLICY "Direct access to projects" ON projects FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Direct access to project_assignments" ON project_assignments;
CREATE POLICY "Direct access to project_assignments" ON project_assignments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Direct access to project_workflows" ON project_workflows;
CREATE POLICY "Direct access to project_workflows" ON project_workflows FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Direct access to project_workflow_stages" ON project_workflow_stages;
CREATE POLICY "Direct access to project_workflow_stages" ON project_workflow_stages FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Direct access to tasks" ON tasks;
CREATE POLICY "Direct access to tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Direct access to task_assignments" ON task_assignments;
CREATE POLICY "Direct access to task_assignments" ON task_assignments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Direct access to task_comments" ON task_comments;
CREATE POLICY "Direct access to task_comments" ON task_comments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Direct access to task_attachments" ON task_attachments;
CREATE POLICY "Direct access to task_attachments" ON task_attachments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Direct access to task_status_history" ON task_status_history;
CREATE POLICY "Direct access to task_status_history" ON task_status_history FOR ALL USING (true) WITH CHECK (true);

-- 4. WORKFLOW TEMPLATES & STAGES
DROP POLICY IF EXISTS "Direct access to workflow_templates" ON workflow_templates;
CREATE POLICY "Direct access to workflow_templates" ON workflow_templates FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Direct access to workflow_template_versions" ON workflow_template_versions;
CREATE POLICY "Direct access to workflow_template_versions" ON workflow_template_versions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Direct access to workflow_milestones" ON workflow_milestones;
CREATE POLICY "Direct access to workflow_milestones" ON workflow_milestones FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Direct access to workflow_stages" ON workflow_stages;
CREATE POLICY "Direct access to workflow_stages" ON workflow_stages FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Direct access to workflow_sub_stages" ON workflow_sub_stages;
CREATE POLICY "Direct access to workflow_sub_stages" ON workflow_sub_stages FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Direct access to workflow_tasks" ON workflow_tasks;
CREATE POLICY "Direct access to workflow_tasks" ON workflow_tasks FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Direct access to workflow_conditions" ON workflow_conditions;
CREATE POLICY "Direct access to workflow_conditions" ON workflow_conditions FOR ALL USING (true) WITH CHECK (true);

-- 5. INVOICES & PAYMENTS & FINANCE
DROP POLICY IF EXISTS "Direct access to invoices" ON invoices;
CREATE POLICY "Direct access to invoices" ON invoices FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Direct access to invoice_items" ON invoice_items;
CREATE POLICY "Direct access to invoice_items" ON invoice_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Direct access to invoice_sequences" ON invoice_sequences;
CREATE POLICY "Direct access to invoice_sequences" ON invoice_sequences FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Direct access to payments" ON payments;
CREATE POLICY "Direct access to payments" ON payments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Direct access to payment_allocations" ON payment_allocations;
CREATE POLICY "Direct access to payment_allocations" ON payment_allocations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Direct access to credit_notes" ON credit_notes;
CREATE POLICY "Direct access to credit_notes" ON credit_notes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Direct access to payment_reminders" ON payment_reminders;
CREATE POLICY "Direct access to payment_reminders" ON payment_reminders FOR ALL USING (true) WITH CHECK (true);

-- 6. FILES, CATEGORIES, SETTINGS & UNIVERSAL MODULES
DROP POLICY IF EXISTS "Direct access to file_objects" ON file_objects;
CREATE POLICY "Direct access to file_objects" ON file_objects FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Direct access to task_categories" ON task_categories;
CREATE POLICY "Direct access to task_categories" ON task_categories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Direct access to task_sub_categories" ON task_sub_categories;
CREATE POLICY "Direct access to task_sub_categories" ON task_sub_categories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Direct access to task_statuses" ON task_statuses;
CREATE POLICY "Direct access to task_statuses" ON task_statuses FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Direct access to universal_recycle_bin" ON universal_recycle_bin;
CREATE POLICY "Direct access to universal_recycle_bin" ON universal_recycle_bin FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Direct access to whatsapp_templates" ON whatsapp_templates;
CREATE POLICY "Direct access to whatsapp_templates" ON whatsapp_templates FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Direct access to employees" ON employees;
CREATE POLICY "Direct access to employees" ON employees FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Direct access to employee_private_details" ON employee_private_details;
CREATE POLICY "Direct access to employee_private_details" ON employee_private_details FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Direct access to departments" ON departments;
CREATE POLICY "Direct access to departments" ON departments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Direct access to designations" ON designations;
CREATE POLICY "Direct access to designations" ON designations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Direct access to teams" ON teams;
CREATE POLICY "Direct access to teams" ON teams FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Direct access to team_members" ON team_members;
CREATE POLICY "Direct access to team_members" ON team_members FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Direct access to notifications" ON notifications;
CREATE POLICY "Direct access to notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Direct access to activity_logs" ON activity_logs;
CREATE POLICY "Direct access to activity_logs" ON activity_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Direct access to office_geo_configs" ON office_geo_configs;
CREATE POLICY "Direct access to office_geo_configs" ON office_geo_configs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Direct access to attendance_records" ON attendance_records;
CREATE POLICY "Direct access to attendance_records" ON attendance_records FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Direct access to system_settings" ON system_settings;
CREATE POLICY "Direct access to system_settings" ON system_settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Direct access to users" ON users;
CREATE POLICY "Direct access to users" ON users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Direct access to user_roles" ON user_roles;
CREATE POLICY "Direct access to user_roles" ON user_roles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Direct access to roles" ON roles;
CREATE POLICY "Direct access to roles" ON roles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Direct access to permissions" ON permissions;
CREATE POLICY "Direct access to permissions" ON permissions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Direct access to role_permissions" ON role_permissions;
CREATE POLICY "Direct access to role_permissions" ON role_permissions FOR ALL USING (true) WITH CHECK (true);

