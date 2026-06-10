"use strict";

// Cashfree credit top-ups (Phase A).
//
// Self-contained module so the provider can be swapped (Razorpay/Stripe) or a
// subscription model added later without touching server.js. Verifies tokens
// and webhooks itself; credits are granted through the existing user_credits /
// credit_events ledger via one idempotent transaction.
//
// Mounted by server.js:  app.use(createCashfreeRouter({ pool, requireAuthApi,
//   getAuthUserType, getAuthUserId, creditsStart }))

const express = require("express");
const crypto = require("crypto");

// ── Credit packages (server-defined; client only ever sends a packageId so
// the amount/credits mapping cannot be tampered with). Prices in INR. ──
const CREDIT_PACKAGES = {
  taster: {
    credits: 100,
    amount: 199,
    blurb: "Perfect for exploring Aria & meal plans",
  },
  popular: {
    credits: 300,
    amount: 499,
    blurb: "Most picked — the best value per credit",
  },
  pro: {
    credits: 750,
    amount: 999,
    blurb: "For daily practice, plans & guidance",
  },
};

const CF_API_VERSION = process.env.CASHFREE_API_VERSION || "2023-08-01";

function cfIsProd() {
  return String(process.env.CASHFREE_ENV || "sandbox").toLowerCase() === "production";
}
function cfBaseUrl() {
  return cfIsProd() ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg";
}
function cfMode() {
  return cfIsProd() ? "production" : "sandbox";
}
function cfHeaders() {
  return {
    "Content-Type": "application/json",
    "x-api-version": CF_API_VERSION,
    "x-client-id": process.env.CASHFREE_CLIENT_ID || "",
    "x-client-secret": process.env.CASHFREE_CLIENT_SECRET || "",
  };
}
function publicBaseUrl(req) {
  // Prefer an explicit public URL (needed so Cashfree can reach the webhook);
  // fall back to the request's own origin for the browser return_url.
  const env = (process.env.PUBLIC_BASE_URL || "").trim().replace(/\/+$/, "");
  if (env) return env;
  return `${req.protocol}://${req.get("host")}`;
}

function newOrderId() {
  return `sw_${Date.now()}_${crypto.randomBytes(5).toString("hex")}`;
}

