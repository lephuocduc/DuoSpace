/**
 * Cloudflare Worker REST API cho DuoSpace D1 Database
 * Hỗ trợ đồng bộ dữ liệu (Sync) 2 chiều giữa Client (LocalStorage) và D1.
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-Code"
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS
    }
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
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
          bikes
        ] = await Promise.all([
          db.prepare("SELECT * FROM app_state WHERE id = 'duospace_global_state'").first(),
          db.prepare("SELECT * FROM todos ORDER BY created_at DESC").all(),
          db.prepare("SELECT * FROM transactions ORDER BY date DESC").all(),
          db.prepare("SELECT * FROM investments").all(),
          db.prepare("SELECT date, value FROM net_worth_history ORDER BY date ASC").all(),
          db.prepare("SELECT * FROM monthly_budgets").all(),
          db.prepare("SELECT date, mun, bong FROM cat_weights ORDER BY date ASC").all(),
          db.prepare("SELECT * FROM bike_maintenances ORDER BY date DESC").all()
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
              date: t.date
            })),
            incomes,
            expenses,
            investments: invList,
            netWorthHistory: netWorth.results || [],
            monthlyBudgets: budgets.results || [],
            catWeights: cats.results || [],
            bikeMaintenances: bikes.results || []
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
            statements.push(
              db.prepare(`
                INSERT INTO todos (id, title, category, user, priority, notes, done, date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              `).bind(
                id,
                item.title || "",
                item.category || "Khác",
                item.user || "Đ",
                item.priority || "medium",
                item.notes || "",
                item.done ? 1 : 0,
                item.date || new Date().toISOString()
              )
            );
          }
        }

        // Sync Incomes & Expenses
        if (Array.isArray(payload.incomes) || Array.isArray(payload.expenses)) {
          statements.push(db.prepare("DELETE FROM transactions"));
          for (const inc of (payload.incomes || [])) {
            const id = inc.id || `inc-${Math.random().toString(36).substr(2, 9)}`;
            statements.push(
              db.prepare(`
                INSERT INTO transactions (id, type, amount, description, category, user, notes, date)
                VALUES (?, 'income', ?, ?, ?, ?, ?, ?)
              `).bind(id, inc.amount || 0, inc.desc || "", inc.category || "Lương", inc.user || "Đ", inc.notes || "", inc.date || new Date().toISOString())
            );
          }
          for (const exp of (payload.expenses || [])) {
            const id = exp.id || `exp-${Math.random().toString(36).substr(2, 9)}`;
            statements.push(
              db.prepare(`
                INSERT INTO transactions (id, type, amount, description, category, user, notes, date)
                VALUES (?, 'expense', ?, ?, ?, ?, ?, ?)
              `).bind(id, exp.amount || 0, exp.desc || "", exp.category || "📦 Khác", exp.user || "Đ", exp.notes || "", exp.date || new Date().toISOString())
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
