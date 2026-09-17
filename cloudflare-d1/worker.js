/**
 * Cloudflare Worker REST API cho DuoSpace D1 Database
 * Hỗ trợ đồng bộ dữ liệu (Sync) 2 chiều giữa Client (LocalStorage) và D1.
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-Code, X-App-Secret"
};

// Cấu hình bảo mật DuoSpace
const FIREBASE_PROJECT_ID = "duospace-94616";
const ALLOWED_EMAILS = [
  "leducst1@gmail.com",
  "suongtranst1@gmail.com"
];

// Cache Google Public Keys trong bộ nhớ Worker instance
let cachedJwks = null;
let cachedJwksExpiry = 0;

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS
    }
  });
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function base64UrlToUint8Array(str) {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getGoogleJwks() {
  const now = Date.now();
  if (cachedJwks && now < cachedJwksExpiry) {
    return cachedJwks;
  }
  const res = await fetch("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com");
  if (!res.ok) {
    throw new Error(`Failed to fetch Google JWKS: ${res.status}`);
  }
  const jwks = await res.json();
  // Cache trong 1 giờ
  cachedJwks = jwks;
  cachedJwksExpiry = now + 3600 * 1000;
  return jwks;
}

/**
 * Xác thực Firebase Auth ID Token với Google public certificates
 * Đảm bảo: chữ ký đúng RS256, chưa hết hạn, đúng project, và email thuộc Whitelist.
 */