module.exports = function createCashfreeRouter(deps) {
  const { pool, requireAuthApi, getAuthUserType, getAuthUserId } = deps;
  const CREDITS_START = deps.creditsStart || 50;
  const router = express.Router();

  const isConfigured = () =>
    Boolean(process.env.CASHFREE_CLIENT_ID && process.env.CASHFREE_CLIENT_SECRET);

  // Grant the order's credits exactly once. Safe to call from both the webhook
  // and the status poll — the `credited_at` guard under FOR UPDATE makes it
  // idempotent. Returns { status, balance, alreadyCredited }.
  async function grantCreditsForOrder(orderId, cfPaymentId) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const ord = await client.query(
        "SELECT * FROM credit_orders WHERE order_id = $1 FOR UPDATE",
        [orderId],
      );
      const order = ord.rows[0];
      if (!order) {
        await client.query("ROLLBACK");
        return { status: "NOT_FOUND", balance: null, alreadyCredited: false };
      }
      if (order.credited_at) {
        // Already granted — return the current balance, do nothing else.
        const bal = await client.query(
          "SELECT balance FROM user_credits WHERE auth_user_type=$1 AND auth_user_id=$2",
          [order.auth_user_type, order.auth_user_id],
        );
        await client.query("COMMIT");
        return {
          status: "PAID",
          balance: bal.rows[0] ? bal.rows[0].balance : null,
          alreadyCredited: true,
        };
      }

      const credits = order.credits;
      // Ensure the balance row exists, then add the purchased credits.
      await client.query(
        `INSERT INTO user_credits (auth_user_type, auth_user_id, email, name, balance)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (auth_user_type, auth_user_id) DO NOTHING`,
        [order.auth_user_type, order.auth_user_id, order.email, order.name, CREDITS_START],
      );
      const upd = await client.query(
        `UPDATE user_credits
            SET balance = balance + $3, updated_at = NOW()
          WHERE auth_user_type=$1 AND auth_user_id=$2
        RETURNING balance`,
        [order.auth_user_type, order.auth_user_id, credits],
      );
      const newBalance = upd.rows[0].balance;

      // Ledger row. Negative `cost` = credits added (total_spent untouched).
      await client.query(
        `INSERT INTO credit_events (auth_user_type, auth_user_id, email, name, action, cost, balance_after)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          order.auth_user_type,
          order.auth_user_id,
          order.email,
          order.name,
          `topup:${orderId}`,
          -credits,
          newBalance,
        ],
      );

      await client.query(
        `UPDATE credit_orders
            SET status='PAID', credited_at=NOW(),
                cf_payment_id=COALESCE($2, cf_payment_id), updated_at=NOW()
          WHERE order_id=$1`,
        [orderId, cfPaymentId || null],
      );

      await client.query("COMMIT");
      return { status: "PAID", balance: newBalance, alreadyCredited: false };
    } catch (err) {
      try { await client.query("ROLLBACK"); } catch (_) {}
      throw err;
    } finally {
      client.release();
    }
  }

  // List the available packages (handy for the frontend / debugging).
  router.get("/api/payments/cashfree/packages", (_req, res) => {
    res.json({ ok: true, mode: cfMode(), currency: "INR", packages: CREDIT_PACKAGES });
  });

  // Create an order + Cashfree payment session.
  router.post("/api/payments/cashfree/order", requireAuthApi, async (req, res) => {
    try {
      if (!isConfigured()) {
        return res.status(503).json({ error: "Payments are not configured." });
      }
      const packageId = String(req.body?.packageId || "").trim();
      const pkg = CREDIT_PACKAGES[packageId];
      if (!pkg) return res.status(400).json({ error: "Unknown package" });

      const type = getAuthUserType(req.user);
      const id = getAuthUserId(req.user);
      if (!id) return res.status(401).json({ error: "Auth required" });

      const orderId = newOrderId();
      const email = req.user.email || null;
      const name = req.user.name || null;

      await pool.query(
        `INSERT INTO credit_orders
           (order_id, auth_user_type, auth_user_id, email, name, package_id, credits, amount, currency, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'INR','CREATED')`,
        [orderId, type, id, email, name, packageId, pkg.credits, pkg.amount],
      );

      const base = publicBaseUrl(req);
      const cfBody = {
        order_id: orderId,
        order_amount: pkg.amount,
        order_currency: "INR",
        customer_details: {
          // Cashfree requires an alphanumeric id + a phone. Use the auth id and
          // the user's phone when we have one, else a placeholder for testing.
          customer_id: `${type}_${id}`.replace(/[^a-zA-Z0-9_]/g, ""),
          customer_phone: req.user.phone || "9999999999",
          customer_email: email || undefined,
          customer_name: name || undefined,
        },
        order_meta: {
          return_url: `${base}/care-path.html?cf_order=${orderId}`,
          notify_url: `${base}/api/payments/cashfree/webhook`,
        },
        order_note: `Stilwater credits: ${pkg.credits} (${packageId})`,
      };

      const cfRes = await fetch(`${cfBaseUrl()}/orders`, {
        method: "POST",
        headers: cfHeaders(),
        body: JSON.stringify(cfBody),
      });
      const cfJson = await cfRes.json().catch(() => ({}));
      if (!cfRes.ok || !cfJson.payment_session_id) {
        console.error("[cashfree] create order failed", cfRes.status, cfJson);
        await pool.query(
          "UPDATE credit_orders SET status='FAILED', updated_at=NOW() WHERE order_id=$1",
          [orderId],
        );
        return res.status(502).json({ error: "Could not start payment" });
      }

      await pool.query(
        "UPDATE credit_orders SET payment_session_id=$2, updated_at=NOW() WHERE order_id=$1",
        [orderId, cfJson.payment_session_id],
      );

      return res.json({
        ok: true,
        orderId,
        paymentSessionId: cfJson.payment_session_id,
        mode: cfMode(),
        credits: pkg.credits,
        amount: pkg.amount,
      });
    } catch (err) {
      console.error("[cashfree] order error", err);
      return res.status(500).json({ error: "Payment init failed" });
    }
  });

  // Cashfree webhook (source of truth). Mounted with the raw body captured by
  // express.json's verify hook (req.rawBody) so the signature checks out.
  router.post("/api/payments/cashfree/webhook", async (req, res) => {
    try {
      const signature = req.get("x-webhook-signature");
      const timestamp = req.get("x-webhook-timestamp");
      const raw = req.rawBody ? req.rawBody.toString("utf8") : JSON.stringify(req.body || {});
      const secret = process.env.CASHFREE_CLIENT_SECRET || "";

      // Signature = base64( HMAC-SHA256( timestamp + rawBody, secretKey ) ).
      const expected = crypto
        .createHmac("sha256", secret)
        .update(`${timestamp}${raw}`)
        .digest("base64");

      const ok =
        signature &&
        expected.length === signature.length &&
        crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
      if (!ok) {
        console.warn("[cashfree] webhook signature mismatch");
        return res.status(401).json({ error: "bad signature" });
      }

      const type = req.body?.type;
      const orderId = req.body?.data?.order?.order_id;
      const cfPaymentId = req.body?.data?.payment?.cf_payment_id;
      const paymentStatus = req.body?.data?.payment?.payment_status;

      if (type === "PAYMENT_SUCCESS_WEBHOOK" && paymentStatus === "SUCCESS" && orderId) {
        await grantCreditsForOrder(orderId, cfPaymentId);
      }
      // Always 200 so Cashfree stops retrying a handled event.
      return res.json({ ok: true });
    } catch (err) {
      console.error("[cashfree] webhook error", err);
      return res.status(500).json({ error: "webhook failed" });
    }
  });

  // Status poll (fallback so a missed webhook still credits on return). Verifies
  // the order with Cashfree, then grants idempotently if PAID.
  router.get("/api/payments/cashfree/status/:orderId", requireAuthApi, async (req, res) => {
    try {
      const orderId = String(req.params.orderId || "").trim();
      const type = getAuthUserType(req.user);
      const id = getAuthUserId(req.user);

      // Only let a user query their own order.
      const own = await pool.query(
        "SELECT * FROM credit_orders WHERE order_id=$1 AND auth_user_type=$2 AND auth_user_id=$3",
        [orderId, type, id],
      );
      if (!own.rows[0]) return res.status(404).json({ error: "Order not found" });

      const cfRes = await fetch(`${cfBaseUrl()}/orders/${encodeURIComponent(orderId)}`, {
        headers: cfHeaders(),
      });
      const cfJson = await cfRes.json().catch(() => ({}));
      const orderStatus = cfJson.order_status; // PAID | ACTIVE | EXPIRED | ...

      let result = { status: own.rows[0].status, balance: null };
      if (orderStatus === "PAID") {
        const granted = await grantCreditsForOrder(orderId, null);
        result = { status: "PAID", balance: granted.balance };
      } else if (orderStatus) {
        result = { status: orderStatus, balance: null };
      }
      return res.json({ ok: true, ...result });
    } catch (err) {
      console.error("[cashfree] status error", err);
      return res.status(500).json({ error: "status check failed" });
    }
  });

  return router;
};

module.exports.CREDIT_PACKAGES = CREDIT_PACKAGES;
