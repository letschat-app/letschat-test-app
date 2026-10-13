# LetsChat Frontend

![React](https://img.shields.io/badge/React-19.1-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-7.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)
![Status](https://img.shields.io/badge/Status-Proprietary%20%26%20Confidential-red?style=for-the-badge)
![Author](https://img.shields.io/badge/Author-Yokeshwar-blue?style=for-the-badge)

> **Proprietary & Confidential Platform** — Modern, real-time messaging, multi-space conversations, ephemeral pulses, public communities, and smart event management.

---

## Overview

**LetsChat** is a feature-rich, high-performance Progressive Web Application (PWA) built with **React 19** and **Vite**. It delivers identity-controlled real-time messaging, sub-channel conversation spaces, 24-hour status updates (Pulses), community media feeds, and an event mediator with natural language date parsing.

---

## Key Features

### Real-Time Messaging & ChatSpaces
- **Multi-Space Conversations**: Organize group, classroom, and private chats into dedicated sub-spaces (e.g. *Announcements*, *Assignments*, *Q&A*, or *Custom Spaces*).
- **Offline-First Storage**: IndexedDB caching (`idb`) guarantees message persistence and instant loading without relying solely on network availability.
- **WebSocket Protocol**: Low-latency, bi-directional messaging with real-time delivery and read receipts.
- **Rich Media & Reactions**: Supports text, photos, video, audio voice notes, documents, polls, and reactions.

### Pulses (24-Hour Ephemeral Stories)
- **Multi-Format Pulses**: Share text, images, videos, or audio status updates.
- **24-Hour Auto Expiration**: Automatic client-side purging and IndexedDB cleanup after 24 hours.
- **Privacy & Viewer Analytics**: Detailed view counts and viewer list with relative time formatting. *(Self-views are automatically excluded from analytics).*

### Communities & Public Rooms
- **Explore & Join Communities**: Public room discovery grid with real-time member counts and common group indicators.
- **Community Media Feed**: Rich media posts, comment discussions, and interactive community creation.

### Smart Schedule & Event Mediator
- **Natural Language Parsing**: Automatically detects event dates and times from chat messages using `chrono-node`.
- **Interactive Calendar**: Smooth calendar page with event highlights, day view modals, and quick navigation back to original chat messages.

### Interactive "LetsChat" Guide
- Integrated interactive walkthrough guide to onboard users smoothly.
- **Progress Persistence**: Saved state in `localStorage` ensures seamless resumption if exited mid-convo.

### Progressive Web Application (PWA)
- Fully installable on iOS, Android, and Desktop.
- Powered by `vite-plugin-pwa` and Workbox service worker precaching.

---

## Tech Stack

| Domain | Technologies |
| :--- | :--- |
| **Framework & Build** | React 19, React Router v7, Vite 7 |
| **State & Local DB** | IndexedDB (`idb`), React Context, LocalStorage |
| **Real-time & Network** | WebSockets (`ws`), Axios, Fetch API |
| **UI & Styling** | CSS Custom Properties (Theming), Framer Motion, Tailwind CSS, Lucide React Icons |
| **Media & Utils** | Browser Image Compression, Chrono Node, Emoji Picker React, Firebase |
| **PWA & Deployment** | Vite PWA Plugin, Workbox, GitHub Pages (`gh-pages`) |

---

## Project Structure

```
src/
├── assets/             # Static assets & styles
├── components/         # Reusable UI components
│   ├── chat/           # Avatars, media viewers, message components
│   ├── modals/         # Modals (Info, Create Space, Member Actions, etc.)
│   ├── pulse/          # Story viewer, viewer list, streak badges
│   └── search/         # User search cards & community grid
├── layouts/            # Responsive ChatLayout (Desktop 3-column & Mobile views)
├── pages/              # Primary route pages
│   ├── ChatBox.jsx     # Main chat view & message container
│   ├── ChatNames.jsx   # Sidebar chat list & space navigation
│   ├── PulsesTab.jsx   # Story feed & viewer
│   ├── Search.jsx      # User discovery & community explore
│   ├── SmoothCalendar.jsx # Event schedule & calendar
│   └── Rooms.jsx       # Public room discovery
├── service/            # Business logic, WebSockets, IDB, PulseService, etc.
└── App.jsx             # Top-level routing & app providers
```

---

## Author & AI Pair Partner

- **Author**: Yokeshwar
- **AI Coding Assistant & Pair Partner**: Antigravity (Google DeepMind)

---

## Proprietary & Confidential Notice

> **Copyright © LetsChat - Yokeshwar. All Rights Reserved.**
> 
> This repository and its source code are **strictly proprietary and confidential**. 
> - **No Permission to Copy**: Unauthorized copying, cloning, modification, distribution, or reproduction of any part of this repository via any medium is strictly prohibited.
> - **No License Granted**: No open-source or commercial license is granted to any party. All rights, title, and interest in and to this software remain exclusively with Yokeshwar (LetsChat).
