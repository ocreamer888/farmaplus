# FarmaPlus — Hermes WhatsApp Agent: 0 to 1 Implementation Plan

## Overview

This document is the complete implementation plan for deploying a Hermes-based AI agent on WhatsApp for FarmaPlus, the pharmacy and telemedicine service in Huacas, Guanacaste, Costa Rica. The agent handles order intake, delivery pricing, payment collection, and staff escalation — operating in Spanish and English, 24/7.

---

## Stack Decision

| Component | Tool | Rationale |
|---|---|---|
| AI Agent runtime | Hermes (Nous Research, open-source) | Native WhatsApp support, self-improving skill system, memory across conversations |
| WhatsApp connection | Baileys bridge (via Hermes gateway) | QR scan setup — no Meta Business API approval process required |
| AI model | Claude Haiku (Anthropic API) | Fast, low cost (~$0.01–0.05/day at launch volume), handles bilingual conversations |
| Product database | Google Sheets via Composio MCP | Team-editable, doctor-verified, Hermes reads natively via Google Workspace skill |
| Delivery calculation | Customer location pin → Google Maps Distance Matrix API | Automated km calculation from Huacas pharmacy to customer pin |
| Hosting | Hetzner CX22 VPS (€4.49/mo, 4GB RAM, 2 vCPU) | Community-standard for Hermes deployments, low latency to CR via Miami edge |
| Persistence | Hermes native memory (`~/.hermes/memories/`) | Survives restarts, learns from repeated interactions over time |
| Auto-start | `systemd` service via `hermes gateway enable-autostart` | Restarts automatically after reboot or crash |

**Why not Vercel:** Vercel is serverless — functions time out after 10–60 seconds and have no persistent process. Hermes requires a persistent runtime with long-lived connections (Baileys WebSocket). A VPS is the correct choice.

---

## Phase 0 — Accounts & Prerequisites

Nothing gets built until these are ready. Estimated time: 1–2 hours.

