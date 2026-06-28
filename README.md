# Almighty Web Solutions — Portfolio (Supabase Edition)

## 📁 Structure
```
almighty-portfolio/
├── backend/
│   ├── app.py                ← Flask + Supabase API
│   ├── requirements.txt
│   ├── generate_hash.py      ← Generate password hash
│   └── supabase_setup.sql    ← Run this in Supabase SQL Editor
├── frontend/
│   ├── index.html            ← Public portfolio
│   ├── admin.html            ← Admin panel
│   ├── css/style.css
│   ├── css/admin.css
│   ├── js/config.js          ← Set API_BASE here
│   ├── js/portfolio.js
│   ├── js/admin.js
│   └── images/james.jpg
└── render.yaml
```

---

## 🗄 Step 1 — Set up Supabase (free)

1. Go to https://supabase.com → Create a new project
2. Dashboard → SQL Editor → New query
3. Paste contents of `backend/supabase_setup.sql` → Run
4. Go to Project Settings → API:
   - Copy **Project URL** → `SUPABASE_URL`
   - Copy **service_role** secret key → `SUPABASE_SERVICE_KEY`

---

## 🔐 Step 2 — Generate password & reset code hashes

```bash
cd backend
python generate_hash.py
# Enter your admin password → copy the hash (ADMIN_PASSWORD_HASH)

# For RESET_CODE: pick any secret word e.g. "james@reset99"
python -c "import hashlib; print(hashlib.sha256('james@reset99'.encode()).hexdigest())"
# Copy this hash → RESET_CODE_HASH
```

---

## 🚀 Step 3 — Deploy Backend to Render.com

1. Push project to GitHub
2. Render → New Web Service → connect repo
3. Root Directory: `backend`
4. Build: `pip install -r requirements.txt`
5. Start: `gunicorn app:app --bind 0.0.0.0:$PORT`
6. Add ALL environment variables from `render.yaml`
7. Deploy → copy the Render URL

---

## 🌐 Step 4 — Deploy Frontend to Netlify

1. Open `frontend/js/config.js`
2. Set `API_BASE` to your Render URL
3. Netlify → Add site → Deploy manually → drag `frontend/` folder

---

## 🔒 Admin Features

| Feature | How |
|---------|-----|
| Login | Username + password |
| Forgot Password | Email + secret RESET_CODE → get reset token |
| Change Password | Via Settings sidebar OR forgot-pw flow → copy new hash to Render |
| Projects | Add / Edit / Delete with status |
| Stats | Dashboard showing counts per status & category |

## 📊 Project Statuses
- ✅ Done · 🔄 Ongoing · 📦 Delivered · 🏷 For Sale
