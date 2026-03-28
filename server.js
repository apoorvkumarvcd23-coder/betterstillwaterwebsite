require("dotenv").config();
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");
const path = require("path");
const cors = require("cors");
const { Pool } = require("pg");
const PgSession = require("connect-pg-simple")(session);

const app = express();
const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;

const DEFAULT_ADMIN_EMAILS = new Set(["amar@stillwater.you"]);

const isAdminEmail = (email) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) return false;

  if (DEFAULT_ADMIN_EMAILS.has(normalizedEmail)) {
    return true;
  }

  const envAdmins = String(process.env.ADMIN_EMAIL || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return envAdmins.includes(normalizedEmail);
};

if (!DATABASE_URL) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const isProd = process.env.NODE_ENV === "production";
const rawCookieDomain = (process.env.COOKIE_DOMAIN || "").trim();
const cookieDomain =
  rawCookieDomain && !/\.?(onrender\.com)$/i.test(rawCookieDomain)
    ? rawCookieDomain
    : undefined;

if (rawCookieDomain && !cookieDomain) {
  console.warn(
    "COOKIE_DOMAIN is set to a shared domain and will be ignored. Using host-only session cookies.",
  );
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: isProd ? { rejectUnauthorized: false } : false,
});

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3002")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (isProd) {
  app.set("trust proxy", 1);
}

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT,
      role TEXT DEFAULT 'customer'
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users_phone (
      id BIGSERIAL PRIMARY KEY,
      phone TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'customer',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS career_applications (
      id BIGSERIAL PRIMARY KEY,
      first_name TEXT,
      last_name TEXT,
      email TEXT,
      linkedin_url TEXT,
      role TEXT,
      message TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS intake_submissions (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      age INTEGER NOT NULL,
      chronic_conditions TEXT NOT NULL DEFAULT '[]',
      eyesight_issues BOOLEAN NOT NULL DEFAULT FALSE,
      eye_power TEXT DEFAULT '',
      relation TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_intake_submissions_phone
    ON intake_submissions (phone)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_intake_submissions_created_at
    ON intake_submissions (created_at DESC)
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  await pool.query(`
    INSERT INTO settings (key, value) VALUES
      ('fundraising_amount', '1250000'),
      ('waitlist_count', '842'),
      ('centres_count', '40K+'),
      ('tourists_count', '600K'),
      ('providers_count', '4'),
      ('authenticity_pct', '100%'),
      ('phone_user_count', '0')
    ON CONFLICT (key) DO NOTHING
  `);
}

async function incrementPhoneUserCount() {
  await pool.query(
    "INSERT INTO settings (key, value) VALUES ('phone_user_count', '1') ON CONFLICT (key) DO UPDATE SET value = (settings.value::int + 1)::text",
  );
}

async function incrementWaitlistCount() {
  await pool.query(
    "UPDATE settings SET value = (value::int + 1)::text WHERE key = 'waitlist_count'",
  );
}

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      try {
        const { hostname } = new URL(origin);
        if (
          hostname === "stillwater.you" ||
          hostname.endsWith(".stillwater.you")
        ) {
          return callback(null, true);
        }
      } catch (err) {
        // If origin is not a valid URL, fall through to rejection.
      }

      return callback(new Error("CORS not allowed"), false);
    },
    credentials: true,
  }),
);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get("/favicon.ico", (_req, res) => {
  // Keep browser console clean even when no explicit favicon asset is shipped.
  res.status(204).end();
});

app.get(/^\/wellness-details-(.+)$/, (req, res) => {
  const mobile = encodeURIComponent(String(req.params[0] || "").trim());
  if (!mobile) {
    return res.redirect("/intake.html");
  }
  return res.redirect(`/intake.html?phone=${mobile}`);
});

app.get(/^\/recommendation(?:\/.*)?$/, (_req, res) => {
  return res.redirect("/intake.html");
});