### Required accounts
- **Hetzner** — [hetzner.com](https://hetzner.com) — sign up, add a payment method, create a CX22 instance (Ubuntu 24.04 LTS)
- **Anthropic** — [console.anthropic.com](https://console.anthropic.com) — create API key, note it
- **Google Cloud** — [console.cloud.google.com](https://console.cloud.google.com) — needed to create OAuth credentials for Google Sheets access
- **Composio** — [dashboard.composio.dev](https://dashboard.composio.dev) — free account, provides the MCP bridge between Hermes and Google Sheets

### Required assets before Phase 1
- Google Sheet named `FarmaPlus — Product Catalog` with columns: `SKU | Product Name | Category | Price (USD) | Stock Status | Requires Prescription | Doctor Notes | Substitutes`
- All ~30–40 current products entered and verified by the doctor
- Pharmacy GPS coordinates confirmed (Cruce de Huacas)
- Google Maps Distance Matrix API key (free tier: 40,000 calls/month — more than enough)
- Staff WhatsApp number designated for order notifications

---

## Phase 1 — VPS Setup

Estimated time: 30 minutes.

```bash
# SSH into fresh Hetzner CX22 (Ubuntu 24.04)
ssh root@YOUR_SERVER_IP

# System prep
apt update && apt upgrade -y
apt install -y python3-pip python3-venv git tmux ufw curl

# Firewall — only SSH open at this stage
ufw allow OpenSSH
ufw enable

# Install Hermes
pip install hermes-agent

# Initialize Hermes with Claude Haiku
hermes init
# When prompted: select Anthropic → enter API key → select claude-haiku-4-5

# Install Hermes as a persistent systemd service
hermes gateway install
hermes gateway enable-autostart

# Verify service is running
systemctl status hermes-gateway
```

At this point Hermes is live and restarts automatically on reboot or crash.

---

## Phase 2 — WhatsApp Connection

Estimated time: 15 minutes.

Hermes connects to WhatsApp via a Baileys bridge — no Meta Cloud API, no webhook, no approval process. It uses the WhatsApp Web protocol.

```bash
# Install the WhatsApp gateway plugin
hermes install whatsapp-gateway

# Start the pairing flow
hermes gateway connect whatsapp
```

This generates a QR code in the terminal. Open WhatsApp on the pharmacy phone → Linked Devices → Link a Device → scan the QR. The agent is now connected to the pharmacy's number.

**Important:** The phone must stay connected to the internet (it can be off-screen, data/WiFi on). This is the same requirement as WhatsApp Web. The Baileys bridge maintains the session on the VPS — staff can still use the phone normally; the agent handles incoming messages first and escalates when needed.

---

## Phase 3 — Google Sheets Integration

Estimated time: 20 minutes.

Hermes reads the product catalog directly from Google Sheets using the Google Workspace skill via Composio.

```bash
# Install Composio CLI into Hermes
# Option A: paste this URL into the Hermes chat interface
https://composio.dev/hermes

# Option B: install directly
hermes install composio

# Authenticate with Google Sheets
hermes chat
# In the chat: "Connect to Google Sheets"
# Hermes will walk through OAuth — you approve in browser, paste back the redirect URL
```

Once authenticated, Hermes can read, search, and cross-reference the product catalog sheet by name. When a customer asks for a product, the agent queries the sheet for price, stock status, prescription requirement, and any doctor notes.

**Sheet structure (implement before this step):**

| SKU | Product Name | Category | Price (USD) | Stock | Rx Required | Doctor Notes | Substitutes |
|---|---|---|---|---|---|---|---|
| FP-001 | Paracetamol 500mg | Analgesics | 2.50 | In Stock | No | — | Ibuprofeno 400mg |
| FP-002 | Amoxicillin 500mg | Antibiotics | 8.00 | In Stock | Yes | 7-day course standard | — |

---

## Phase 4 — Delivery Calculator

Estimated time: 45 minutes (mostly the skill code).

When a customer sends a WhatsApp location pin, Hermes extracts the GPS coordinates and calculates the delivery fee automatically.

**Pricing logic:**
- Purchase under $15 USD → order rejected, minimum not met
- Purchase $15–$49.99 USD → delivery fee applies:
  - 0–3 km → $4.00 flat
  - Every km after 3 km → add $0.50
  - Example: 6 km = $4.00 + (3 × $0.50) = $5.50
- Purchase $50 USD or above → free delivery

**Custom skill (`delivery_calculator.py`):**

```python
import httpx

PHARMACY_COORDS = (-10.3456, -85.7890)  # Replace with exact Cruce de Huacas coords
GMAPS_API_KEY = "YOUR_KEY"

def calculate_delivery(customer_lat: float, customer_lng: float, order_total: float) -> dict:
    if order_total < 15:
        return {"status": "below_minimum", "message": "El pedido mínimo es $15."}
    
    if order_total >= 50:
        return {"status": "free", "fee": 0.00, "message": "¡Entrega gratis por compra mayor a $50!"}
    
    url = "https://maps.googleapis.com/maps/api/distancematrix/json"
    params = {
        "origins": f"{PHARMACY_COORDS[0]},{PHARMACY_COORDS[1]}",
        "destinations": f"{customer_lat},{customer_lng}",
        "key": GMAPS_API_KEY,
        "units": "metric"
    }
    r = httpx.get(url, params=params).json()
    distance_km = r["rows"][0]["elements"][0]["distance"]["value"] / 1000
    
    if distance_km <= 3:
        fee = 4.00
    else:
        extra_km = distance_km - 3
        fee = 4.00 + (extra_km * 0.50)
    
    return {
        "status": "calculated",
        "distance_km": round(distance_km, 1),
        "fee": round(fee, 2),
        "message": f"Distancia: {round(distance_km,1)} km — Costo de entrega: ${round(fee,2)}"
    }
```

Install this as a Hermes skill:
```bash
hermes skill install ./delivery_calculator.py
```

---

## Phase 5 — Agent Persona & System Prompt

This is the most critical configuration. The system prompt defines every behavior of the agent.

**File:** `~/.hermes/config.yaml` — add under `system_prompt`:

```yaml
system_prompt: |
  Sos el agente de atención al cliente de FarmaPlus, farmacia y servicio de telemedicina
  ubicada en el Cruce de Huacas, Guanacaste, Costa Rica.

  IDIOMA: Detectás el idioma del cliente (español o inglés) y respondés en ese idioma.
  Si el mensaje mezcla los dos, usás español.

  HORARIO: 10am a 6pm, hora de Costa Rica.
  - Dentro del horario: procesás pedidos normalmente.
  - Fuera del horario: tomás el pedido, confirmás que será procesado al día siguiente
    a partir de las 10am. Nunca prometés entrega fuera de este horario.

  FLUJO DE PEDIDO:
  1. Saludo cálido. Preguntá qué necesita.
  2. Buscá el producto en el catálogo (Google Sheets). Si no existe: informá que no
     está disponible y enviá alerta al equipo. Si hay sustituto, ofrecelo.
  3. Confirmá precio del producto desde el catálogo. Nunca inventés precios.
  4. Si el producto requiere receta: solicitá foto del comprobante con código único.
     Avisá que el equipo verificará antes de despachar.
  5. Pedí la ubicación de entrega (pin de WhatsApp).
  6. Calculá distancia y fee de entrega con la herramienta delivery_calculator.
     Mostrá el desglose al cliente y pedí confirmación.
  7. Preguntá método de pago: SINPE Móvil o tarjeta.
     - SINPE: dá el número de SINPE de FarmaPlus y el total exacto.
               Pedí foto del comprobante.
     - Tarjeta: informá que en breve el equipo enviará el link de pago.
  8. Enviá resumen completo del pedido al cliente y notificá al equipo.

  ESCALACIÓN INMEDIATA A STAFF (transferí sin intentar resolver):
  - Cliente pide teleconsulta o consulta médica
  - Cliente pide consejo médico, dosis, interacciones entre medicamentos
  - Cliente pregunta información clínica detallada sobre un medicamento
  - Cliente está molesto, frustrado, o hace una queja formal
  - Pedido no está en el catálogo y no hay sustituto
  - Cualquier situación fuera del flujo estándar de pedidos

  ESCALACIÓN: Al escalar, enviá al staff el historial completo de la conversación
  más una línea de contexto: qué necesita el cliente y por qué se escala.

  TONO: Amable, profesional, conciso. No usés emojis en exceso. Nunca inventés
  información médica. Si no sabés algo, escalá.
```

---

## Phase 6 — Staff Notification Skill

When an order is complete, or when escalation is triggered, the agent sends a structured message to the staff WhatsApp number.

**Order complete notification format:**
```
🟢 PEDIDO NUEVO — FarmaPlus
Cliente: +506 XXXX-XXXX
Productos: [lista]
Dirección: [pin enviado / descripción]
Distancia: X km
Fee entrega: $X.XX
Total productos: $XX.XX
Pago: SINPE / Tarjeta pendiente
Hora: 10:32am
---
[Comprobante adjunto si aplica]
```

**Escalation notification format:**
```
🔴 ESCALACIÓN REQUERIDA
Cliente: +506 XXXX-XXXX
Motivo: [razón específica]
Contexto: [últimos 3 turnos del chat]
Acción: Retomá la conversación directamente
```

This is implemented as a Hermes skill that fires on two triggers: `order_complete` and `escalation_required`.

---

## Phase 7 — Testing Protocol

Before going live, run through every scenario manually.

| Scenario | Expected behavior | Pass / Fail |
|---|---|---|
| Standard order, SINPE, <3km | Full flow, fee $4.00 | |
| Standard order, card, 6km | Full flow, fee $5.50, link pending | |
| Order total $52, any distance | Full flow, free delivery | |
| Order total $12 | Reject, minimum not met | |
| Product not in catalog | "Not available" + staff alert | |
| Product needs prescription | Request photo, flag for team | |
| Customer asks drug interaction | Immediate escalation |  |
| Customer asks for teleconsultation | Immediate escalation | |
| Customer message in English | Agent responds in English | |
| Order at 9pm | Takes order, confirms next-day 10am | |
| VPS reboot | Agent back online within 60 seconds | |

Run each scenario from a personal number via WhatsApp before connecting the pharmacy's number.

---

## Phase 8 — Go Live & Monitoring

```bash
# Confirm service is running
systemctl status hermes-gateway

# Watch live logs
journalctl -u hermes-gateway -f

# Backup Hermes memory and skills weekly
rsync -av ~/.hermes/memories/ ~/backups/hermes-memories-$(date +%Y%m%d)/
rsync -av ~/.hermes/skills/ ~/backups/hermes-skills-$(date +%Y%m%d)/
```

**First week:** Monitor all conversations manually. The agent will make mistakes. Every mistake is a prompt refinement — update the system prompt in `config.yaml` and restart the gateway. After 2–3 weeks the agent's skill system will have internalized the most common order patterns.

---

## Escalation Logic — Detailed Decision Tree

This section defines the exact boundary between agent and human, to be reviewed and approved by the FarmaPlus team before go-live.

```
Incoming message
│
├── Is it a standard product order? → Agent handles
├── Is it a delivery / pricing question? → Agent handles
├── Is it a payment confirmation? → Agent handles
├── Is it a complaint or frustration? → Escalate immediately
├── Is it a request for medical advice? → Escalate immediately
├── Is it a teleconsultation request? → Escalate immediately
│   (Note: FarmaPlus already offers telemedicine — agent
│    should acknowledge this and pass to the medical team,
│    not pretend it doesn't exist)
├── Is it a drug interaction / dosage question? → Escalate immediately
├── Is it about an existing order status? → Agent handles if order
│   is in memory; escalate if unclear
└── Does not fit any category? → Escalate immediately
```

The agent never says "I don't know." It either answers from the catalog or escalates to staff with full context.

---

## Ongoing Operations

| Task | Frequency | Who |
|---|---|---|
| Add new products to Google Sheet | As needed | Staff / Doctor |
| Review escalated conversations | Daily | Staff |
| Update system prompt based on gaps | Weekly (first month) | Technical lead |
| Backup `~/.hermes/` | Weekly | Automated via cron |
| Review Anthropic API costs | Monthly | Technical lead |
| Renew Hetzner VPS | Monthly | Auto-billing |

---

## Cost Summary

| Item | Cost |
|---|---|
| Hetzner CX22 VPS | ~€4.49/month |
| Anthropic Claude Haiku API | ~$5–15/month at 200 products, moderate volume |
| Google Maps Distance Matrix | Free (under 40,000 calls/month) |
| Composio (Google Sheets MCP) | Free tier |
| Hermes Agent | Free (MIT open source) |
| **Total** | **~$10–20/month** |

---

## What This Does NOT Cover (Phase 2 Scope)

These are intentionally out of scope for launch and should be addressed in a second phase:

- **Inventory sync** — the Google Sheet is manually updated. Real-time stock from a POS system requires a separate integration.
- **Prescription verification API** — currently the team verifies manually from the WhatsApp photo. Automating CCSS code verification is possible but requires regulatory review.
- **Teleconsultation booking** — the agent escalates to staff for now. A booking flow directly in WhatsApp is buildable once the telemedicine workflow is standardized.
- **Order tracking** — customers currently have no self-serve way to check order status. A simple order ID system can be added in Phase 2.
- **Analytics** — conversation volume, escalation rate, and conversion rate should be tracked from month 2 onward.
