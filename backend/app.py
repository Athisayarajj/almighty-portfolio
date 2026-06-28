from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client, Client
import os, hashlib, secrets, datetime

app = Flask(__name__)

# ── CORS — allow all origins (or specific if FRONTEND_ORIGIN set) ─────────────
FRONTEND_ORIGIN = os.environ.get("FRONTEND_ORIGIN", "*")
CORS(app,
     origins=FRONTEND_ORIGIN,
     allow_headers=["Content-Type", "X-Auth-Token"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     supports_credentials=False)

# ── SUPABASE CLIENT ───────────────────────────────────────────────────────────
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ── ADMIN CREDENTIALS ─────────────────────────────────────────────────────────
ADMIN_USERNAME      = os.environ.get("ADMIN_USERNAME", "james")
ADMIN_EMAIL         = os.environ.get("ADMIN_EMAIL", "almightywebsolutions@gmail.com")
ADMIN_PASSWORD_HASH = os.environ.get(
    "ADMIN_PASSWORD_HASH",
    hashlib.sha256("almighty2026".encode()).hexdigest()
)
RESET_CODE_HASH = os.environ.get("RESET_CODE_HASH", "")

# ── HELPERS ───────────────────────────────────────────────────────────────────
def h(pw): return hashlib.sha256(pw.encode()).hexdigest()

def create_token():
    token = secrets.token_hex(48)
    supabase.table("sessions").insert({
        "token": token,
        "created_at": datetime.datetime.utcnow().isoformat()
    }).execute()
    return token

def validate_token(token):
    if not token: return False
    cutoff = (datetime.datetime.utcnow() - datetime.timedelta(hours=8)).isoformat()
    res = supabase.table("sessions")\
        .select("token")\
        .eq("token", token)\
        .gte("created_at", cutoff)\
        .execute()
    return len(res.data) > 0

def require_auth(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("X-Auth-Token")
        if not validate_token(token):
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated

# ── HEALTH CHECK ──────────────────────────────────────────────────────────────
@app.route("/", methods=["GET"])
def index():
    return jsonify({"status": "ok", "message": "Almighty Portfolio API is running"})

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})

# ── AUTH ROUTES ───────────────────────────────────────────────────────────────
@app.route("/api/auth/login", methods=["POST", "OPTIONS"])
def login():
    if request.method == "OPTIONS":
        return jsonify({}), 200
    data     = request.get_json() or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")
    if username != ADMIN_USERNAME or h(password) != ADMIN_PASSWORD_HASH:
        return jsonify({"error": "Invalid credentials"}), 401
    token = create_token()
    return jsonify({"token": token, "message": "Login successful"})

@app.route("/api/auth/logout", methods=["POST", "OPTIONS"])
def logout():
    if request.method == "OPTIONS":
        return jsonify({}), 200
    token = request.headers.get("X-Auth-Token")
    if token:
        supabase.table("sessions").delete().eq("token", token).execute()
    return jsonify({"message": "Logged out"})

@app.route("/api/auth/check", methods=["GET", "OPTIONS"])
def auth_check():
    if request.method == "OPTIONS":
        return jsonify({}), 200
    token = request.headers.get("X-Auth-Token")
    return jsonify({"authenticated": validate_token(token)})

@app.route("/api/auth/forgot-password", methods=["POST", "OPTIONS"])
def forgot_password():
    if request.method == "OPTIONS":
        return jsonify({}), 200
    data  = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    code  = data.get("reset_code", "").strip()
    if email != ADMIN_EMAIL.lower():
        return jsonify({"error": "Email not found"}), 404
    if not RESET_CODE_HASH or h(code) != RESET_CODE_HASH:
        return jsonify({"error": "Invalid reset code"}), 401
    reset_token = secrets.token_hex(32)
    expires = (datetime.datetime.utcnow() + datetime.timedelta(minutes=30)).isoformat()
    supabase.table("reset_tokens").insert({
        "token": reset_token, "expires_at": expires
    }).execute()
    return jsonify({"reset_token": reset_token, "message": "Verified"})

@app.route("/api/auth/change-password", methods=["POST", "OPTIONS"])
def change_password():
    if request.method == "OPTIONS":
        return jsonify({}), 200
    data        = request.get_json() or {}
    session_tok = request.headers.get("X-Auth-Token")
    reset_tok   = data.get("reset_token", "")
    new_pw      = data.get("new_password", "")
    confirm_pw  = data.get("confirm_password", "")
    authed = validate_token(session_tok)
    if not authed and reset_tok:
        now = datetime.datetime.utcnow().isoformat()
        res = supabase.table("reset_tokens")\
            .select("token").eq("token", reset_tok).gte("expires_at", now).execute()
        authed = len(res.data) > 0
        if authed:
            supabase.table("reset_tokens").delete().eq("token", reset_tok).execute()
    if not authed:
        return jsonify({"error": "Unauthorized or token expired"}), 401
    if len(new_pw) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400
    if new_pw != confirm_pw:
        return jsonify({"error": "Passwords do not match"}), 400
    return jsonify({
        "message": "Password hash generated. Update ADMIN_PASSWORD_HASH in Render.",
        "new_hash": h(new_pw)
    })

