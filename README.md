<div align="center">
  <img src="public/hackloumi-logo.png" alt="Hackloumi Chat Logo" width="200" />
</div>

# Hackloumi Chat 💬🚀

A **modern, privacy‑respecting chat platform** built with **Next.js, Tailwind CSS, and TypeScript**. Hackloumi Chat delivers reliable 1‑to‑1 and group messaging, a sleek web experience, and a self‑contained deployment model that runs just as happily on a laptop as it does in the cloud.

---

## ✨ Key Features

| Category                | Highlights                                                                                                     |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Registration**        | Instant sign‑up with just a username and double‑entered password—no emails or external identity providers.     |
| **Contacts**            | Mutual contact lists: adding someone automatically sends a request they must accept. Remove contacts any time. |
| **Direct Chats**        | Persistent, searchable history for all 1‑to‑1 conversations with at‑least‑once delivery guarantees.            |
| **Group Chats**         | Up to **300** participants per room, with searchable history, owner‑managed member list, and graceful exit.    |
| **Media & Rich Text**   | Send images plus bold and _italic_ text with markdown‑style shortcuts.                                         |
| **Reactions**           | Leave emoji reactions on any message.                                                                          |
| **Contact Visibility**  | View profile cards for contacts you know or fellow chat participants.                                          |
| **Deep Links**          | Stable URLs that resolve to any user or group chat — perfect for bookmarks and sharing.                        |
| **Performance Tooling** | Built‑in load‑test utility to validate throughput targets (≤ 50 msg s⁻¹).                                      |

---

## 🎨 Design System

### Modern Minimalist Aesthetic

Hackloumi Chat features a **sophisticated black and white design system** that prioritizes clarity, elegance, and modern user experience principles. The interface embraces minimalism while maintaining full functionality and accessibility.

### Color Palette

| Element                | Color                      | Usage                                        |
| ---------------------- | -------------------------- | -------------------------------------------- |
| **Primary Background** | `#000000` (Pure Black)     | Main application background                  |
| **Content Areas**      | `#0a0a0a` (Zinc-950)       | Cards, modals, and content containers        |
| **Secondary Areas**    | `#18181b` (Zinc-900)       | Sidebar, input fields, and secondary content |
| **Borders**            | `#27272a` (Zinc-800)       | Subtle element separation                    |
| **Primary Text**       | `#ffffff` (Pure White)     | Headings and primary content                 |
| **Secondary Text**     | `#a1a1aa` (Zinc-400)       | Labels, metadata, and secondary content      |
| **Accent Actions**     | `#ffffff` (White on Black) | Primary buttons and call-to-action elements  |

### Typography

- **Font Family**: Inter with system fallbacks (`-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`)
- **Font Weight**: Light (300) for elegance and readability
- **Letter Spacing**: Wide tracking for modern, spacious feel
- **Text Cases**: Strategic use of UPPERCASE for headings and labels
- **Anti-aliasing**: Smooth rendering across all devices

### Component Architecture

#### Buttons

```css
.btn-primary     /* White background, black text, primary actions */
.btn-secondary   /* Dark background, white border, secondary actions */
.btn-ghost       /* Transparent with subtle hover states */
```

#### Content Containers

```css
.card           /* Dark containers with subtle borders */
.sidebar        /* Navigation areas with consistent spacing */
.input-field    /* Form inputs with focus states */
```

#### Messaging

```css
.message-bubble-sent      /* White bubbles for sent messages */
.message-bubble-received  /* Dark bubbles for received messages */
.contact-item            /* Clean contact list items with hover states */
```

### Interaction Design

- **Transitions**: 200ms duration for all state changes
- **Hover States**: Subtle color shifts maintaining contrast
- **Focus States**: White borders for keyboard navigation
- **Active States**: Visual feedback for user interactions

### Responsive Considerations

