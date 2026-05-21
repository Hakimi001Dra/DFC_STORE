# DF Collection — Setup Guide

## 1. Configure Supabase credentials

Open **`supabase-config.js`** and replace the two placeholder values:

```js
export const SUPABASE_URL      = 'https://YOUR_PROJECT_REF.supabase.co'
export const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY'
```

Find these in: **Supabase Dashboard → Project Settings → API**

---

## 2. Create the database tables

Run this SQL in **Supabase → SQL Editor**:

```sql
-- Products table
create table if not exists products (
  id          bigint generated always as identity primary key,
  name        text        not null,
  price       text        not null,
  details     text,
  image_url   text,
  created_at  timestamptz default now()
);

-- Comments / reviews table
create table if not exists comments (
  id          bigint generated always as identity primary key,
  name        text        not null,
  text        text        not null,
  date        text,
  created_at  timestamptz default now()
);

-- Email subscribers table
create table if not exists subscribers (
  id          bigint generated always as identity primary key,
  email       text        not null unique,
  created_at  timestamptz default now()
);
```

---

## 3. Enable Row Level Security (RLS) policies

```sql
-- Allow anyone to read products, comments, subscribers
alter table products   enable row level security;
alter table comments   enable row level security;
alter table subscribers enable row level security;

create policy "Public read products"    on products    for select using (true);
create policy "Public insert comments"  on comments    for insert with check (true);
create policy "Public read comments"    on comments    for select using (true);
create policy "Public insert subscribers" on subscribers for insert with check (true);

-- Only authenticated users can insert/update/delete products
create policy "Auth insert products"   on products for insert with check (auth.role() = 'authenticated');
create policy "Auth update products"   on products for update using (auth.role() = 'authenticated');
create policy "Auth delete products"   on products for delete using (auth.role() = 'authenticated');
```

---

## 4. Create the Storage bucket

1. Go to **Supabase → Storage → New bucket**
2. Name it exactly: `product-images`
3. Set it to **Public**
4. Add this storage policy (SQL Editor):

```sql
create policy "Public read product-images"
  on storage.objects for select
  using ( bucket_id = 'product-images' );

create policy "Auth upload product-images"
  on storage.objects for insert
  with check ( bucket_id = 'product-images' AND auth.role() = 'authenticated' );
```

---

## 5. Create the admin user

In **Supabase → Authentication → Users → Add user**, create an email/password user for the admin panel login.

---

## 6. Run the site

Open `index.html` in a browser, **or** run a local server to avoid ES Module CORS issues:

```bash
npx serve .
```

Then visit `http://localhost:3000`

---

## Files changed from original

| File | What was fixed |
|------|---------------|
| `supabase-config.js` | **New** — single place to set credentials (both files import from here) |
| `script.js` | Fixed column names (`created_at`), added null guards, fixed SIGN IN button, improved `escapeHtml` |
| `admin.html` | Imports credentials from config, fixed column names, added session restore, added logout, fixed textarea style |
| `index.html` | Fixed SIGN IN link (was incorrectly pointing to admin.html) |
| `package.json` | Removed `firebase` (unused), added `serve` dev script |
