# 🌍 SyrTrip Backend API

The highly scalable, production-ready backend infrastructure for the **SyrTrip** platform. This API powers the entire booking lifecycle, user interactions, and multi-channel notification systems for seamless travel and accommodation management.

---

## 🚀 Tech Stack

This project is built with modern, type-safe, and scalable web technologies:

*   **Runtime & Framework:** Node.js, Express.js
*   **Language:** TypeScript
*   **Database:** PostgreSQL (Hosted on Supabase)
*   **ORM:** Prisma
*   **Validation:** Zod
*   **Authentication:** JSON Web Tokens (JWT)
*   **Cloud Storage:** Cloudinary (Decoupled image uploads)
*   **Push Notifications:** Firebase Cloud Messaging (FCM) via `firebase-admin`
*   **Deployment:** Vercel (Serverless)

---

## ✨ Key Features

*   **Robust Authentication:** Secure JWT-based auth flows with role-based access control (Admin, Owner, Customer).
*   **Booking Lifecycle Engine:** End-to-end management of reservations (Hotels, Cars, Restaurants) with state transitions (Pending, Approved, Rejected).
*   **Multi-Channel Notifications:** Dual-layer architecture storing persistent in-app notifications in PostgreSQL while triggering real-time background Android push notifications via FCM.
*   **Optimized Media Handling:** Direct integration with Cloudinary for fast, scalable image hosting.
*   **Interactive Entities:** Fully typed implementations for user reviews, average rating calculations, and favorite toggling.

---

## 🛠️ Local Development

### 1. Prerequisites
*   [Node.js](https://nodejs.org/) (v18 or higher recommended)
*   [PostgreSQL](https://www.postgresql.org/) (Local) or a [Supabase](https://supabase.com/) project
*   A Firebase project with a generated `firebase-service-account.json`

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone [https://github.com/your-username/syrtrip-backend.git](https://github.com/your-username/syrtrip-backend.git)
cd syrtrip-backend
npm install