- **Mobile-First**: Designed for all screen sizes
- **Touch-Friendly**: Adequate touch targets (44px minimum)
- **Readability**: High contrast ratios for accessibility
- **Performance**: Minimal CSS footprint with Tailwind optimization

### Custom Elements

- **Scrollbars**: Dark themed with subtle handles
- **Text Selection**: White on black for consistency
- **Loading States**: Minimal indicators matching theme
- **Error Messages**: Dark red variants maintaining aesthetic

### Design Philosophy

The design system follows these core principles:

1. **Clarity Over Decoration**: Every element serves a functional purpose
2. **Consistent Spacing**: Systematic padding and margins using Tailwind scale
3. **Accessible Contrast**: WCAG AA compliant color combinations
4. **Smooth Interactions**: Purposeful animations that enhance UX
5. **Scalable Architecture**: Component-based system for easy maintenance

This design approach creates a professional, modern interface that focuses user attention on conversations while providing an elegant, distraction-free environment for communication.

---

## 🧩 Architecture Overview

### High‑Level Flow

1. **Browser (Next.js front‑end)** establishes a WebSocket for real‑time delivery; falls back to long‑polling whenever WebSockets are blocked.
2. **Realtime Gateway (Node.js / Socket.IO)** processes commands, enforces security, and writes durable events.
3. **PostgreSQL** stores all domain entities (users, contacts, messages, groups) in ACID‑compliant tables.
4. **Search Index (PG full‑text)** enables fast lookup across conversations.

```mermaid
flowchart TD
    Client[Web UI] -- WebSocket / HTTP --> API[Realtime & REST API]
    API -- SQL --> DB[(PostgreSQL)]
    API -- Events --> WS[Socket Broadcast]
    subgraph Persistence
        DB
    end
```

> _Mermaid diagrams render directly on GitHub._

### Reliability & Delivery Guarantees

- **At‑Least‑Once Delivery** – acknowledgements travel back to the sender once the server commits the message, ensuring no silent drops.
- **Crash‑Safe Storage** – WAL‑backed PostgreSQL with automatic recovery; chat records survive container restarts.
- **Reconnect Resume** – missed events are replayed after connectivity loss using incremental cursors.

### Scalability Targets

| Metric           | Design Target                                                          |
| ---------------- | ---------------------------------------------------------------------- |
| Concurrent users | 500 – 1 000                                                            |
| Write throughput | ≤ 50 messages s⁻¹ (aggregated)                                         |
| Group fan‑out    | Server relays each group post to all online members without duplicates |

These numbers fit comfortably inside one **AWS Fargate** task with headroom for spikes.

---

## 🛠️ Deployment Topology

### ☁️ Cloud (AWS Fargate)

```
+--------------------------+
|  Amazon ALB (HTTPS)      |
+-----------+--------------+
            | 80 / 443
+-----------v--------------+
|  Fargate Service (ECS)   |
|  • Next.js SSR & API     |
|  • Socket.IO Gateway     |
|  • Embedded PostgreSQL   |
+-----------+--------------+
            | 5432 (local only)
            +-------------------- (optional) EFS volume for PG data
```

_Why single‑container?_ Contest rules ask for an "all‑in‑one" image. In production you'd usually separate the database, but this setup simplifies demos while retaining durability through EFS‑backed volumes.

### 🐳 Local Development (docker‑compose)

- **`app` service** – same image used in Fargate, exposing ports **3000** (web) & **5432** (db).
- **Volume mounts** keep chat data and _node_modules_ between runs.

```bash
docker‑compose up --build
```

---

## 📂 Project Layout

```text
hackloumi-chat/
├── src/          # All application code (frontend & backend)
│   ├── components/
│   ├── pages/
│   ├── lib/
│   └── ...
├── deploy/          # Infrastructure‑as‑Code (AWS CDK / Terraform)
│   └── ...
├── scripts/         # Helper CLI & test utilities
│   └── perf-test.sh
└── README.md        # You are here
```

---

## ⚙️ Getting Started