async function authenticateRequest(request, env) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "Unauthorized: Missing or invalid Authorization header (Bearer token required)" };
  }

  const token = authHeader.substring(7).trim();
  const parts = token.split(".");
  if (parts.length !== 3) {
    return { ok: false, status: 401, error: "Unauthorized: Invalid JWT format" };
  }

  let header, payload;
  try {
    header = JSON.parse(base64UrlDecode(parts[0]));
    payload = JSON.parse(base64UrlDecode(parts[1]));
  } catch (e) {
    return { ok: false, status: 401, error: "Unauthorized: Malformed JWT token" };
  }

  // 1. Kiểm tra claims cơ bản
  const nowSec = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp < nowSec) {
    return { ok: false, status: 401, error: "Unauthorized: Token has expired" };
  }

  const expectedIssuer = `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`;
  if (payload.iss !== expectedIssuer) {
    return { ok: false, status: 401, error: "Unauthorized: Invalid token issuer" };
  }

  if (payload.aud !== FIREBASE_PROJECT_ID) {
    return { ok: false, status: 401, error: "Unauthorized: Invalid token audience" };
  }

  // 2. Kiểm tra email trong Whitelist (Chỉ Đức và Sương)
  const userEmail = (payload.email || "").toLowerCase().trim();
  if (!userEmail || !ALLOWED_EMAILS.includes(userEmail)) {
    return { ok: false, status: 403, error: `Forbidden: Email '${userEmail}' is not authorized to access DuoSpace database` };
  }

  // 3. Xác thực chữ ký mã hóa RS256 với Google Public JWKS
  try {
    const jwks = await getGoogleJwks();
    const keyMatch = jwks.keys?.find(k => k.kid === header.kid);
    if (!keyMatch) {
      return { ok: false, status: 401, error: "Unauthorized: Unknown signing key kid" };
    }

    const cryptoKey = await crypto.subtle.importKey(
      "jwk",
      keyMatch,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const encoder = new TextEncoder();
    const dataToVerify = encoder.encode(`${parts[0]}.${parts[1]}`);
    const signatureBytes = base64UrlToUint8Array(parts[2]);

    const isValid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      cryptoKey,
      signatureBytes,
      dataToVerify
    );

    if (!isValid) {
      return { ok: false, status: 401, error: "Unauthorized: Invalid token signature" };
    }
  } catch (err) {
    console.error("Token signature verification failed:", err);
    return { ok: false, status: 401, error: `Unauthorized: Token verification failed (${err.message})` };
  }

  return { ok: true, user: payload };
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // Xác thực Google Firebase Auth Token (Chỉ Đức & Sương)
    const authResult = await authenticateRequest(request, env);
    if (!authResult.ok) {
      return jsonResponse({ error: authResult.error }, authResult.status);
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const db = env.DB || env.duospace_db; // Binding Cloudflare D1

    if (!db) {
      return jsonResponse({ error: "D1 database binding 'DB' hoặc 'duospace_db' is missing" }, 500);
    }

    try {
      // 1. GET /api/sync: Lấy toàn bộ dữ liệu từ D1 về client (merge với local)
      if (request.method === "GET" && path === "/api/sync") {
        const [
          appState,
          todos,
          transactions,
          investments,
          netWorth,
          budgets,
          cats,
          bikes,
          logs,
          healthLogs
        ] = await Promise.all([
          db.prepare("SELECT * FROM app_state WHERE id = 'duospace_global_state'").first(),
          db.prepare("SELECT * FROM todos ORDER BY created_at DESC").all(),
          db.prepare("SELECT * FROM transactions ORDER BY date DESC, created_at DESC").all(),
          db.prepare("SELECT * FROM investments").all(),
          db.prepare("SELECT date, value FROM net_worth_history ORDER BY date ASC").all(),
          db.prepare("SELECT * FROM monthly_budgets").all(),
          db.prepare("SELECT date, mun, bong FROM cat_weights ORDER BY date ASC").all(),
          db.prepare("SELECT * FROM bike_maintenances ORDER BY date DESC").all(),
          db.prepare("SELECT id, title, notes, type, date FROM system_logs ORDER BY date DESC LIMIT 200").all(),
          db.prepare("SELECT * FROM health_logs ORDER BY date DESC").all()
        ]);

        const expenses = [];
        const incomes = [];
        for (const t of (transactions.results || [])) {
          const item = {
            id: t.id,
            amount: t.amount,
            desc: t.description,
            user: t.user,
            notes: t.notes || "",
            date: t.date,
            createdAt: t.created_at || t.date,
            category: t.category || ""
          };
          if (t.type === "income") incomes.push(item);
          else expenses.push(item);
        }

        const invList = (investments.results || []).map(i => ({
          name: i.name,
          type: i.type,
          quantity: i.quantity,
          buyPrice: i.buy_price,
          currentPrice: i.current_price,
          isUsd: Boolean(i.is_usd),
          targetWeight: i.target_weight,
          notes: i.notes || "",
          purchases: i.purchases_json ? JSON.parse(i.purchases_json) : [],
          priceSource: i.price_source_json ? JSON.parse(i.price_source_json) : null
        }));

        let parsedSettings = {};
        if (appState && appState.settings_json) {
          try { parsedSettings = JSON.parse(appState.settings_json); } catch(e){}
        }

        return jsonResponse({
          success: true,
          data: {
            usdRate: appState?.usd_rate || 25400,
            settings: parsedSettings,
            todos: (todos.results || []).map(t => ({
              id: t.id,
              title: t.title,
              category: t.category,
              user: t.user,
              priority: t.priority,
              notes: t.notes || "",
              done: Boolean(t.done),
              date: t.date,
              createdAt: t.created_at || t.date
            })),
            incomes,
            expenses,
            investments: invList,
            netWorthHistory: netWorth.results || [],
            monthlyBudgets: budgets.results || [],
            catWeights: cats.results || [],
            bikeMaintenances: bikes.results || [],
            healthLogs: (healthLogs.results || []).map(h => ({
              id: h.id,
              user: h.user,
              date: h.date,
              weight: h.weight,
              height: h.height,
              waterMl: h.water_ml,
              steps: h.steps,
              notes: h.notes || "",
              createdAt: h.created_at
            })),
            logs: (logs.results || []).map(l => ({
              id: l.id,
              title: l.title,
              notes: l.notes || "",
              type: l.type || "system",
              date: l.date
            }))
          }
        });
      }

      // 2. POST /api/sync: Đồng bộ toàn bộ state từ client lên D1 (batch transaction)
      if (request.method === "POST" && path === "/api/sync") {
        const payload = await request.json();
        const userCode = request.headers.get("X-User-Code") || payload.userCode || "Đ";
        const statements = [];

        // Save app state
        if (payload.settings || payload.usdRate) {
          statements.push(
            db.prepare(`
              INSERT INTO app_state (id, usd_rate, settings_json, updated_by, updated_at)
              VALUES ('duospace_global_state', ?, ?, ?, CURRENT_TIMESTAMP)
              ON CONFLICT(id) DO UPDATE SET
                usd_rate = excluded.usd_rate,
                settings_json = excluded.settings_json,
                updated_by = excluded.updated_by,
                updated_at = CURRENT_TIMESTAMP
            `).bind(
              payload.usdRate || 25400,
              JSON.stringify(payload.settings || {}),
              userCode
            )
          );
        }

        // Sync Todos
        if (Array.isArray(payload.todos)) {
          statements.push(db.prepare("DELETE FROM todos"));
          for (const item of payload.todos) {
            const id = item.id || `todo-${Math.random().toString(36).substr(2, 9)}`;
            const createdAt = item.createdAt || item.date || new Date().toISOString();
            statements.push(
              db.prepare(`
                INSERT INTO todos (id, title, category, user, priority, notes, done, date, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              `).bind(
                id,
                item.title || "",
                item.category || "Khác",
                item.user || "Đ",
                item.priority || "medium",
                item.notes || "",
                item.done ? 1 : 0,
                item.date || new Date().toISOString(),
                createdAt
              )
            );
          }
        }

        // Sync Incomes & Expenses
        if (Array.isArray(payload.incomes) || Array.isArray(payload.expenses)) {
          statements.push(db.prepare("DELETE FROM transactions"));
          for (const inc of (payload.incomes || [])) {
            const id = inc.id || `inc-${Math.random().toString(36).substr(2, 9)}`;
            const createdAt = inc.createdAt || inc.date || new Date().toISOString();
            statements.push(
              db.prepare(`
                INSERT INTO transactions (id, type, amount, description, category, user, notes, date, created_at)
                VALUES (?, 'income', ?, ?, ?, ?, ?, ?, ?)
              `).bind(id, inc.amount || 0, inc.desc || "", inc.category || "Lương", inc.user || "Đ", inc.notes || "", inc.date || new Date().toISOString(), createdAt)
            );
          }
          for (const exp of (payload.expenses || [])) {
            const id = exp.id || `exp-${Math.random().toString(36).substr(2, 9)}`;
            const createdAt = exp.createdAt || exp.date || new Date().toISOString();
            statements.push(
              db.prepare(`
                INSERT INTO transactions (id, type, amount, description, category, user, notes, date, created_at)
                VALUES (?, 'expense', ?, ?, ?, ?, ?, ?, ?)
              `).bind(id, exp.amount || 0, exp.desc || "", exp.category || "📦 Khác", exp.user || "Đ", exp.notes || "", exp.date || new Date().toISOString(), createdAt)
            );
          }
        }

        // Sync Investments
        if (Array.isArray(payload.investments)) {
          statements.push(db.prepare("DELETE FROM investments"));
          for (const inv of payload.investments) {
            const id = inv.id || `inv-${Math.random().toString(36).substr(2, 9)}`;
            statements.push(
              db.prepare(`
                INSERT INTO investments (id, name, type, quantity, buy_price, current_price, is_usd, target_weight, notes, purchases_json, price_source_json, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
              `).bind(
                id,
                inv.name || "",
                inv.type || "",
                inv.quantity || 0,
                inv.buyPrice || 0,
                inv.currentPrice || 0,
                inv.isUsd ? 1 : 0,
                inv.targetWeight || 0,
                inv.notes || "",
                JSON.stringify(inv.purchases || []),
                JSON.stringify(inv.priceSource || null)
              )
            );
          }
        }

        // Sync Net Worth History
        if (Array.isArray(payload.netWorthHistory)) {
          statements.push(db.prepare("DELETE FROM net_worth_history"));
          for (const nw of payload.netWorthHistory) {
            if (nw.date && nw.value !== undefined) {
              statements.push(
                db.prepare(`
                  INSERT INTO net_worth_history (date, value)
                  VALUES (?, ?)
                `).bind(nw.date, nw.value)
              );
            }
          }
        }

        // Sync Monthly Budgets
        if (Array.isArray(payload.monthlyBudgets)) {
          statements.push(db.prepare("DELETE FROM monthly_budgets"));
          for (const b of payload.monthlyBudgets) {
            if (b.month) {
              statements.push(
                db.prepare(`
                  INSERT INTO monthly_budgets (month, budget, spent, updated_at)
                  VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                `).bind(b.month, b.budget || 0, b.spent || 0)
              );
            }
          }
        }

        // Sync Cat Weights
        if (Array.isArray(payload.catWeights)) {
          statements.push(db.prepare("DELETE FROM cat_weights"));
          for (const c of payload.catWeights) {
            if (c.date) {
              statements.push(
                db.prepare(`
                  INSERT INTO cat_weights (date, mun, bong)
                  VALUES (?, ?, ?)
                `).bind(c.date, c.mun || 0, c.bong || 0)
              );
            }
          }
        }

        // Sync Bike Maintenances
        if (Array.isArray(payload.bikeMaintenances)) {
          statements.push(db.prepare("DELETE FROM bike_maintenances"));
          for (const bm of payload.bikeMaintenances) {
            const id = bm.id || `bike-${Math.random().toString(36).substr(2, 9)}`;
            statements.push(
              db.prepare(`
                INSERT INTO bike_maintenances (id, bike, title, odo, cost, date, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?)
              `).bind(id, bm.bike || "NMAX", bm.title || "", bm.odo || 0, bm.cost || 0, bm.date || "", bm.notes || "")
            );
          }
        }

        // Sync Health Logs
        if (Array.isArray(payload.healthLogs)) {
          statements.push(db.prepare("DELETE FROM health_logs"));
          for (const h of payload.healthLogs) {
            const id = h.id || `health-${Math.random().toString(36).substr(2, 9)}`;
            const createdAt = h.createdAt || h.date || new Date().toISOString();
            statements.push(
              db.prepare(`
                INSERT INTO health_logs (id, user, date, weight, height, water_ml, steps, notes, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              `).bind(
                id,
                h.user || "Đ",
                h.date || new Date().toISOString().slice(0, 10),
                h.weight !== undefined && h.weight !== null ? Number(h.weight) : null,
                h.height !== undefined && h.height !== null ? Number(h.height) : null,
                Number(h.waterMl) || 0,
                Number(h.steps) || 0,
                h.notes || "",
                createdAt
              )
            );
          }
        }

        // Sync System Logs
        if (Array.isArray(payload.logs)) {
          statements.push(db.prepare("DELETE FROM system_logs"));
          for (const l of payload.logs.slice(-200)) {
            const id = l.id || `log-${Math.random().toString(36).substr(2, 9)}`;
            statements.push(
              db.prepare(`
                INSERT INTO system_logs (id, title, notes, type, date)
                VALUES (?, ?, ?, ?, ?)
              `).bind(id, l.title || "", l.notes || "", l.type || "system", l.date || new Date().toISOString())
            );
          }
        }

        // Execute batch atomic transaction in D1
        if (statements.length > 0) {
          await db.batch(statements);
        }

        return jsonResponse({ success: true, message: "Sync successful" });
      }

      return jsonResponse({ error: "Endpoint not found" }, 404);
    } catch (error) {
      return jsonResponse({ error: error.message || String(error) }, 500);
    }
  }
};