# ── PROJECT ROUTES ────────────────────────────────────────────────────────────
@app.route("/api/projects", methods=["GET", "OPTIONS"])
def get_projects():
    if request.method == "OPTIONS":
        return jsonify({}), 200
    category = request.args.get("category")
    status   = request.args.get("status")
    query    = supabase.table("projects").select("*").order("created_at", desc=True)
    if category and category != "all": query = query.eq("category", category)
    if status   and status   != "all": query = query.eq("status",   status)
    res = query.execute()
    projects = []
    for p in res.data:
        p["tags"] = [t.strip() for t in (p.get("tags") or "").split(",") if t.strip()]
        projects.append(p)
    return jsonify(projects)

@app.route("/api/projects/<int:pid>", methods=["GET", "OPTIONS"])
def get_project(pid):
    if request.method == "OPTIONS":
        return jsonify({}), 200
    res = supabase.table("projects").select("*").eq("id", pid).execute()
    if not res.data: return jsonify({"error": "Not found"}), 404
    p = res.data[0]
    p["tags"] = [t.strip() for t in (p.get("tags") or "").split(",") if t.strip()]
    return jsonify(p)

@app.route("/api/projects", methods=["POST", "OPTIONS"])
@require_auth
def create_project():
    if request.method == "OPTIONS":
        return jsonify({}), 200
    data = request.get_json() or {}
    for field in ["title", "category", "description", "status"]:
        if not data.get(field):
            return jsonify({"error": f"{field} is required"}), 400
    tags = ",".join(data["tags"]) if isinstance(data.get("tags"), list) else data.get("tags", "")
    row  = {
        "title":       data["title"],
        "category":    data["category"],
        "description": data["description"],
        "status":      data["status"],
        "url":         data.get("url", ""),
        "year":        data.get("year", str(datetime.date.today().year)),
        "tags":        tags,
        "emoji":       data.get("emoji", "🌐"),
        "img_url":     data.get("img_url", ""),
    }
    res = supabase.table("projects").insert(row).execute()
    return jsonify({"id": res.data[0]["id"], "message": "Project created"}), 201

@app.route("/api/projects/<int:pid>", methods=["PUT", "OPTIONS"])
@require_auth
def update_project(pid):
    if request.method == "OPTIONS":
        return jsonify({}), 200
    data = request.get_json() or {}
    tags = ",".join(data["tags"]) if isinstance(data.get("tags"), list) else data.get("tags", "")
    row  = {
        "title":       data.get("title"),
        "category":    data.get("category"),
        "description": data.get("description"),
        "status":      data.get("status"),
        "url":         data.get("url", ""),
        "year":        data.get("year", ""),
        "tags":        tags,
        "emoji":       data.get("emoji", "🌐"),
        "img_url":     data.get("img_url", ""),
        "updated_at":  datetime.datetime.utcnow().isoformat(),
    }
    supabase.table("projects").update(row).eq("id", pid).execute()
    return jsonify({"message": "Updated"})

@app.route("/api/projects/<int:pid>", methods=["DELETE", "OPTIONS"])
@require_auth
def delete_project(pid):
    if request.method == "OPTIONS":
        return jsonify({}), 200
    supabase.table("projects").delete().eq("id", pid).execute()
    return jsonify({"message": "Deleted"})

@app.route("/api/stats", methods=["GET", "OPTIONS"])
def get_stats():
    if request.method == "OPTIONS":
        return jsonify({}), 200
    all_p     = supabase.table("projects").select("status, category").execute().data
    total     = len(all_p)
    done      = sum(1 for p in all_p if p["status"] == "done")
    ongoing   = sum(1 for p in all_p if p["status"] == "ongoing")
    delivered = sum(1 for p in all_p if p["status"] == "delivered")
    for_sale  = sum(1 for p in all_p if p["status"] == "sale")
    cats      = list({p["category"] for p in all_p})
    return jsonify({"total": total, "done": done, "ongoing": ongoing,
                    "delivered": delivered, "for_sale": for_sale, "categories": cats})

if __name__ == "__main__":
    app.run(debug=True, port=5000)