const ALLOWED_CHRONIC_CONDITIONS = new Set([
  "diabetes",
  "hypertension",
  "depression",
  "anxiety",
  "sleep_issues",
]);

const toBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes";
  }
  return !!value;
};

// Session Configuration
app.use(
  session({
    store: new PgSession({
      pool,
      tableName: "session",
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || "stillwater-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: "lax",
      secure: isProd,
      domain: cookieDomain,
    },
  }),
);

// Passport Configuration
app.use(passport.initialize());
app.use(passport.session());

// Build the OAuth callback URL — use absolute URL in production
const CALLBACK_URL = process.env.BASE_URL
  ? `${process.env.BASE_URL}/auth/google/callback`
  : "/auth/google/callback";

// Avoid crashes if Google OAuth credentials aren't set up yet
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: CALLBACK_URL,
      },
      async function (accessToken, refreshToken, profile, cb) {
        try {
          const email =
            profile.emails && profile.emails.length > 0
              ? profile.emails[0].value
              : null;
          const userIsAdmin = isAdminEmail(email);

          const existing = await pool.query(
            "SELECT * FROM users WHERE id = $1",
            [profile.id],
          );
          const row = existing.rows[0];

          if (row) {
            if (userIsAdmin && row.role !== "admin") {
              const updated = await pool.query(
                "UPDATE users SET role = 'admin' WHERE id = $1 RETURNING *",
                [profile.id],
              );
              return cb(null, updated.rows[0]);
            }
            return cb(null, row);
          }

          const role = userIsAdmin ? "admin" : "customer";
          const user = {
            id: profile.id,
            name: profile.displayName,
            email: email,
            role: role,
          };

          await pool.query(
            "INSERT INTO users (id, name, email, role) VALUES ($1, $2, $3, $4)",
            [user.id, user.name, user.email, user.role],
          );

          await incrementWaitlistCount();

          return cb(null, user);
        } catch (err) {
          return cb(err);
        }
      },
    ),
  );
} else {
  console.warn(
    "WARNING: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing. OAuth will not work.",
  );
}

// Passport Local Strategy for Phone/Password Authentication
passport.use(
  new LocalStrategy(
    {
      usernameField: "phone",
      passwordField: "password",
    },
    async (phone, password, done) => {
      try {
        const result = await pool.query(
          "SELECT * FROM users_phone WHERE phone = $1",
          [phone],
        );
        const user = result.rows[0];

        if (!user) {
          return done(null, false, { message: "Phone number not found" });
        }

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
          return done(null, false, { message: "Incorrect password" });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    },
  ),
);

// Serialize/deserialize for OAuth and phone-based users
passport.serializeUser((user, done) => {
  const type = user && user.phone ? "phone" : "oauth";
  done(null, { id: user.id, type });
});

passport.deserializeUser(async (userWithType, done) => {
  try {
    if (userWithType.type === "phone") {
      const result = await pool.query(
        "SELECT * FROM users_phone WHERE id = $1",
        [userWithType.id],
      );
      return done(null, result.rows[0] || null);
    }

    const result = await pool.query("SELECT * FROM users WHERE id = $1", [
      userWithType.id,
    ]);
    return done(null, result.rows[0] || null);
  } catch (err) {
    return done(err, null);
  }
});

// === RBAC MIDDLEWARE ===

// Check for specific role, preventing access otherwise with a 403 Forbidden.
const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.redirect("/auth.html");
    }
    if (req.user.role !== role) {
      return res.status(403).send(`
        <div style="font-family: 'Inter', sans-serif; text-align: center; margin-top: 10rem;">
          <h2 style="color: #031418; font-size: 3rem;">403 Forbidden</h2>
          <p style="color: #666; margin-bottom: 2rem;">You do not have administrative privileges to access The Bridge.</p>
          <a href="/portal.html" style="background:#00E5FF; color:#031418; padding: 1rem 2rem; text-decoration: none; border-radius: 4px; font-weight: 500;">Return to Portal</a>
        </div>
      `);
    }
    next();
  };
};

