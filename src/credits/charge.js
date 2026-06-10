"use strict";

// Server-side credit enforcement.
//
// Charging happens HERE, inside the request, atomically — the client can no
// longer bypass it. Usage in server.js:
//   const { charge } = require("./src/credits/charge")({ pool, getAuthUserType,
//     getAuthUserId, creditsStart: CREDITS_START });
//   app.post("/api/stilwater/chat", requireAuthApi, charge("aria_chat"), handler);
//
// Behaviour: deduct BEFORE the handler runs; if the balance is too low, return
// 402 and never run the handler. The new balance is sent back in an
// `X-Credits-Balance` header (so the client badge can sync, SSE included). If
// the request finishes with an error status (>= 400) — e.g. the upstream LLM
// failed before any value was delivered — the charge is automatically refunded.
// A started stream (status 200) keeps the charge.

module.exports = function createCreditCharger(deps) {
  const { pool, getAuthUserType, getAuthUserId } = deps;
  const CREDITS_START = deps.creditsStart || 50;

  // Server-owned cost per action. Anything not listed defaults to 1.
  const COST_BY_ACTION = {
    aria_chat: 1,
    nutrition_chat: 1,
    chronic_chat: 1,
    recipes: 2,
    meal_plan_day: 3,
    meal_plan_weekly: 5,
  };

  function costFor(action) {
    return Object.prototype.hasOwnProperty.call(COST_BY_ACTION, action)
      ? COST_BY_ACTION[action]
      : 1;
  }

  // Atomic deduct under a row lock so concurrent requests can't overdraw.
  // Returns { ok:true, balance } or { ok:false, reason:"insufficient", balance }.
  async function deduct(type, id, email, name, action, cost) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO user_credits (auth_user_type, auth_user_id, email, name, balance)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (auth_user_type, auth_user_id) DO NOTHING`,
        [type, id, email, name, CREDITS_START],
      );
      const sel = await client.query(
        `SELECT balance FROM user_credits
          WHERE auth_user_type=$1 AND auth_user_id=$2 FOR UPDATE`,
        [type, id],
      );
      const balance = sel.rows[0] ? sel.rows[0].balance : CREDITS_START;
      if (balance < cost) {
        await client.query("ROLLBACK");
        return { ok: false, reason: "insufficient", balance };
      }
      const after = balance - cost;
      await client.query(
        `UPDATE user_credits
            SET balance=$3, total_spent=total_spent+$4,
                email=COALESCE($5,email), name=COALESCE($6,name), updated_at=NOW()
          WHERE auth_user_type=$1 AND auth_user_id=$2`,
        [type, id, after, cost, email, name],
      );
      await client.query(
        `INSERT INTO credit_events (auth_user_type, auth_user_id, email, name, action, cost, balance_after)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [type, id, email, name, action, cost, after],
      );
      await client.query("COMMIT");
      return { ok: true, balance: after };
    } catch (err) {
      try { await client.query("ROLLBACK"); } catch (_) {}
      throw err;
    } finally {
      client.release();
    }
  }

  // Give the credits back (request failed before delivering value).
  async function refund(type, id, email, name, action, cost) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const sel = await client.query(
        `SELECT balance FROM user_credits
          WHERE auth_user_type=$1 AND auth_user_id=$2 FOR UPDATE`,
        [type, id],
      );
      if (!sel.rows[0]) { await client.query("ROLLBACK"); return; }
      const after = sel.rows[0].balance + cost;
      await client.query(
        `UPDATE user_credits
            SET balance=$3, total_spent=GREATEST(0, total_spent-$4), updated_at=NOW()
          WHERE auth_user_type=$1 AND auth_user_id=$2`,
        [type, id, after, cost],
      );
      await client.query(
        `INSERT INTO credit_events (auth_user_type, auth_user_id, email, name, action, cost, balance_after)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [type, id, email, name, "refund:" + action, -cost, after],
      );
      await client.query("COMMIT");
    } catch (err) {
      try { await client.query("ROLLBACK"); } catch (_) {}
      console.error("[credits] refund failed:", err.message);
    } finally {
      client.release();
    }
  }

  // Middleware factory. `action` is fixed by the route (never from the client).
  function charge(action) {
    return async function (req, res, next) {
      try {
        const type = getAuthUserType(req.user);
        const id = getAuthUserId(req.user);
        if (!id) return res.status(401).json({ error: "Authentication required" });
        const email = req.user.email || null;
        const name = req.user.name || null;
        const cost = costFor(action);

        const result = await deduct(type, id, email, name, action, cost);
        if (!result.ok) {
          return res.status(402).json({
            error: "insufficient_credits",
            needed: cost,
            balance: result.balance,
          });
        }

        // Let the client sync its badge. Set before the handler so it survives
        // an SSE writeHead().
        res.setHeader("X-Credits-Balance", String(result.balance));

        // Auto-refund on a failed request (error status, no value delivered).
        let settled = false;
        res.once("finish", function () {
          if (settled) return;
          settled = true;
          if (res.statusCode >= 400) {
            refund(type, id, email, name, action, cost).catch(function () {});
          }
        });

        return next();
      } catch (err) {
        console.error("[credits] charge failed:", err);
        return res.status(500).json({ error: "Credit charge failed" });
      }
    };
  }

  return { charge, costFor, COST_BY_ACTION };
};
