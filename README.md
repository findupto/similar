# MK Pizza & Ice Bar POS

Standalone Windows restaurant POS rebuilt for fast counter service and desktop touch/mouse use.

## Included
- Role-based login: Admin, Owner, Cashier, Accountant
- Fast POS checkout with search, categories, stock control and payment methods
- Product/Menu management with CSV export
- Inventory, Customers, Sales, Accounting and Reports modules
- Business settings with MK Pizza & Ice Bar defaults
- Local browser storage for offline-first operation
- Thermal receipt printing with ESC/POS output
- Live Windows COM/Bluetooth thermal-printer discovery
- Remembers the last selected printer and attempts automatic reconnect
- Browser/system print fallback when no native printer is available
- Responsive UI for large desktops, laptops and smaller screens
- Electron standalone Windows application
- NSIS installer and portable build for x64, x86 and ARM64 Windows

## Default login
| Username | Role | Password |
|---|---|---|
| admin | Admin | `0099` |
| owner | Owner | `0099` |
| cashier | Cashier | `0099` |
| accountant | Accountant | `0099` |

## Business defaults
- Business: MK Pizza & Ice Bar
- Address: Collage Road Abbas Chowk, Bhakkar, Pakistan
- Phone: 0316 9700025
- Currency: Rs.
- Tax: 0%

## Development
```bash
npm install
npm run dev
```

Desktop development:
```bash
npm run electron:dev
```

Build Windows installer + portable package:
```bash
npm run dist
```

The GitHub Actions workflow also builds Windows x64, x86 and ARM64 artifacts from `main`.

## Bluetooth thermal printers
Pair the printer in Windows first. Most Bluetooth receipt printers expose a Windows COM port. The Electron bridge discovers available COM ports, lets the operator connect/test one, stores the last printer locally, and retries that printer when the POS starts. ESC/POS is sent at 9600 baud by default. If a printer is unavailable, the POS falls back to the normal Windows print flow.
