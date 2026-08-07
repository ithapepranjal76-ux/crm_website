# NexaCRM — Lead, Client & Payment CRM (HTML/CSS/JS)

A complete front-end CRM covering the flow your manager asked for:

**Lead → Follow-up → Qualification → Client Conversion → Service/Task → Quotation/Invoice → Payment**


No install, no server, no build step needed — it's plain HTML/CSS/JS.

## Why the "Call" button + pop-up after the call
This is a common CRM pattern, and it's what your manager was pointing at:

- On the **Dashboard** and on every **Lead/Client row**, a 📞 **Call** button starts a call screen (name, number, live timer — like a phone dialer).
- When you tap **End Call**, a **wrap-up pop-up** appears immediately with buttons like:
  - **Add as New Lead** (if it was an unknown number)
  - **Log Follow-up Note**
  - **Convert to Client**
  - **Create Task**
  - **Mark Lead as Lost**

The idea: right after a sales call, the rep should never have to hunt through menus to record what happened — the next action is right there. That's why it "shows the Add Lead and other buttons" after the call ends.

## Modules included
- **Leads & Follow-ups** — add leads, log follow-up notes with next-follow-up dates, filter by status
- **Lead → Client Conversion** — one click, carries history over
- **Clients** — profile with invoicing/payment summary and linked tasks
- **Services & Tasks** — a service price list, and tasks assignable to employees with status tracking
- **Quotations & Invoices** — line-item quotation builder → Draft → Sent → Accepted → convert to Invoice
- **Payment Tracking** — record payments against invoices, auto-updates Unpaid / Partially Paid / Paid
- **Notifications & Reminders** — auto-generated from follow-up dates, invoice due dates and task deadlines
- **Dashboard & Reports** — pipeline funnel, revenue collected vs invoiced, team performance
- **Role-based Access** — Admin (everything), Sales (leads/clients/tasks/billing), Employee (their own tasks + view clients), Accountant (billing/payments/reports)

## Important — before you take this live
This version stores all data in the browser's **localStorage**, so it works great as a **demo / internal prototype** and to show your manager the exact flow, but it is **not yet safe for real customer data or multiple people sharing real records**, because:

1. **Data doesn't sync between users or devices.** Each browser has its own local copy — Sales won't see what Accountant enters.
2. **Passwords are stored in plain text in the code**, only fine for a demo login screen.
3. **Anyone with browser dev tools can edit the data.**

To go properly live with real leads/clients/payments, you need a backend before launch:
- A real database (e.g. MySQL/PostgreSQL/MongoDB) instead of localStorage
- A server (Node.js/PHP/Django etc.) with proper login + password hashing
- API endpoints this same front-end can be pointed at (the screens and logic won't need to change much — just swap `localStorage` calls for API calls)

If you tell me which backend/hosting you're planning (e.g. plain PHP+MySQL on shared hosting, or Node.js), I can help you wire this exact UI up to it.

## File structure
```
index.html          → Login screen
dashboard.html       → Main app (all modules + modals)
css/style.css         → All styling
js/data.js            → Data storage layer + demo seed data
js/app.js             → All app logic (leads, clients, tasks, billing, payments, call feature)
```