1. **Prerequisites**

   - Docker & Docker Compose
   - Node ≥ 18 (if you want to run outside containers)

2. **Clone & Run Locally**

```bash
git clone https://github.com/your-org/hackloumi-chat.git
cd hackloumi-chat
docker‑compose up --build
```

3. **Open** `http://localhost:3000` in your browser, create an account, add a friend, and start chatting 😊

---

## 📆 Milestone Roadmap & Checklists

Each milestone is released as its own pull request and Git tag. Tick the boxes to track progress.

### M0 – Project Scaffold 🏗️

- [x] `npx create-next-app@latest` with workspace layout and TS config
- [x] ESLint, Prettier, and Husky pre‑commit hooks
- [x] Vitest set up with a sample test
- [x] GitHub Actions workflow: lint + test

### M1 – Bare‑Minimum Chat 🔤 ✅

- [x] User registration form (username + password ×2)
- [x] Password hashed with Argon2, stored in PostgreSQL
- [x] JWT auth cookie issued on login
- [x] `/chat/[user]` page with textarea & send button
- [x] **POST** `/api/messages` persists message
- [x] **GET** `/api/messages?peer=` long‑polls for new messages

### M2 – Contacts 🗂️ ✅

- [x] Invite by username
- [x] Accept / reject invitation workflow
- [x] Contacts shown in sidebar sorted alphabetically

### M3 – Persistent History + Search 🔍 ✅

- [x] Prisma migration adds `fts` column (PostgreSQL _tsvector_)
- [x] **GET** `/api/search?q=` returns ranked matches
- [x] Search bar on top of chat list with instant results

### M4 – WebSocket Realtime ⚡ ✅

- [x] Upgrade long‑poll to WebSocket handshake
- [x] In‑memory queue delivers message to connected peers
- [x] Delivery **ACK** updates message status to _delivered_
- [x] Fallback to polling when WebSocket unsupported

### M5 – Group Chats 👥 ✅

- [x] `groups` table (`id`, `name`, `owner_id`)
- [x] Endpoints to create, rename, and delete rooms
- [x] Add / remove participants with owner approval
- [x] Broadcast fan‑out to all members over WebSocket

### M6 – Images & Formatting 🖼️

- [ ] S3 bucket + presigned **PUT** for uploads
- [ ] Markdown parsing for **bold** / _italic_ / `code`
- [ ] `<Image>` component lazy‑loads thumbnails

### M7 – Deep Links 🔗

- [ ] Route `/u/[username]` focuses a DM
- [ ] Route `/g/[id]` opens group chat (auto‑join if invited)
- [ ] Graceful 404 page when target not found

### M8 – Reactions & Profiles 😄

- [ ] Hover a message → add emoji reaction (👍 😂 ❤️ etc.)
- [ ] Display reaction counters aggregated per emoji
- [ ] `/profile/[username]` sheet shows avatar, bio, shared groups

### M9 – Performance Harness 📊

- [ ] Locust script simulates 1 000 users at 50 msg s⁻¹
- [ ] Collect metrics via `pg_stat_statements` + Node cluster stats
- [ ] Grafana dashboard with CPU, memory, p99 latency

### M10 – Infrastructure & Deployment ☁️

- [ ] Dockerfile multi‑stage: build → runtime (Node 18‑slim + PostgreSQL 16‑alpine via _supervisord_)
- [ ] `docker‑compose.yml` exposes 3000 & 5432 volumes
- [ ] Terraform provisions: VPC, ALB, Fargate task, EFS, S3 bucket, IAM roles
- [ ] Makefile with `make deploy` & `make destroy` wrappers
- [ ] Readiness & liveness probes for health checks

---

## 🤝 Contributing

Pull requests are welcome — whether they fix a typo, craft a new feature, or push the performance envelope.  
File issues on GitHub or start a discussion if you have ideas!

---

## 📝 License

**MIT** — free to use, modify, and distribute.

_Made with ♥ and a shoestring budget._