// Standard login check
const requireAuth = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/auth.html");
  }
  next();
};

// === PROTECTED ROUTES ===

// These must be defined before express.static so that it intercepts the file delivery
app.get("/admin.html", requireRole("admin"), (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

// Route to handle the manual fund update from the Admin dashboard
app.post("/admin/update-funds", requireRole("admin"), async (req, res) => {
  const newAmount = req.body.fundAmount;
  if (!newAmount || isNaN(newAmount)) {
    return res.status(400).send("Invalid fund amount provided.");
  }

  try {
    await pool.query(
      "UPDATE settings SET value = $1 WHERE key = 'fundraising_amount'",
      [newAmount.toString()],
    );
    res.redirect("/admin.html");
  } catch (err) {
    console.error("Failed to update fundraising amount:", err);
    res.status(500).send("Internal Server Error");
  }
});

// Route to handle the manual waitlist count update from the Admin dashboard
app.post("/admin/update-waitlist", requireRole("admin"), async (req, res) => {
  const newCount = req.body.waitlistCount;
  if (!newCount || isNaN(newCount)) {
    return res.status(400).send("Invalid waitlist count provided.");
  }

  try {
    await pool.query(
      "UPDATE settings SET value = $1 WHERE key = 'waitlist_count'",
      [newCount.toString()],
    );
    res.redirect("/admin.html");
  } catch (err) {
    console.error("Failed to update waitlist count:", err);
    res.status(500).send("Internal Server Error");
  }
});

// Route to handle trust indicators update from the Admin dashboard
app.post(
  "/admin/update-trust-stats",
  requireRole("admin"),
  async (req, res) => {
    const { centresCount, touristsCount, providersCount, authenticityPct } =
      req.body;

    if (
      !centresCount ||
      !touristsCount ||
      !providersCount ||
      !authenticityPct
    ) {
      return res.status(400).send("All trust indicator fields are required.");
    }

    try {
      await pool.query(
        "UPDATE settings SET value = $1 WHERE key = 'centres_count'",
        [centresCount],
      );
      await pool.query(
        "UPDATE settings SET value = $1 WHERE key = 'tourists_count'",
        [touristsCount],
      );
      await pool.query(
        "UPDATE settings SET value = $1 WHERE key = 'providers_count'",
        [providersCount],
      );
      await pool.query(
        "UPDATE settings SET value = $1 WHERE key = 'authenticity_pct'",
        [authenticityPct],
      );
      res.redirect("/admin.html");
    } catch (err) {
      console.error("Failed to update trust stats:", err);
      res.status(500).send("Internal Server Error");
    }
  },
);

app.get("/portal.html", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "portal.html"));
});

// === API ROUTES ===
app.get("/api/funds", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT value FROM settings WHERE key = 'fundraising_amount'",
    );
    const row = result.rows[0];
    const amount = row ? parseInt(row.value, 10) : 1250000;
    res.json({ amount: amount });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch funds" });
  }
});

app.get("/api/waitlist", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT value FROM settings WHERE key = 'waitlist_count'",
    );
    const row = result.rows[0];
    const count = row ? parseInt(row.value, 10) : 842;
    res.json({ count: count });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch waitlist count" });
  }
});

app.get("/api/trust-stats", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT key, value FROM settings WHERE key IN ('centres_count', 'tourists_count', 'providers_count', 'authenticity_pct')",
    );

    const stats = {
      centres: "40K+",
      tourists: "600K",
      providers: "4",
      authenticity: "100%",
    };

    result.rows.forEach((row) => {
      if (row.key === "centres_count") stats.centres = row.value;
      if (row.key === "tourists_count") stats.tourists = row.value;
      if (row.key === "providers_count") stats.providers = row.value;
      if (row.key === "authenticity_pct") stats.authenticity = row.value;
    });

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch trust stats" });
  }
});

