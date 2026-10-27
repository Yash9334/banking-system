# AWS EC2 Deployment Guide

Educational deployment of the Digital Banking System on one Ubuntu EC2 instance.

## Architecture

- Nginx serves the built React frontend on port 80 and forwards `/api/` requests to the API Gateway on port 8080.
- The API Gateway routes requests to Account Service (8081), Transaction Service (8082), and Payment Service (8083).
- The services use local MySQL databases: `account_db`, `transaction_db`, and `payment_db`.
- Kafka supports the Fraud Detection and Notification workers. Redis supports rate limiting.

## AWS network rules

- Allow HTTP on port 80 from `0.0.0.0/0` so visitors can reach the site.
- Restrict SSH on port 22 to your own IP.
- Do not expose ports 8080, 8081–8085, 3306, 6379, or 9092 to the internet.
- Configure HTTPS separately before relying on port 443.

## Prepare the instance

Install Java 17, MySQL, Redis, Docker with Compose, Node.js/npm, and Nginx. Clone this repository, then create the three MySQL databases and a database user with access to them.

Keep the database password in the instance’s local configuration or environment. Do not commit real passwords, API keys, SSH keys, or tokens.

## Start dependencies

Start MySQL and Redis, then start Kafka from the repository root:

```bash
sudo systemctl enable --now mysql redis-server
sudo docker compose up -d kafka
```

The Kafka configuration advertises `localhost:9092`; this deployment assumes the Spring services run directly on the same EC2 instance.

## Build backend services

Build each Spring Boot service from its service directory using Java 17:

```bash
cd ~/banking-system/account-service && bash ./mvnw -DskipTests package
cd ~/banking-system/transaction-service && bash ./mvnw -DskipTests package
cd ~/banking-system/payment-service && bash ./mvnw -DskipTests package
cd ~/banking-system/fraud-detection-service && bash ./mvnw -DskipTests package
cd ~/banking-system/notification-service && bash ./mvnw -DskipTests package
cd ~/banking-system/api-gateway && bash ./mvnw -DskipTests package
```

If the database password is supplied through an environment variable, set it when starting each database-backed service. Use Razorpay test credentials for a demo; never put real credentials in Git.

## Start services

Start the database-backed services and Kafka workers, then the API Gateway. Keep each service’s log in the Ubuntu home directory, for example `~/account.log` and `~/gateway.log`. Use modest Java heap settings on a small instance and check memory while all services are running.

The Payment Service requires `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`. Demo placeholder values allow the service to start, but real payment processing requires valid test credentials.

## Build and publish the frontend

```bash
cd ~/banking-system/frontend
npm install
npm run build
sudo cp -r dist/. /var/www/html/
```

Configure Nginx to serve `/var/www/html`, use `try_files $uri $uri/ /index.html` for the React app, and proxy `/api/` to `http://127.0.0.1:8080` while preserving the request path. Then validate and reload Nginx:

```bash
sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx
```

## Verify

Open `http://<EC2-public-IPv4>` in a browser. Create an account, search for its account number, and verify the displayed balance. Then test transactions and the other screens. Fraud Detection and Notification are Kafka workers; their successful startup does not by itself verify the full end-to-end flow.

Check service logs in `~/account.log`, `~/transaction.log`, `~/payment.log`, `~/fraud.log`, `~/notification.log`, and `~/gateway.log` when troubleshooting.

## Cost and demo limitations

A single small EC2 instance running MySQL, Kafka, Redis, and all Spring services can run low on memory. Swap helps avoid some memory failures but does not add physical RAM. Monitor AWS billing and credits; Free Tier or promotional credits do not guarantee that every resource is free.

This is an educational demo, not a production banking system. Do not use real banking data, production payment credentials, or real customer information.