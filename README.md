# AI Usage Monitor

A lightweight desktop app that tracks AI API usage and costs across providers. Sits as a small bar at the edge of your screen and expands on click to show subscription breakdowns and session history.

## Why This Exists

With multiple AI subscriptions (Claude, Cursor), it's easy to lose track of how much you've used and when you're approaching limits. This app gives you an always-visible usage bar so you can pace usage across the billing cycle without constantly checking provider dashboards.

## Features

- **Always-on-top bar** — Collapsed 48px bar shows usage percentages for Claude and Cursor at a glance
- **Expandable panel** — Click to see full subscription breakdowns with progress bars and session history
- **Multi-provider tracking** — Claude and Cursor usage in one view
- **Session log** — Individual sessions with model, token count, and timestamp
- **Light/dark theme** — Toggle between themes to match your desktop

## Tech Stack

- **Desktop Framework**: Tauri 2 (Rust backend, web frontend)
- **Frontend**: React 19, TypeScript, Tailwind CSS, Vite
- **Database**: SQLite (via Tauri plugin)
- **State**: Zustand

## Status

Work in progress — core UI and tracking functionality are built. Session import and cost calculation are being refined.

## Getting Started

### Prerequisites

- Node.js 20+
- Rust toolchain (for Tauri)

### Development

```bash
npm install
npm run tauri dev
```

### Build

```bash
npm run tauri build
```

## License

MIT