app.post("/api/careers/apply", async (req, res) => {
  const { firstName, lastName, email, linkedinUrl, role, message } = req.body;

  if (!firstName || !lastName || !email || !role) {
    return res
      .status(400)
      .json({ error: "First name, last name, email, and role are required." });
  }

  try {
    const result = await pool.query(
      `INSERT INTO career_applications (first_name, last_name, email, linkedin_url, role, message)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [firstName, lastName, email, linkedinUrl, role, message],
    );
    res.status(201).json({
      success: true,
      message: "Application submitted successfully.",
      id: result.rows[0].id,
    });
  } catch (err) {
    console.error("Error saving career application:", err.message);
    res
      .status(500)
      .json({ error: "Failed to submit application. Please try again later." });
  }
});

app.get("/api/admin/careers", requireRole("admin"), async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM career_applications ORDER BY created_at DESC",
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching career applications:", err.message);
    res.status(500).json({ error: "Failed to fetch applications" });
  }
});

app.get("/api/admin/phone-users", requireRole("admin"), async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, phone, name, role, created_at FROM users_phone ORDER BY created_at DESC",
    );

    res.json({
      count: result.rowCount,
      users: result.rows,
    });
  } catch (err) {
    console.error("Error fetching phone users:", err.message);
    res.status(500).json({ error: "Failed to fetch phone users" });
  }
});

app.get("/api/auth/me", (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.json({ authenticated: false });
  }

  res.json({
    authenticated: true,
    id: req.user.id,
    name: req.user.name || req.user.phone || "User",
    email: req.user.email,
    role: req.user.role,
  });
});

app.post("/api/intake-submissions", async (req, res) => {
  try {
    const {
      name,
      phone,
      age,
      chronicConditions,
      eyesightIssues,
      eyePower,
      relation,
      isFamilyMember,
    } = req.body || {};

    const cleanName = String(name || "").trim();
    const cleanPhone = String(phone || "")
      .replace(/\s+/g, "")
      .trim();
    const parsedAge = parseInt(String(age || ""), 10);
    const isForFamilyMember = toBoolean(isFamilyMember);
    const relationText = String(relation || "").trim();
    const hasEyesightIssues = toBoolean(eyesightIssues);
    const cleanEyePower = String(eyePower || "").trim();

    if (!cleanName || cleanName.length > 120) {
      return res
        .status(400)
        .json({ error: "Name is required and must be under 120 characters." });
    }

    if (!cleanPhone || cleanPhone.length < 8 || cleanPhone.length > 20) {
      return res.status(400).json({ error: "Valid phone number is required." });
    }

    if (!Number.isInteger(parsedAge) || parsedAge < 1 || parsedAge > 120) {
      return res
        .status(400)
        .json({ error: "Age must be a number between 1 and 120." });
    }

    const conditionsInput = Array.isArray(chronicConditions)
      ? chronicConditions
      : typeof chronicConditions === "string" && chronicConditions.trim()
        ? [chronicConditions]
        : [];

    const normalizedConditions = conditionsInput
      .map((item) => String(item).trim().toLowerCase())
      .filter(Boolean);

    const hasInvalidCondition = normalizedConditions.some(
      (condition) => !ALLOWED_CHRONIC_CONDITIONS.has(condition),
    );

    if (hasInvalidCondition) {
      return res
        .status(400)
        .json({ error: "One or more chronic conditions are invalid." });
    }

    if (isForFamilyMember && !relationText) {
      return res
        .status(400)
        .json({
          error: "Relation is required when filling for a family member.",
        });
    }

    if (hasEyesightIssues && !cleanEyePower) {
      return res
        .status(400)
        .json({
          error: "Please provide eye power when eyesight issues are selected.",
        });
    }

    const result = await pool.query(
      `INSERT INTO intake_submissions
      (name, phone, age, chronic_conditions, eyesight_issues, eye_power, relation)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, created_at`,
      [
        cleanName,
        cleanPhone,
        parsedAge,
        JSON.stringify(normalizedConditions),
        hasEyesightIssues,
        cleanEyePower,
        isForFamilyMember ? relationText : "self",
      ],
    );

    return res.status(201).json({
      success: true,
      submissionId: result.rows[0].id,
      createdAt: result.rows[0].created_at,
    });
  } catch (err) {
    console.error("Failed to save intake submission:", err);
    return res.status(500).json({ error: "Failed to save intake submission" });
  }
});

app.get(
  "/api/admin/intake-submissions",
  requireRole("admin"),
  async (req, res) => {
    try {
      const phoneFilter = String(req.query.phone || "").trim();
      const limitRaw = parseInt(String(req.query.limit || "100"), 10);
      const limit = Number.isFinite(limitRaw)
        ? Math.max(1, Math.min(limitRaw, 500))
        : 100;

      const params = [];
      let whereClause = "";
      if (phoneFilter) {
        params.push(phoneFilter);
        whereClause = `WHERE phone = $${params.length}`;
      }

      params.push(limit);

      const result = await pool.query(
        `SELECT id, name, phone, age, chronic_conditions, eyesight_issues, eye_power, relation, created_at
       FROM intake_submissions
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length}`,
        params,
      );

      return res.json({ count: result.rowCount, items: result.rows });
    } catch (err) {
      console.error("Failed to fetch intake submissions:", err);
      return res
        .status(500)
        .json({ error: "Failed to fetch intake submissions" });
    }
  },
);

const resolveReturnTo = (value) => {
  if (typeof value !== "string") return "/";
  const trimmed = value.trim();
  return trimmed.startsWith("/") ? trimmed : "/";
};

// === STATIC & PUBLIC ROUTES ===

// Serve Static Assets (HTML/CSS/JS/Images)
app.use(express.static(path.join(__dirname)));

// Fallback for root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Google OAuth Login Route
app.get(
  "/auth/google",
  (req, res, next) => {
    if (req.query.returnTo) {
      req.session.returnTo = req.query.returnTo;
    }
    next();
  },
  passport.authenticate("google", { scope: ["profile", "email"] }),
);

// Google OAuth Callback Route
app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/auth.html" }),
  (req, res) => {
    let redirectTo = "/";

    const returnTo = req.session.returnTo;
    redirectTo = resolveReturnTo(returnTo);

    if (req.user.role === "admin") {
      console.log(`[AUTH] Admin authenticated: ${req.user.email}`);
      if (!returnTo) {
        redirectTo = "/admin.html";
      }
    } else {
      console.log(`[AUTH] Customer authenticated: ${req.user.email}`);
    }

    delete req.session.returnTo;

    // Ensure the session is persisted before redirecting to protected pages.
    req.session.save((err) => {
      if (err) {
        console.error("Failed to save session after OAuth callback:", err);
        return res.redirect("/auth.html");
      }
      return res.redirect(redirectTo);
    });
  },
);

// Phone/Password Registration Route
app.post("/auth/register", async (req, res) => {
  try {
    const { phone, name, password, returnTo } = req.body;

    if (!phone || !name || !password) {
      return res.status(400).json({
        error: "Phone, name, and password are required",
      });
    }

    // Check if phone already exists
    const existing = await pool.query(
      "SELECT * FROM users_phone WHERE phone = $1",
      [phone],
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Phone number already registered" });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create user
    const result = await pool.query(
      "INSERT INTO users_phone (phone, name, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, phone, name, role",
      [phone, name, password_hash, "customer"],
    );

    const user = result.rows[0];
    await incrementPhoneUserCount();
    await incrementWaitlistCount();

    // Log the user in via Passport
    req.logIn(user, (err) => {
      if (err) {
        return res
          .status(500)
          .json({ error: "Login failed after registration" });
      }

      req.session.save((err) => {
        if (err) {
          return res.status(500).json({ error: "Session save failed" });
        }

        res.json({
          success: true,
          message: "Account created and logged in",
          redirectUrl: resolveReturnTo(returnTo),
          user: {
            id: user.id,
            phone: user.phone,
            name: user.name,
            role: user.role,
          },
        });
      });
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// Phone/Password Login Route
app.post("/auth/login", async (req, res, next) => {
  if (process.env.ALLOW_INSECURE_PHONE_LOGIN === "true") {
    const { phone, password, returnTo } = req.body || {};
    const redirectTo = resolveReturnTo(returnTo);
    if (!phone) {
      return res.status(400).json({ error: "Phone number is required" });
    }
    if (!password) {
      return res.status(400).json({
        error:
          "Password required. Please enter your password or create an account.",
      });
    }

    try {
      let userRow = await pool.query(
        "SELECT * FROM users_phone WHERE phone = $1",
        [phone],
      );
      let user = userRow.rows[0];

      if (user) {
        return passport.authenticate("local", (err, authUser, info) => {
          if (err) {
            return res.status(500).json({ error: "Authentication error" });
          }

          if (!authUser) {
            return res
              .status(401)
              .json({ error: info.message || "Invalid credentials" });
          }

          return req.logIn(authUser, (err) => {
            if (err) {
              return res.status(500).json({ error: "Login failed" });
            }

            req.session.save((saveErr) => {
              if (saveErr) {
                return res.status(500).json({ error: "Session save failed" });
              }

              return res.json({
                success: true,
                message: "Logged in successfully",
                redirectUrl: redirectTo,
                user: {
                  id: authUser.id,
                  phone: authUser.phone,
                  name: authUser.name,
                  role: authUser.role,
                },
              });
            });
          });
        })(req, res, next);
      }

      const password_hash = password ? await bcrypt.hash(password, 10) : "";
      const created = await pool.query(
        "INSERT INTO users_phone (phone, name, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, phone, name, role",
        [phone, phone, password_hash, "customer"],
      );
      user = created.rows[0];
      await incrementPhoneUserCount();
      await incrementWaitlistCount();

      return req.logIn(user, (err) => {
        if (err) {
          return res.status(500).json({ error: "Login failed" });
        }

        req.session.save((saveErr) => {
          if (saveErr) {
            return res.status(500).json({ error: "Session save failed" });
          }

          return res.json({
            success: true,
            message: "Logged in successfully",
            redirectUrl: redirectTo,
            user: {
              id: user.id,
              phone: user.phone,
              name: user.name,
              role: user.role,
            },
          });
        });
      });
    } catch (err) {
      console.error("Insecure phone login error:", err);
      return res.status(500).json({ error: "Login failed" });
    }
  }

  const { phone, password, returnTo } = req.body || {};
  const redirectTo = resolveReturnTo(returnTo);
  if (!phone) {
    return res.status(400).json({ error: "Phone number is required" });
  }
  if (!password) {
    return res.status(400).json({
      error:
        "Password required. Please enter your password or create an account.",
    });
  }

  passport.authenticate("local", (err, user, info) => {
    if (err) {
      return res.status(500).json({ error: "Authentication error" });
    }

    if (!user) {
      return res
        .status(401)
        .json({ error: info.message || "Invalid credentials" });
    }

    req.logIn(user, (err) => {
      if (err) {
        return res.status(500).json({ error: "Login failed" });
      }

      req.session.save((err) => {
        if (err) {
          return res.status(500).json({ error: "Session save failed" });
        }

        res.json({
          success: true,
          message: "Logged in successfully",
          redirectUrl: redirectTo,
          user: {
            id: user.id,
            phone: user.phone,
            name: user.name,
            role: user.role,
          },
        });
      });
    });
  })(req, res, next);
});

// Logout Route
app.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

// Start Server
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(
        `🌊 Stillwater Digital Sanctuary running on http://localhost:${PORT}`,
      );
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });
