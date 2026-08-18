# Findupto POS

A modern retail POS foundation for the `findupto/similar` project. The product direction combines the practical POS workflows found in Enerpize, Nextar and Zoho POS while using original UI/code and a modular architecture.

## Included now
- POS checkout with product search, barcode/SKU-ready catalog, categories and cart
- Quantity controls, item removal, customer selection and payment flow
- Inventory deduction after completed sales
- Dashboard, products, inventory, customers, purchases, sales, accounting, reports and settings workspaces
- Low-stock indicators, inventory value, cash/receivable/payable KPI cards
- Responsive desktop/tablet/mobile layout
- Online/offline-ready product architecture (offline persistence/backend sync is next)

## Product scope
The target platform is an all-in-one POS/ERP rather than only a cash register. Planned modules include:

### Sales & POS
POS terminal, quotes, invoices, returns, refunds/store credit, discounts, promotions, price lists, installments, split payments, order sources, receipts, keyboard shortcuts, cash sessions, cash-in/out, shifts and commissions.

### Inventory & purchasing
Products, variants, units of measure, barcode, serial/lot/expiry tracking, stock transfers, adjustments, stocktaking, requisitions, warehouses, purchase orders, supplier invoices, supplier payments, reorder alerts and inventory valuation.

### Customers & loyalty
Customer directory, purchase history, credit/debt, loyalty points, store credit, customer groups and targeted promotions.

### Accounting
Chart of accounts, journal entries, general ledger, cash/bank accounts, expenses, taxes, receivables, payables, cost centers, assets and financial reports.

### Workforce & administration
Users, roles, granular permissions, shifts, employee performance, multi-store access, audit logs and approval workflows.

### Reporting
Sales, profit, tax, inventory, purchasing, customer, cashier, payment, product/category/brand and financial dashboards with export/scheduling support.

### Platform
Multi-location, cloud sync, offline-first POS queue, hardware adapters for barcode scanners/printers/cash drawers/scales, API, import/export, notifications, backups and configurable business settings.

## Reference feature research
The scope is informed by public feature descriptions from Enerpize and Zoho POS, including offline POS, barcode/hardware support, inventory/accounting/CRM integration, multi-location, loyalty, shifts, cash sessions and reporting. Nextar's public positioning also covers POS, inventory, cash register, customers, online catalog, sales and reports.

## Run
```bash
npm install
npm run dev
```

## Next engineering phase
1. Add a real API/database (PostgreSQL + authentication + tenant/store model).
2. Persist POS transactions and implement offline sync/conflict handling.
3. Build inventory, purchasing, customer, accounting and reporting CRUD APIs.
4. Add printer/barcode/cash-drawer integrations behind hardware adapters.
5. Add permissions, audit trail, taxes, returns/refunds and accounting journals.
6. Add automated tests and CI before production deployment.
