# 🏥 Medisynq – Patient-Doctor Dashboard (Next.js + Supabase)

A secure full-stack healthcare dashboard built with **Next.js**, **Supabase**, and **Role-Based Access Control**. Supports patient signups, doctor-managed records, secure EHR storage, appointments, and file access via signed URLs.

---

## 📦 Features

- ✅ Patient signup + file upload (EHRs)
- ✅ Doctors added via backend (admin-controlled)
- ✅ RLS-secured dashboards:
  - Patients see only their data
  - Doctors see only their patients
- ✅ Upload summaries + files per patient
- ✅ Secure logout, role-based routing
- ✅ File access via signed URLs
- ✅ Appointment scheduling & rescheduling
- 🧠 LLM-ready architecture (for future LangChain/RAG chatbot)

---

## 🔧 Local Development Setup

### 1. Clone this repo

```bash
git clone https://github.com/yourusername/medisynq-auth.git
cd medisynq-auth
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run the app locally

```bash
npm run dev
```

---

## 🧱 Supabase Setup

### ✅ Create Tables

Run the provided `supabase_setup_medisynq_final.sql` in your Supabase SQL Editor.

It includes:

- `profiles`, `records`, `appointments`
- Auto-insertion of patients into `profiles`
- Row-level security
- Signed URL access for storage

### ✅ Setup Storage

1. Go to **Storage > New Bucket**
2. Name: `ehr-files`
3. Set access to: **Private**

---

## 🚀 Deploy to Vercel

1. Push this repo to GitHub
2. Go to [https://vercel.com](https://vercel.com)
3. Import the repo and add the same environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy!

---

## 🔐 Email Auth Config (Supabase)

- Enable **Magic Link or OTP**
- Customize email templates
- Add `https://your-vercel-site.vercel.app` to redirect URLs

---

## 👩‍⚕️ Doctor Management

- Add doctors manually in Supabase:
```sql
INSERT INTO profiles (id, email, role)
VALUES ('auth_user_id', 'dr.smith@clinic.com', 'doctor');
```

---

## 🧠 Next Ideas

- Add LangChain RAG pipeline
- AI summary + entity extraction
- ChromaDB vector search per patient
- Chat interface for doctors

---

## 📬 Contact

Built by Atharv – UC San Diego (MLDS)

Let's improve healthcare with AI 💊