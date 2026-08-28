# MK Pizza Online Ordering Server

This is the real cloud service used by the POS and customer ordering website. It requires PostgreSQL.

## Environment
- DATABASE_URL=your PostgreSQL connection string
- POS_API_TOKEN=a long random secret shared only with the POS
- PORT=8080 (optional)

## Run
```bash
cd server
npm install
npm start
```

Deploy the `server` directory to a Node.js host with PostgreSQL and HTTPS. After deployment, open POS → Settings → Online Ordering and enter the HTTPS API URL, the same POS API token, and a menu ID. Click **Publish POS Menu Online**.

Customers can then use:
`https://YOUR-SERVER-DOMAIN/?menu=default`

Orders are persisted in PostgreSQL. The POS polls the service every 3 seconds for NEW orders. Accepting an order marks it accepted/preparing, creates a local kitchen order, and prints it through the configured kitchen thermal printer.

For production, use HTTPS, a strong random POS_API_TOKEN, PostgreSQL backups, and a managed database. Never put the POS API token into the customer website.
