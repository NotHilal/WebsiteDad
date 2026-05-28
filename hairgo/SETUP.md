# HairGo — Setup Guide

## 1. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the entire `supabase-schema.sql` file
3. Copy your **Project URL** and **Anon Key** from Project Settings → API

## 2. Environment Variables

Edit `.env` with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_STUDIO_PASSWORD=your-secret-studio-password
```

## 3. Install & Run

```bash
npm install
npm run dev
```

## 4. Create Your Admin Account

1. Register a regular account at `/register`
2. In Supabase → Table Editor → `profiles`, find your row and change `role` from `user` to `admin`
3. Access the admin panel at `/studio` with your email, account password, and the studio password from `.env`

## 5. Routes

| URL | Description |
|-----|-------------|
| `/` | Homepage |
| `/gallery` | Haircut gallery |
| `/appointments` | Book an appointment |
| `/store` | Products & preorders |
| `/stylists` | Meet the team |
| `/login` | Sign in |
| `/register` | Create account |
| `/profile` | User dashboard (appointments, preorders, coupons) |
| `/chat` | Real-time chat with the team |
| `/studio` | **Admin login** (hidden, requires studio code) |
| `/studio/dashboard` | Admin dashboard |
| `/studio/appointments` | Manage appointments |
| `/studio/products` | Manage products |
| `/studio/gallery` | Manage gallery photos |
| `/studio/messages` | Read & reply to client messages |
| `/studio/coupons` | Create & grant discount coupons |
| `/studio/users` | Manage clients & loyalty points |

## 6. Loyalty System

- Users earn **+10 points** per confirmed appointment automatically
- Admin can **manually add/remove points** from `/studio/users`
- Create coupons in `/studio/coupons` — set a **min_points_required** for automatic eligibility
- Grant coupons manually to specific users with the Gift button

## 7. Preorder System

- Clients browse products at `/store` and click Preorder
- Their preorder is valid for **48 hours**
- They must visit the store to retrieve and pay for items
- Admin tracks active preorders in `/studio/products`

## 8. Colors

| Variable | Hex | Use |
|----------|-----|-----|
| Gold | `#C9A84C` | Primary accent |
| Rose Gold | `#C4956A` | Secondary accent |
| Near-black | `#0a0a0a` | Background |
| Charcoal | `#1a1a1a` | Cards |
