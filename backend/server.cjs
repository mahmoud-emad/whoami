const express = require("express");
const fs = require("fs").promises;
const fsSync = require("fs");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");

// All data paths are resolved from this file's location, not the working directory, so the
// server behaves the same whether it is started from the repo root, a systemd unit or a container.
const FILE_PATH = path.join(__dirname, "db.json");
const CONFIG_FILE_PATH = path.join(__dirname, "config.json");
const UPLOADS_DIR = path.join(__dirname, "uploads");
const DIST_DIR = path.join(__dirname, "..", "dist");

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const NODE_ENV = process.env.NODE_ENV || "development";
const IS_PRODUCTION = NODE_ENV === "production";
// Comma-separated list of origins allowed to call the API cross-origin. Empty in production means
// same-origin only, which is the correct setting when Express also serves the built frontend.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
// In production this process also serves the built frontend, provided the build exists.
const SERVE_FRONTEND = IS_PRODUCTION && fsSync.existsSync(DIST_DIR);

// Configure multer for handling file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOADS_DIR);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, GIF and PDF are allowed.'));
        }
    }
});

const app = express();
// Every API endpoint lives on this router, mounted under /api. Keeping it off the root is what
// lets client-side routes like /projects coexist with the API resource of the same name.
const api = express.Router();

// Default schema
const defaultDB = {
    guestbooks: [],
    posts: [],
    projects: [],
    articles: [],
};

// Default config
const defaultConfig = {
    server: {
        host: "localhost",
        port: 3000,
    },
    configuration: {
        githubURL: "",
        adminDashboard: true,
        multipleThemes: true,
        enableSearch: true,
        searchModels: ["projects", "guestbooks", "articles", "posts"],
        // Guestbook spam gate. The answer used to be hardcoded to the original owner's handle,
        // which meant nobody else could pass their own form.
        antiBot: {
            enabled: true,
            question: "",
            answer: "",
        },
    },
    theme: {
        defaultTheme: "dark",
        // Palettes were 23 hex literals inside plugins/vuetify.ts. They live here so an owner can
        // recolour the site without touching code.
        dark: {
            background: "#01061F",
            "text-color": "#ffffff",
            "border-color": "#123869",
            "gray-color": "#cdd4df",
            "link-color": "#cdd4df",
            "box-bg-color": "#120131bb",
            "link-hover-color": "#82adf3",
            "front-end-bg-color": "#05143dbb",
            "back-end-bg-color": "#05283dbb",
            form: "#091C21FF",
        },
        light: {
            background: "#ffffff",
            "text-color": "#11161f",
            "border-color": "#e2e6ec",
            "gray-color": "#5b6473",
            "link-color": "#2a4d8f",
            "box-bg-color": "#ffffff",
            "link-hover-color": "#2f6bd4",
            "front-end-bg-color": "#cedeff",
            "back-end-bg-color": "#c4e1ff",
            form: "#f4f6fa",
        },
    },
    // IndieWeb. A webring is a reciprocal-link network: joining puts the site in other people's
    // "next/previous" navigation, which is the point of it for discoverability. The ring exposes
    // bare /previous and /next endpoints and works out which member sent a visitor from the HTTP
    // referrer, so there is no per-site slug or key to configure. Register the site at baseUrl
    // first; until the ring knows the domain the links just bounce to the ring's own index.
    indieweb: {
        webring: {
            enabled: false,
            name: "IndieWeb Webring",
            baseUrl: "https://xn--sr8hvo.ws",
        },
    },
    // Document head. index.html had no title, description or link-preview tags at all.
    meta: {
        title: "",
        description: "",
        siteUrl: "",
        ogImage: "",
        faviconUrl: "",
        twitterHandle: "",
    },
    security: {
        debug: false,
        // Never stores the signature itself — only a scrypt hash and its salt. Seeded on first
        // boot from ADMIN_SIGNATURE, or randomly generated and printed once to the server log.
        adminSignature: {
            salt: "",
            hash: "",
        },
    },
    profile: {
        fullName: "",
        role: "",
        bio: "",
        welcomeMessages: [],
        resumeUrl: "",
        brand: {
            displayName: "",
            handle: "",
            handleUrl: "",
            logoUrl: "",
            copyrightOwner: "",
            copyrightYear: new Date().getFullYear(),
            navItems: [
                { link: "/", name: "❄️ About", title: "About me", show: true },
                { link: "/contact", name: "📞 Contact", title: "Contact me", show: true },
                { link: "/projects", name: "🎨 Projects", title: "See my projects", show: true },
                { link: "/blog", name: "✍️ Blog", title: "See my blog", show: true },
                { link: "/guestbook", name: "🧁 Guestbook", title: "Write me a guestbook", show: true },
                { link: "/more", name: "🌏 More", title: "Wanna to see more?", show: true },
            ],
        },
        problemSolving: {
            enabled: true,
            description: "",
            repoUrl: "",
        },
        socials: {
            email: "",
            signalUrl: "",
            githubUrl: "",
            linkedinUrl: "",
            xUrl: "",
            timezone: "",
        },
        contact: {
            intro: "",
            elsewhereIntro: "",
            emailLabel: "",
            emailDescription: "",
            signalLabel: "",
            signalDescription: "",
            githubLabel: "",
            linkedinLabel: "",
            xLabel: "",
        },
        // Drives the "More" page. Everything here is editable from the admin dashboard so the
        // page only ever advertises things that actually exist — cards used to be hardcoded and
        // pointed at pages that had never been built.
        more: {
            intro: "",
            // Cards: { title, description, linkText, link, show }
            cards: [],
            shoeboxIntro: "",
            // Small links: { name, link, show }
            shoebox: [],
        },
        // Work history. Was a hardcoded array inside ExperienceSection.vue.
        // { org, title, where, period, active, points[], show }
        experience: [],
        // Heading, intro, visibility and order for each home-page section.
        sections: {
            intro: { title: "", emoji: "", intro: "", show: true, order: 1 },
            experience: { title: "Experience", emoji: "\u2699\ufe0f", intro: "", show: true, order: 2 },
            projects: { title: "Selected Work", emoji: "\ud83c\udfa8", intro: "", show: true, order: 3 },
            openSource: { title: "Open Source", emoji: "\ud83c\udf1f", intro: "", show: true, order: 4 },
            problemSolving: { title: "Problem Solving", emoji: "\ud83e\udde0", intro: "", show: true, order: 5 },
            articles: { title: "Articles", emoji: "\ud83d\udcdd", intro: "", show: true, order: 6 },
        },
        // Heading and intro copy for the standalone pages.
        pages: {
            contact: { title: "Contact", intro: "" },
            projects: { title: "Projects", intro: "" },
            blog: { title: "Blog", intro: "" },
            guestbook: { title: "Guestbook", intro: "" },
            guestbookNotice: { title: "", intro: "" },
            search: { title: "Search", intro: "" },
            notFound: { title: "This page does not exist yet.", intro: "" },
        },
        // Contact channels. Replaces the five hardcoded blocks in Contact.vue.
        // { kind, label, url, description, icon, featured, show }
        channels: [],
    }
}

// Logger function
const log = (message, level = "info") => {
    const colors = { info: "\x1b[32m", warn: "\x1b[33m", error: "\x1b[31m" };
    const color = colors[level] || colors.info;
    console.log(`${color}${level}\x1b[0m: ${new Date().toISOString()} | ${message}`);
};

// Middleware
const loggerMiddleware = (req, res, next) => {
    log(`${req.method} ${req.url}`, "info");
    next();
};

// Middleware setup
app.set("trust proxy", Boolean(process.env.TRUST_PROXY)); // needed for correct req.ip behind nginx/Caddy
app.use(express.json({ limit: "1mb" }));
// In production the frontend is served by this same process, so no cross-origin access is needed
// unless the operator explicitly allowlists origins. In development anything goes.
app.use(cors({
    origin: IS_PRODUCTION ? (ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS : false) : true,
}));
app.use(loggerMiddleware);
// Serve uploaded files. redirect:false so GET /uploads hits the list route rather than redirecting;
// cacheControl:false so the reverse proxy is the single source of truth for Cache-Control.
app.use('/uploads', express.static(UPLOADS_DIR, { redirect: false, cacheControl: false }));

// Function to initialize database
const initializeDatabase = async () => {
    try {
        await fs.access(FILE_PATH);
        log("Database exists", "info");
    } catch {
        log("Database does not exist, creating it...", "info");
        await fs.writeFile(FILE_PATH, JSON.stringify(defaultDB, null, 2));
    }
};

// Function to initialize config
const initializeConfig = async () => {
    try {
        await fs.access(CONFIG_FILE_PATH);
        log("Config exists", "info");
    } catch {
        log("Config does not exist, creating it...", "info");
        await fs.writeFile(CONFIG_FILE_PATH, JSON.stringify(defaultConfig, null, 2));
    }
};


// Database operations
const readDatabase = async () => {
    const data = await fs.readFile(FILE_PATH, "utf8");
    return JSON.parse(data || JSON.stringify(defaultDB));
};

// Recursively add any keys present in defaults but missing from target. Arrays and primitives
// are copied as-is when missing; objects recurse. Returns true if anything was added.
const deepBackfill = (target, defaults) => {
    if (target === null || typeof target !== 'object' || Array.isArray(target)) return false;
    let mutated = false;
    for (const [key, value] of Object.entries(defaults)) {
        const isPlainObject = value !== null && typeof value === 'object' && !Array.isArray(value);
        const targetIsPlainObject =
            target[key] !== null && typeof target[key] === 'object' && !Array.isArray(target[key]);

        if (!(key in target)) {
            target[key] = isPlainObject || Array.isArray(value) ? JSON.parse(JSON.stringify(value)) : value;
            mutated = true;
        } else if (isPlainObject && targetIsPlainObject) {
            if (deepBackfill(target[key], value)) mutated = true;
        }
    }
    return mutated;
};

// Read config from disk; transparently backfill missing keys from defaults (handles nested
// additions like profile.brand without breaking older config.json files).
const readConfig = async () => {
    const data = await fs.readFile(CONFIG_FILE_PATH, "utf8");
    const parsed = JSON.parse(data || JSON.stringify(defaultConfig));
    if (deepBackfill(parsed, defaultConfig)) await writeConfig(parsed);
    return parsed;
};

const writeDatabase = async (dbData) => {
    await fs.writeFile(FILE_PATH, JSON.stringify(dbData, null, 2));
};

const writeConfig = async (configData) => {
    await fs.writeFile(CONFIG_FILE_PATH, JSON.stringify(configData, null, 2));
};

// Helper: next id is max(existing id) + 1 so deletes don't cause collisions
const nextId = (list) => list.reduce((m, x) => (x && x.id > m ? x.id : m), 0) + 1;

// Helper: update entry in a collection by id, preserving id/createdAt
const updateById = (list, id, patch) => {
    const idx = list.findIndex((e) => e.id === id);
    if (idx === -1) return null;
    const { id: _ignoreId, createdAt, ...rest } = list[idx];
    list[idx] = {
        ...rest,
        ...patch,
        id: list[idx].id,
        createdAt: createdAt || list[idx].createdAt,
        updatedAt: new Date().toISOString(),
    };
    return list[idx];
};

// ---------------------------------------------------------------------------
// Authentication
//
// The admin signature is never stored or sent in the clear. config.json keeps only a scrypt hash
// and its salt; clients exchange the signature for a bearer token that lives in memory. Tokens are
// dropped on restart by design — there is no session store to leak or to grow unbounded.
// ---------------------------------------------------------------------------

const SCRYPT_KEYLEN = 64;
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;
const MIN_SIGNATURE_LENGTH = 8;

const hashSignature = (signature, salt) =>
    crypto.scryptSync(String(signature), salt, SCRYPT_KEYLEN).toString("hex");

const createSignatureRecord = (signature) => {
    const salt = crypto.randomBytes(16).toString("hex");
    return { salt, hash: hashSignature(signature, salt) };
};

const verifySignature = (signature, record) => {
    if (!record || !record.salt || !record.hash) return false;
    const candidate = Buffer.from(hashSignature(signature, record.salt), "hex");
    const expected = Buffer.from(record.hash, "hex");
    if (candidate.length !== expected.length) return false;
    return crypto.timingSafeEqual(candidate, expected);
};

// token -> expiry timestamp
const sessions = new Map();

const issueToken = () => {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = Date.now() + TOKEN_TTL_MS;
    sessions.set(token, expiresAt);
    return { token, expiresAt };
};

const isValidToken = (token) => {
    if (!token) return false;
    const expiresAt = sessions.get(token);
    if (!expiresAt) return false;
    if (expiresAt < Date.now()) {
        sessions.delete(token);
        return false;
    }
    return true;
};

// Sweep expired tokens so the map cannot grow without bound on a long-lived process.
setInterval(() => {
    const now = Date.now();
    for (const [token, expiresAt] of sessions) {
        if (expiresAt < now) sessions.delete(token);
    }
}, 60 * 60 * 1000).unref();

const bearerToken = (req) => {
    const header = req.get("authorization") || "";
    return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
};

// Gate for every endpoint that mutates content or configuration.
const requireAuth = (req, res, next) => {
    if (!isValidToken(bearerToken(req))) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    next();
};

// Per-IP throttle so the signature cannot be brute forced.
const loginAttempts = new Map();

const loginLockoutRemaining = (ip) => {
    const entry = loginAttempts.get(ip);
    if (!entry || entry.count < MAX_LOGIN_ATTEMPTS) return 0;
    const remaining = entry.blockedUntil - Date.now();
    if (remaining <= 0) {
        loginAttempts.delete(ip);
        return 0;
    }
    return remaining;
};

const recordFailedLogin = (ip) => {
    const entry = loginAttempts.get(ip) || { count: 0, blockedUntil: 0 };
    entry.count += 1;
    entry.blockedUntil = Date.now() + LOGIN_LOCKOUT_MS;
    loginAttempts.set(ip, entry);
};

// ---------------------------------------------------------------------------
// Configuration bootstrap
//
// The rule this whole section implements: ENV SEEDS, THE DASHBOARD OWNS.
//
//   * Environment variables exist so a fresh clone can be brought up unattended — first boot
//     writes them into config.json and they are never consulted for that field again.
//   * Every later edit happens in the admin dashboard and is authoritative. A redeploy with a
//     stale .env must therefore NEVER clobber what the owner typed into the dashboard, which is
//     why the seeder only ever fills fields that are still empty.
//
// The startup order is: validate (fail fast) -> seed (fill blanks) -> listen.
// ---------------------------------------------------------------------------

// A zone is valid if Intl accepts it. Intl throws RangeError for anything that is not a real
// IANA identifier, which is the cheapest correct check available without pulling in a tz database.
const isValidTimezone = (zone) => {
    try {
        new Intl.DateTimeFormat("en-US", { timeZone: String(zone) });
        return true;
    } catch {
        return false;
    }
};

const isValidUrl = (value) => {
    try {
        const parsed = new URL(String(value));
        return Boolean(parsed.protocol && parsed.host);
    } catch {
        return false;
    }
};

const envValue = (name) => {
    const raw = process.env[name];
    return typeof raw === "string" ? raw.trim() : "";
};

// Boolean-ish spellings accepted for flag variables. The environment only ever hands over
// strings, so "1", "true", "yes" and "on" all mean on and everything listed as off means off.
const TRUTHY_ENV = new Set(["1", "true", "yes", "on"]);
const FALSY_ENV = new Set(["0", "false", "no", "off"]);
const isBooleanEnv = (value) => {
    const lowered = value.trim().toLowerCase();
    return TRUTHY_ENV.has(lowered) || FALSY_ENV.has(lowered);
};

// Every variable this server understands, documented here so the startup banner and the
// .env examples cannot drift apart. `required: true` means required in production only.
const ENV_SPEC = [
    {
        name: "ADMIN_SIGNATURE",
        required: true,
        describe: "the admin password used to log into the dashboard (min 8 characters)",
        // Only checked when a value is present; emptiness is handled by the required rule.
        validate: (value) =>
            value.length >= MIN_SIGNATURE_LENGTH
                ? null
                : `must be at least ${MIN_SIGNATURE_LENGTH} characters`,
    },
    { name: "SITE_OWNER", required: true, describe: "your display name, e.g. \"Ada Lovelace\"" },
    {
        name: "SITE_URL",
        required: true,
        describe: "the public URL of the site, e.g. \"https://example.com\"",
        validate: (value) => (isValidUrl(value) ? null : "must be an absolute URL, e.g. https://example.com"),
    },
    { name: "SITE_ROLE", required: false, describe: "job title shown under your name" },
    { name: "SITE_HANDLE", required: false, describe: "short handle, e.g. \"@ada\"" },
    { name: "SITE_EMAIL", required: false, describe: "public contact email" },
    { name: "SITE_GITHUB", required: false, describe: "GitHub profile URL" },
    { name: "SITE_LINKEDIN", required: false, describe: "LinkedIn profile URL" },
    { name: "SITE_X", required: false, describe: "X/Twitter profile URL" },
    {
        name: "SITE_TIMEZONE",
        required: false,
        describe: "IANA timezone, e.g. \"Africa/Cairo\"",
        validate: (value) => (isValidTimezone(value) ? null : "is not a valid IANA timezone (e.g. Europe/Berlin)"),
    },
    { name: "SITE_DESCRIPTION", required: false, describe: "one-line site description used for SEO" },
    { name: "ANTIBOT_QUESTION", required: false, describe: "guestbook anti-bot question" },
    { name: "ANTIBOT_ANSWER", required: false, describe: "guestbook anti-bot answer (never exposed publicly)" },
    {
        name: "WEBRING_ENABLED",
        required: false,
        describe: "1 to show the IndieWeb webring links in the footer",
        validate: (value) => (isBooleanEnv(value) ? null : "must be one of 1/0, true/false, yes/no, on/off"),
    },
];

// Fail-fast validation. A misconfigured production deploy should die loudly at boot rather than
// come up half-working and serve a nameless site with an unreachable dashboard — a broken deploy
// that never starts is trivially noticed, one that starts wrong can go unnoticed for weeks.
// Development is deliberately permissive: `yarn server` must work on a fresh clone with no .env.
const validateEnvironment = async () => {
    const errors = [];
    const warnings = [];

    // PORT is checked in every environment because it is never "missing but fine": an
    // unparseable or out-of-range port silently binds somewhere unexpected or crashes deep in
    // Node's networking layer with a far less useful message than this one.
    const rawPort = envValue("PORT");
    if (rawPort) {
        const parsed = Number(rawPort);
        if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
            errors.push(`PORT — must be a whole number between 1 and 65535 (got "${rawPort}")`);
        }
    }

    // "Required" means "required to bring this site up", not "required forever".
    //
    // Every required variable exists only to SEED config.json. Once the corresponding config field
    // is populated — by an earlier boot, or by the owner editing the dashboard — demanding the
    // variable again is wrong: it would refuse to start a site that is already fully configured,
    // and would break every existing deployment the moment it upgraded to a version that added a
    // new required variable. So a variable is fatal only when config cannot already supply it.
    let configured = {};
    try {
        const existing = await readConfig();
        const record = (existing.security && existing.security.adminSignature) || {};
        const profile = existing.profile || {};
        const brand = profile.brand || {};
        const meta = existing.meta || {};
        configured = {
            ADMIN_SIGNATURE: Boolean(record.salt && record.hash),
            SITE_OWNER: Boolean((profile.fullName || brand.displayName || '').trim()),
            SITE_URL: Boolean((meta.siteUrl || '').trim()),
        };
    } catch {
        configured = {};
    }

    for (const spec of ENV_SPEC) {
        const value = envValue(spec.name);
        const target = IS_PRODUCTION && spec.required ? errors : warnings;

        if (!value) {
            // Already satisfied by config, so its absence from the environment is the steady state.
            if (configured[spec.name]) continue;
            if (spec.required) {
                target.push(`${spec.name} — missing. Set it to ${spec.describe}.`);
            }
            continue;
        }

        const problem = spec.validate ? spec.validate(value) : null;
        if (problem) {
            // An invalid value is a typo, not an omission, so it is reported in production even
            // for optional variables — silently ignoring it would hide the mistake forever.
            (IS_PRODUCTION ? errors : warnings).push(`${spec.name} — ${problem}.`);
        }
    }

    if (warnings.length) {
        log("Environment is incomplete (development mode, continuing anyway):", "warn");
        for (const warning of warnings) log(`  • ${warning}`, "warn");
        log("  These only matter on first boot; see .env.example.", "warn");
    }

    if (!errors.length) return;

    log("=".repeat(72), "error");
    log("Refusing to start: the environment is not valid for production.", "error");
    for (const problem of errors) log(`  • ${problem}`, "error");
    log("", "error");
    log("Fix the variables above (see .env.production.example) and start again.", "error");
    log("They are only read to seed backend/config.json on first boot — after that", "error");
    log("every value is edited from the admin dashboard.", "error");
    log("=".repeat(72), "error");
    process.exit(1);
};

// Walk a dotted path and return whether the leaf is still "unset". Only empty strings, null and
// undefined count as unset: `false`, `0` and populated arrays are real owner choices.
const isBlank = (value) => value === undefined || value === null || (typeof value === "string" && !value.trim());

// Assign only when the current value is blank. Returns true when it actually wrote, so the caller
// can report exactly which fields were seeded.
//
// `flag: true` additionally counts `false` as unset. Flag fields default to `false`, which the
// blank rule above reads as a deliberate owner choice, so without this a flag variable could
// never seed anything at all.
const seedPath = (root, dottedPath, value, { flag = false } = {}) => {
    if (isBlank(value)) return false;
    const keys = dottedPath.split(".");
    const leaf = keys.pop();
    let node = root;
    for (const key of keys) {
        if (!node[key] || typeof node[key] !== "object" || Array.isArray(node[key])) node[key] = {};
        node = node[key];
    }
    const current = node[leaf];
    const unset = isBlank(current) || (flag && current === false);
    if (!unset) return false; // dashboard wins — never overwrite an owner edit
    node[leaf] = value;
    return true;
};

// Turn a flag variable into what a boolean config field holds. Anything off becomes "" rather
// than `false` so seedPath's blank check skips it: off is already the default, so there is
// nothing to seed and nothing worth reporting.
const asFlag = (value) => (TRUTHY_ENV.has(value.trim().toLowerCase()) ? true : "");

// env var -> config paths it seeds, plus per-variable options. One variable can feed several
// fields (a name is at once the profile name, the brand name and the copyright holder) because
// asking an operator for the same string three times in a .env file is a worse experience than
// fanning it out here.
//
// `{ flag: true }` marks a boolean field: the raw string is coerced with asFlag and `false`
// counts as unset. One caveat comes with that. Turning the webring off in the dashboard puts the
// field back to `false`, so a WEBRING_ENABLED=1 still sitting in the environment seeds it on
// again at the next boot. Drop the variable once the site is up, as with every other seed.
const ENV_SEED_MAP = [
    ["SITE_OWNER", ["profile.fullName", "profile.brand.displayName", "profile.brand.copyrightOwner", "meta.title"]],
    ["SITE_ROLE", ["profile.role"]],
    ["SITE_HANDLE", ["profile.brand.handle"]],
    ["SITE_EMAIL", ["profile.socials.email"]],
    ["SITE_GITHUB", ["profile.socials.githubUrl", "configuration.githubURL", "profile.brand.handleUrl"]],
    ["SITE_LINKEDIN", ["profile.socials.linkedinUrl"]],
    ["SITE_X", ["profile.socials.xUrl"]],
    ["SITE_TIMEZONE", ["profile.socials.timezone"]],
    ["SITE_URL", ["meta.siteUrl"]],
    ["SITE_DESCRIPTION", ["meta.description"]],
    ["ANTIBOT_QUESTION", ["configuration.antiBot.question"]],
    ["ANTIBOT_ANSWER", ["configuration.antiBot.answer"]],
    ["WEBRING_ENABLED", ["indieweb.webring.enabled"], { flag: true }],
];

// First-run seeding. Runs on every boot but is a no-op once the fields hold anything, so it is
// safe to leave the .env in place forever. Also makes sure an admin signature exists before the
// server accepts traffic: seeded from ADMIN_SIGNATURE when provided, otherwise generated randomly
// and printed once so the operator can log in. There is deliberately no default password.
const bootstrapConfig = async () => {
    const config = await readConfig();
    const seeded = [];

    for (const [envName, paths, options = {}] of ENV_SEED_MAP) {
        const raw = envValue(envName);
        if (!raw) continue;
        const value = options.flag ? asFlag(raw) : raw;
        for (const dottedPath of paths) {
            if (seedPath(config, dottedPath, value, options)) seeded.push(dottedPath);
        }
    }

    const record = config.security && config.security.adminSignature;
    const hasSignature = Boolean(record && record.salt && record.hash);
    let generatedSignature = "";
    let seededFromEnv = false;

    if (!hasSignature) {
        const fromEnv = envValue("ADMIN_SIGNATURE");
        const signature = fromEnv || crypto.randomBytes(12).toString("base64url");
        seededFromEnv = Boolean(fromEnv);
        if (!seededFromEnv) generatedSignature = signature;

        config.security = { ...config.security, adminSignature: createSignatureRecord(signature) };
        // Drop the pre-auth plaintext field if an older config.json still carries it.
        delete config.security.adminFingerprintSignature;
    }

    if (seeded.length || !hasSignature) await writeConfig(config);

    if (seeded.length) {
        log(`Seeded ${seeded.length} empty config field(s) from the environment:`, "info");
        log(`  ${seeded.join(", ")}`, "info");
        log("  Everything already filled in was left untouched — the dashboard owns it now.", "info");
    } else {
        log("Nothing to seed from the environment — every mapped field is already set or unset.", "info");
    }

    if (seededFromEnv) {
        log("Admin signature seeded from ADMIN_SIGNATURE.", "info");
    } else if (generatedSignature) {
        log("=".repeat(72), "warn");
        log(`No admin signature was set. Generated one: ${generatedSignature}`, "warn");
        log("Store it now. It is not recoverable and will not be printed again.", "warn");
        log("Set ADMIN_SIGNATURE before first boot to choose your own.", "warn");
        log("=".repeat(72), "warn");
    }
};

// Supported Endpoints
// 🔒 marks endpoints that require a bearer token from POST /auth/login.
const endpoints = {
    "/": "Home",
    "/auth/login (POST)": "Exchange the admin signature for a bearer token",
    "/auth/logout (POST)": "🔒 Invalidate the current token",
    "/auth/session (GET)": "Report whether the supplied token is still valid",
    "/auth/signature (POST)": "🔒 Change the admin signature",
    "/search (GET)": "Search the collections listed in configuration.searchModels (?q=…)",
    "/settings (GET)": "Public site settings (never includes credentials)",
    "/settings (POST)": "🔒 Update site settings",
    "/guestbooks (GET)": "List guestbook entries with pagination & sorting",
    "/guestbooks (POST)": "Add a new guestbook entry",
    "/guestbooks/:id (PUT)": "🔒 Update guestbook entry by ID",
    "/guestbooks/:id (DELETE)": "🔒 Delete guestbook entry by ID",
    "/projects (GET)": "List projects",
    "/projects (POST)": "🔒 Add a new project",
    "/projects/:id (PUT)": "🔒 Update project by ID",
    "/projects/:id (DELETE)": "🔒 Delete project by ID",
    "/articles (GET)": "List articles",
    "/articles (POST)": "🔒 Add a new article",
    "/articles/:id (PUT)": "🔒 Update article by ID",
    "/articles/:id (DELETE)": "🔒 Delete article by ID",
    "/posts (GET)": "List blog posts",
    "/posts (POST)": "🔒 Add a new blog post",
    "/posts/:id (PUT)": "🔒 Update blog post by ID",
    "/posts/:id (DELETE)": "🔒 Delete blog post by ID",
    "/upload (POST)": "🔒 Upload a file (JPEG/PNG/GIF/PDF, ≤5MB)",
    "/uploads (GET)": "🔒 List uploaded files",
    "/uploads/:filename (DELETE)": "🔒 Delete an uploaded file by filename",
};



// Endpoints
const apiInfo = () => ({ status: "200 OK", healthy: true, api: "Portfolio API", endpoints });

// Always available, and what the frontend's heartbeat polls.
api.get("/health", (req, res) => {
    res.json(apiInfo());
});

// Index of the API itself, at /api.
api.get("/", (req, res) => {
    res.json(apiInfo());
});

// Auth
api.post("/auth/login", async (req, res) => {
    const ip = req.ip || "unknown";
    try {
        const lockout = loginLockoutRemaining(ip);
        if (lockout > 0) {
            log(`Login blocked for ${ip} (${Math.ceil(lockout / 1000)}s remaining)`, "warn");
            return res.status(429).json({
                error: `Too many failed attempts. Try again in ${Math.ceil(lockout / 60000)} minute(s).`,
            });
        }

        const { signature } = req.body || {};
        if (typeof signature !== "string" || !signature) {
            return res.status(400).json({ error: "Signature is required" });
        }

        const configData = await readConfig();
        if (!verifySignature(signature, configData.security.adminSignature)) {
            recordFailedLogin(ip);
            log(`Failed login attempt from ${ip}`, "warn");
            return res.status(401).json({ error: "Invalid signature" });
        }

        loginAttempts.delete(ip);
        const { token, expiresAt } = issueToken();
        log(`Admin logged in from ${ip}`, "info");
        res.json({ token, expiresAt });
    } catch (error) {
        log(`Login failed: ${error.message}`, "error");
        res.status(500).json({ error: "Login failed" });
    }
});

api.post("/auth/logout", requireAuth, (req, res) => {
    sessions.delete(bearerToken(req));
    res.json({ message: "Logged out" });
});

api.get("/auth/session", (req, res) => {
    res.json({ valid: isValidToken(bearerToken(req)) });
});

api.post("/auth/signature", requireAuth, async (req, res) => {
    try {
        const { currentSignature, newSignature } = req.body || {};
        if (typeof newSignature !== "string" || newSignature.length < MIN_SIGNATURE_LENGTH) {
            return res
                .status(400)
                .json({ error: `New signature must be at least ${MIN_SIGNATURE_LENGTH} characters` });
        }

        const configData = await readConfig();
        // Re-check the current signature so a stolen token alone cannot lock the owner out.
        if (!verifySignature(String(currentSignature || ""), configData.security.adminSignature)) {
            return res.status(401).json({ error: "Current signature is incorrect" });
        }

        configData.security.adminSignature = createSignatureRecord(newSignature);
        await writeConfig(configData);

        // Every existing session is invalidated, including this one — the admin logs in again.
        sessions.clear();
        log("Admin signature changed; all sessions invalidated", "info");
        res.json({ message: "Signature updated. Please log in again." });
    } catch (error) {
        log(`Failed to change signature: ${error.message}`, "error");
        res.status(500).json({ error: "Failed to change signature" });
    }
});

// Strip everything the public site has no business seeing. `debug` is kept because the frontend
// reads it; the signature hash and salt never leave the server. The anti-bot answer is stripped
// for the same reason: the question has to reach the form, the answer must not — a secret that is
// shipped to the client is not a secret, and that is precisely what made the old hardcoded
// frontend check useless against a bot that reads the bundle.
const publicConfig = (configData) => {
    const configuration = (configData && configData.configuration) || {};
    const antiBot = configuration.antiBot || {};
    return {
        ...configData,
        configuration: {
            ...configuration,
            antiBot: {
                enabled: Boolean(antiBot.enabled),
                question: typeof antiBot.question === "string" ? antiBot.question : "",
            },
        },
        security: { debug: Boolean(configData.security && configData.security.debug) },
    };
};

// ---------------------------------------------------------------------------
// Search
//
// Public. Honours the two settings the admin dashboard already exposed but that nothing was
// reading: `enableSearch` turns it off entirely, and `searchModels` decides which collections
// are looked at.
// ---------------------------------------------------------------------------
const SEARCH_FIELDS = {
    projects: ["title", "description", "tags"],
    articles: ["title", "description"],
    posts: ["title", "content"],
    guestbooks: ["name", "message"],
};
const SEARCH_MAX_PER_MODEL = 20;
const SEARCH_MAX_QUERY = 100;

// Match against a whitelist of fields per collection so a query can never reach a field that
// was never meant to be public.
const entryMatches = (entry, fields, needle) =>
    fields.some((field) => {
        const value = entry[field];
        if (typeof value === "string") return value.toLowerCase().includes(needle);
        if (Array.isArray(value)) {
            return value.some((v) => typeof v === "string" && v.toLowerCase().includes(needle));
        }
        return false;
    });

api.get("/search", async (req, res) => {
    try {
        const configData = await readConfig();
        if (!configData.configuration || !configData.configuration.enableSearch) {
            return res.status(403).json({ error: "Search is turned off" });
        }

        const raw = typeof req.query.q === "string" ? req.query.q.trim() : "";
        if (!raw) {
            return res.json({ query: "", total: 0, results: {} });
        }
        const needle = raw.slice(0, SEARCH_MAX_QUERY).toLowerCase();

        const enabled = Array.isArray(configData.configuration.searchModels)
            ? configData.configuration.searchModels
            : [];

        const dbData = await readDatabase();
        const results = {};
        let total = 0;

        for (const model of enabled) {
            const fields = SEARCH_FIELDS[model];
            const collection = dbData[model];
            if (!fields || !Array.isArray(collection)) continue;

            const hits = collection
                .filter((entry) => entry && entryMatches(entry, fields, needle))
                .slice(0, SEARCH_MAX_PER_MODEL);

            if (hits.length) {
                results[model] = hits;
                total += hits.length;
            }
        }

        res.json({ query: raw, total, results, searched: enabled });
    } catch (error) {
        log(`Search failed: ${error.message}`, "error");
        res.status(500).json({ error: "Search failed" });
    }
});

// Settings CRUD
api.get("/settings", async (req, res) => {
    try {
        const configData = await readConfig()
        res.json({ data: publicConfig(configData) });
    } catch (error) {
        log(`Failed to read config: ${error.message}`, 'error');
        res.status(500).json({ error: error.message });
    }
})

api.post("/settings", requireAuth, async (req, res) => {
    try {
        const configData = await readConfig()
        for (const key of Object.keys(req.body || {})) {
            if (key in configData) {
                continue
            }
            log(`Unknown config key: ${key}`, 'error');
            return res.status(400).json({ error: `Unknown config key: ${key}` });
        }
        // Merge onto the stored config and re-pin the credential block: the client never receives
        // the signature hash, so it can never send one back — accepting req.body wholesale would
        // wipe it and lock the admin out.
        const merged = { ...configData, ...req.body, security: configData.security };
        merged.security.debug = Boolean(
            req.body && req.body.security ? req.body.security.debug : configData.security.debug
        );
        // Same problem as the signature hash, same fix: GET /settings hides the anti-bot answer,
        // so the dashboard round-trips an empty one. Taking that at face value would silently
        // disable the guestbook gate on the next unrelated settings save. An empty incoming answer
        // therefore means "leave it as it is"; only a non-empty one is an intentional change.
        if (merged.configuration) {
            const storedAntiBot = (configData.configuration && configData.configuration.antiBot) || {};
            const incomingAntiBot = merged.configuration.antiBot || {};
            const incomingAnswer =
                typeof incomingAntiBot.answer === "string" ? incomingAntiBot.answer.trim() : "";
            merged.configuration = {
                ...merged.configuration,
                antiBot: {
                    ...incomingAntiBot,
                    answer: incomingAnswer || storedAntiBot.answer || "",
                },
            };
        }
        await writeConfig(merged)
        res.json({ data: publicConfig(merged), message: "Config updated!" });
    } catch (error) {
        log(`Failed to read config: ${error.message}`, 'error');
        res.status(500).json({ error: error.message });
    }
})

// Guestbooks CRUD
api.get("/guestbooks", async (req, res) => {
    try {
        const dbData = await readDatabase();
        let guestbooks = [...dbData.guestbooks];
        // if (req.query.sort === "true") {
        // guestbooks.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        // }
        // const limit = parseInt(req.query.limit) || 10;
        // const page = parseInt(req.query.page) || 1;
        // const startIndex = (page - 1) * limit;
        // guestbooks = guestbooks.slice(startIndex, startIndex + limit);
        res.json({ data: guestbooks, total: guestbooks.length });
    } catch (error) {
        log(`Failed to read guestbooks: ${error.message}`, 'error');
        res.status(500).json({ error: error.message });
    }
});

// Add guestbook — the one write endpoint that stays public, so it whitelists and bounds every
// field. Spreading req.body here would let a visitor set their own id, createdAt or status.
const GUESTBOOK_LIMITS = { name: 60, message: 1000, website: 200 };

api.post("/guestbooks", async (req, res) => {
    try {
        const { name, message, website, antiBotAnswer } = req.body || {};

        // The real spam gate. The form does the same check for a nicer error, but a bot posts
        // straight to this endpoint and never runs that code, so the server has to be the one
        // that decides. Compared trimmed and case-insensitively — the question is a human
        // pleasantry, not a password, and rejecting "Blue" for "blue" only annoys real visitors.
        const guestbookConfig = await readConfig();
        const antiBot = (guestbookConfig.configuration && guestbookConfig.configuration.antiBot) || {};
        const expectedAnswer = typeof antiBot.answer === "string" ? antiBot.answer.trim() : "";
        if (antiBot.enabled && expectedAnswer) {
            const givenAnswer = typeof antiBotAnswer === "string" ? antiBotAnswer.trim() : "";
            if (!givenAnswer) {
                return res.status(400).json({
                    error: antiBot.question
                        ? `Please answer the anti-bot question: ${antiBot.question}`
                        : "The anti-bot answer is required",
                });
            }
            if (givenAnswer.toLowerCase() !== expectedAnswer.toLowerCase()) {
                return res.status(400).json({ error: "That is not the right answer. Please try again." });
            }
        }

        if (typeof name !== "string" || !name.trim()) {
            return res.status(400).json({ error: "Name is required" });
        }
        if (typeof message !== "string" || !message.trim()) {
            return res.status(400).json({ error: "Message is required" });
        }
        if (name.length > GUESTBOOK_LIMITS.name) {
            return res.status(400).json({ error: `Name must be at most ${GUESTBOOK_LIMITS.name} characters` });
        }
        if (message.length > GUESTBOOK_LIMITS.message) {
            return res.status(400).json({ error: `Message must be at most ${GUESTBOOK_LIMITS.message} characters` });
        }
        if (website !== undefined && website !== null && website !== "") {
            if (typeof website !== "string" || website.length > GUESTBOOK_LIMITS.website) {
                return res.status(400).json({ error: "Website is not valid" });
            }
        }

        const dbData = await readDatabase();
        const newEntry = {
            id: nextId(dbData.guestbooks),
            createdAt: new Date().toISOString(),
            status: "created",
            name: name.trim(),
            message: message.trim(),
            website: typeof website === "string" ? website.trim() : "",
        };
        dbData.guestbooks.push(newEntry);
        await writeDatabase(dbData);
        res.json({ message: "Guestbook entry added!", data: newEntry });
    } catch (error) {
        log(`Failed to post guestbook: ${error.message}`, 'error');
        res.status(500).json({ error: error.message });
    }
});

// Update guestbook
api.put("/guestbooks/:id", requireAuth, async (req, res) => {
    try {
        const dbData = await readDatabase();
        const updated = updateById(dbData.guestbooks, parseInt(req.params.id), req.body);
        if (!updated) {
            return res.status(404).json({ message: "Guestbook entry not found" });
        }
        await writeDatabase(dbData);
        res.json({ message: "Guestbook entry updated!", data: updated });
    } catch (error) {
        log(`Failed to update guestbook: ${error.message}`, 'error');
        res.status(500).json({ error: error.message });
    }
});

// Delete guestbook
api.delete("/guestbooks/:id", requireAuth, async (req, res) => {
    try {
        const dbData = await readDatabase();
        const index = dbData.guestbooks.findIndex((entry) => entry.id === parseInt(req.params.id));
        if (index === -1) {
            return res.status(404).json({ message: "Guestbook entry not found" });
        }
        dbData.guestbooks.splice(index, 1);
        await writeDatabase(dbData);
        res.json({ message: "Guestbook entry deleted!" });
    } catch (error) {
        log(`Failed to delete guestbook: ${error.message}`, 'error');
        res.status(500).json({ error: error.message });
    }
});

// Projects CRUD
api.get("/projects", async (req, res) => {
    try {
        const dbData = await readDatabase();
        let projects = [...dbData.projects];
        const totalProjects = projects.length;
        if (req.query.sort === "true") {
            projects.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }
        const limit = parseInt(req.query.limit) || 10;
        const page = parseInt(req.query.page) || 1;
        const startIndex = (page - 1) * limit;
        projects = projects.slice(startIndex, startIndex + limit);
        res.json({ data: projects, total: totalProjects });
    } catch (error) {
        log(`Failed to read projects: ${error.message}`, 'error');
        res.status(500).json({ error: error.message });
    }
});

// Add project
api.post("/projects", requireAuth, async (req, res) => {
    try {
        const dbData = await readDatabase();
        // Spread first so a caller-supplied id/createdAt cannot override the server-assigned ones.
        const newEntry = { ...req.body, id: nextId(dbData.projects), createdAt: new Date().toISOString(), status: "created" };
        dbData.projects.push(newEntry);
        await writeDatabase(dbData);
        res.json({ message: "Project added!", data: newEntry });
    } catch (error) {
        log(`Failed to post project: ${error.message}`, 'error');
        res.status(500).json({ error: error.message });
    }
});

// Update project
api.put("/projects/:id", requireAuth, async (req, res) => {
    try {
        const dbData = await readDatabase();
        const updated = updateById(dbData.projects, parseInt(req.params.id), req.body);
        if (!updated) {
            return res.status(404).json({ message: "Project not found" });
        }
        await writeDatabase(dbData);
        res.json({ message: "Project updated!", data: updated });
    } catch (error) {
        log(`Failed to update project: ${error.message}`, 'error');
        res.status(500).json({ error: error.message });
    }
});

// Get project
api.get("/projects/:id", async (req, res) => {
    try {
        const dbData = await readDatabase();
        const project = dbData.projects.find((project) => project.id === parseInt(req.params.id));
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }
        res.json(project);
    } catch (error) {
        log(`Failed to read project: ${error.message}`, 'error');
        res.status(500).json({ error: error.message });
    }
});

// Delete project
api.delete("/projects/:id", requireAuth, async (req, res) => {
    try {
        const dbData = await readDatabase();
        const index = dbData.projects.findIndex((project) => project.id === parseInt(req.params.id));
        if (index === -1) {
            return res.status(404).json({ message: "Project not found" });
        }
        dbData.projects.splice(index, 1);
        await writeDatabase(dbData);
        res.json({ message: "Project deleted!" });
    } catch (error) {
        log(`Failed to delete project: ${error.message}`, 'error');
        res.status(500).json({ error: error.message });
    }
});

// Articles CRUD
api.get("/articles", async (req, res) => {
    try {
        const dbData = await readDatabase();
        let articles = [...dbData.articles];
        const totalArticles = articles.length;
        if (req.query.sort === "true") {
            articles.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }
        const limit = parseInt(req.query.limit) || 10;
        const page = parseInt(req.query.page) || 1;
        const startIndex = (page - 1) * limit;
        articles = articles.slice(startIndex, startIndex + limit);
        res.json({ data: articles, total: totalArticles });
    } catch (error) {
        log(`Failed to read articles: ${error.message}`, 'error');
        res.status(500).json({ error: error.message });
    }
});

api.post("/articles", requireAuth, async (req, res) => {
    try {
        const dbData = await readDatabase();
        const newEntry = { ...req.body, id: nextId(dbData.articles), createdAt: new Date().toISOString(), status: "created" };
        dbData.articles.push(newEntry);
        await writeDatabase(dbData);
        res.json({ message: "Article added!", data: newEntry });
    } catch (error) {
        log(`Failed to post article: ${error.message}`, 'error');
        res.status(500).json({ error: error.message });
    }
});

api.get("/articles/:id", async (req, res) => {
    try {
        const dbData = await readDatabase();
        const article = dbData.articles.find((article) => article.id === parseInt(req.params.id));
        if (!article) {
            return res.status(404).json({ message: "Article not found" });
        }
        res.json(article);
    } catch (error) {
        log(`Failed to read article: ${error.message}`, 'error');
        res.status(500).json({ error: error.message });
    }
});

// Update article
api.put("/articles/:id", requireAuth, async (req, res) => {
    try {
        const dbData = await readDatabase();
        const updated = updateById(dbData.articles, parseInt(req.params.id), req.body);
        if (!updated) {
            return res.status(404).json({ message: "Article not found" });
        }
        await writeDatabase(dbData);
        res.json({ message: "Article updated!", data: updated });
    } catch (error) {
        log(`Failed to update article: ${error.message}`, 'error');
        res.status(500).json({ error: error.message });
    }
});

// Delete article
api.delete("/articles/:id", requireAuth, async (req, res) => {
    try {
        const dbData = await readDatabase();
        const index = dbData.articles.findIndex((article) => article.id === parseInt(req.params.id));
        if (index === -1) {
            return res.status(404).json({ message: "Article not found" });
        }
        dbData.articles.splice(index, 1);
        await writeDatabase(dbData);
        res.json({ message: "Article deleted!" });
    } catch (error) {
        log(`Failed to delete article: ${error.message}`, 'error');
        res.status(500).json({ error: error.message });
    }
});

// Posts CRUD
api.get("/posts", async (req, res) => {
    try {
        const dbData = await readDatabase();
        res.json({ data: dbData.posts, total: dbData.posts.length });
    } catch (error) {
        log(`Failed to read posts: ${error.message}`, 'error');
        res.status(500).json({ error: error.message });
    }
});

api.post("/posts", requireAuth, async (req, res) => {
    try {
        const dbData = await readDatabase();
        const newEntry = { ...req.body, id: nextId(dbData.posts), createdAt: new Date().toISOString(), status: "created" };
        dbData.posts.push(newEntry);
        await writeDatabase(dbData);
        res.json({ message: "Post added!", data: newEntry });
    } catch (error) {
        log(`Failed to post blog post: ${error.message}`, 'error');
        res.status(500).json({ error: error.message });
    }
});

api.get("/posts/:id", async (req, res) => {
    try {
        const dbData = await readDatabase();
        const post = dbData.posts.find((post) => post.id === parseInt(req.params.id));
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }
        res.json(post);
    } catch (error) {
        log(`Failed to read post: ${error.message}`, 'error');
        res.status(500).json({ error: error.message });
    }
});

// Update post
api.put("/posts/:id", requireAuth, async (req, res) => {
    try {
        const dbData = await readDatabase();
        const updated = updateById(dbData.posts, parseInt(req.params.id), req.body);
        if (!updated) {
            return res.status(404).json({ message: "Post not found" });
        }
        await writeDatabase(dbData);
        res.json({ message: "Post updated!", data: updated });
    } catch (error) {
        log(`Failed to update post: ${error.message}`, 'error');
        res.status(500).json({ error: error.message });
    }
});

// Delete post
api.delete("/posts/:id", requireAuth, async (req, res) => {
    try {
        const dbData = await readDatabase();
        const index = dbData.posts.findIndex((post) => post.id === parseInt(req.params.id));
        if (index === -1) {
            return res.status(404).json({ message: "Post not found" });
        }
        dbData.posts.splice(index, 1);
        await writeDatabase(dbData);
        res.json({ message: "Post deleted!" });
    } catch (error) {
        log(`Failed to delete post: ${error.message}`, 'error');
        res.status(500).json({ error: error.message });
    }
});


// Base URL for uploaded files. When this process serves the frontend too, the files sit on the
// same origin, so a relative URL is used — stored content then survives a domain change. Only
// the split dev setup (frontend on :5173, API on :3000) needs an absolute URL.
const uploadsBase = (req) => (SERVE_FRONTEND ? "/uploads" : `${req.protocol}://${req.get('host')}/uploads`);

// Image upload endpoint
api.post("/upload", requireAuth, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }
        const imageUrl = `${uploadsBase(req)}/${req.file.filename}`;
        res.json({
            message: "File uploaded successfully",
            url: imageUrl
        });
    } catch (error) {
        log(`Failed to upload file: ${error.message}`, 'error');
        res.status(500).json({ error: error.message });
    }
});

// List uploaded files
api.get("/uploads", requireAuth, async (req, res) => {
    try {
        let entries;
        try {
            entries = await fs.readdir(UPLOADS_DIR);
        } catch (err) {
            if (err.code === 'ENOENT') return res.json({ data: [], total: 0 });
            throw err;
        }
        const base = uploadsBase(req);
        const files = await Promise.all(entries.map(async (name) => {
            const stat = await fs.stat(path.join(UPLOADS_DIR, name));
            if (!stat.isFile()) return null;
            const ext = path.extname(name).toLowerCase();
            return {
                name,
                size: stat.size,
                modifiedAt: stat.mtime.toISOString(),
                url: `${base}/${name}`,
                isPdf: ext === '.pdf',
                isImage: ['.jpg', '.jpeg', '.png', '.gif'].includes(ext),
            };
        }));
        const filtered = files.filter(Boolean).sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
        res.json({ data: filtered, total: filtered.length });
    } catch (error) {
        log(`Failed to list uploads: ${error.message}`, 'error');
        res.status(500).json({ error: error.message });
    }
});

// Delete an uploaded file
api.delete("/uploads/:filename", requireAuth, async (req, res) => {
    try {
        // Strip any path component so callers can't traverse out of UPLOADS_DIR
        const safeName = path.basename(req.params.filename);
        if (!safeName || safeName === '.' || safeName === '..') {
            return res.status(400).json({ error: "Invalid filename" });
        }
        const target = path.join(UPLOADS_DIR, safeName);
        try {
            await fs.unlink(target);
        } catch (err) {
            if (err.code === 'ENOENT') return res.status(404).json({ message: "File not found" });
            throw err;
        }
        res.json({ message: "File deleted!", filename: safeName });
    } catch (error) {
        log(`Failed to delete upload: ${error.message}`, 'error');
        res.status(500).json({ error: error.message });
    }
});

// Mount the API. /api is the canonical prefix and is what the frontend calls. When this process
// is not also serving the SPA there is nothing to collide with, so the endpoints stay available
// at the root too — that keeps the development setup and any existing API clients working.
app.use("/api", api);
if (!SERVE_FRONTEND) {
    app.use(api);
}

// ---------------------------------------------------------------------------
// Frontend (production)
//
// In production this process also serves the Vite build, so the site and its API share one origin
// and one port. Registered after every API route: anything that did not match above is a client
// side route and gets index.html.
// ---------------------------------------------------------------------------
const INDEX_HTML_PATH = path.join(DIST_DIR, "index.html");

// Everything injected below comes from owner-editable config, so it is untrusted as far as the
// HTML parser is concerned: a stray quote in a site description would otherwise break out of the
// attribute it sits in. Escaped once, centrally, rather than remembered at each call site.
const escapeHtml = (value) =>
    String(value === undefined || value === null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

// Resolve a possibly-relative asset path (e.g. an uploaded /uploads/og.png) against the site URL.
// Link previews are fetched by other servers, which have no notion of "relative to your origin".
const absoluteUrl = (value, siteUrl) => {
    if (!value) return "";
    if (/^https?:\/\//i.test(value)) return value;
    if (!siteUrl) return value;
    try {
        return new URL(value, siteUrl).toString();
    } catch {
        return value;
    }
};

// Build the <head> tags for one request. Falls back through meta -> profile so a site that never
// touched the SEO tab still gets a real title and description instead of an empty tag.
const buildHeadTags = (configData, req) => {
    const meta = (configData && configData.meta) || {};
    const profile = (configData && configData.profile) || {};
    const brand = profile.brand || {};

    const title = meta.title || brand.displayName || profile.fullName || "Portfolio";
    const description = meta.description || profile.bio || "";
    const siteUrl = meta.siteUrl || "";
    const image = absoluteUrl(meta.ogImage || brand.logoUrl || "", siteUrl);
    const favicon = meta.faviconUrl || "/image.png";
    const twitterHandle = meta.twitterHandle || "";
    // Per-request canonical URL: crawlers should see the page they actually fetched, not the home
    // page, otherwise every client-side route dedupes into one result.
    let pageUrl = siteUrl;
    if (siteUrl) {
        try {
            pageUrl = new URL(req.originalUrl || req.path || "/", siteUrl).toString();
        } catch {
            pageUrl = siteUrl;
        }
    }

    const tags = [
        `<title>${escapeHtml(title)}</title>`,
        `<link rel="icon" href="${escapeHtml(favicon)}" />`,
        `<meta property="og:type" content="website" />`,
        `<meta property="og:title" content="${escapeHtml(title)}" />`,
        `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
        `<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}" />`,
    ];
    if (description) {
        tags.push(`<meta name="description" content="${escapeHtml(description)}" />`);
        tags.push(`<meta property="og:description" content="${escapeHtml(description)}" />`);
        tags.push(`<meta name="twitter:description" content="${escapeHtml(description)}" />`);
    }
    if (pageUrl) {
        tags.push(`<meta property="og:url" content="${escapeHtml(pageUrl)}" />`);
        tags.push(`<link rel="canonical" href="${escapeHtml(pageUrl)}" />`);
    }
    if (image) {
        tags.push(`<meta property="og:image" content="${escapeHtml(image)}" />`);
        tags.push(`<meta name="twitter:image" content="${escapeHtml(image)}" />`);
    }
    if (twitterHandle) {
        tags.push(`<meta name="twitter:site" content="${escapeHtml(twitterHandle)}" />`);
    }
    return `\n    ${tags.join("\n    ")}\n  `;
};

/**
 * Remove the static head tags that `buildHeadTags` is about to replace.
 *
 * index.html ships generic defaults so that an unconfigured clone, and any crawler that never runs
 * our JavaScript, still sees something sensible. But injecting on top of them left the document with
 * two <title> elements and two of every description/og/twitter tag — and consumers take the FIRST
 * occurrence, so the generic default silently won and the owner's configured values were ignored.
 * Strip first, then inject.
 *
 * Only the tags we re-emit are removed; charset, viewport, the module script and the stylesheet are
 * left exactly where the build put them.
 */
const stripReplaceableHeadTags = (html) => {
    const headEnd = html.indexOf("</head>");
    if (headEnd === -1) return html;

    const head = html.slice(0, headEnd);
    const rest = html.slice(headEnd);

    const cleanedHead = head
        .replace(/[^\S\n]*<title>[\s\S]*?<\/title>\n?/gi, "")
        .replace(/[^\S\n]*<meta\s+name=["'](description|twitter:[^"']+)["'][^>]*>\n?/gi, "")
        .replace(/[^\S\n]*<meta\s+property=["']og:[^"']+["'][^>]*>\n?/gi, "")
        .replace(/[^\S\n]*<link\s+[^>]*rel=["'][^"']*icon[^"']*["'][^>]*>\n?/gi, "");

    return cleanedHead + rest;
};

if (SERVE_FRONTEND) {
    // cacheControl:false, not just an omitted maxAge — express.static still emits
    // "max-age=0" otherwise, which would conflict with the Cache-Control the reverse proxy sets.
    app.use(express.static(DIST_DIR, { index: false, cacheControl: false }));

    // The build output never changes while the process runs, so it is read once. The config is
    // re-read per request instead: it is a few KB and changes whenever the owner saves the
    // dashboard, and a title that only updates on restart is a bug waiting to be reported.
    let indexHtmlCache = null;
    const readIndexHtml = async () => {
        if (indexHtmlCache === null) indexHtmlCache = await fs.readFile(INDEX_HTML_PATH, "utf8");
        return indexHtmlCache;
    };

    // This is a single-page app: without server-rendered head tags a crawler or a link preview
    // bot sees an empty <div id="app">, because neither runs the JavaScript that would fill it in.
    app.get("*", async (req, res, next) => {
        if (req.path.startsWith("/uploads")) return next();
        try {
            const [rawHtml, configData] = await Promise.all([readIndexHtml(), readConfig()]);
            if (rawHtml.indexOf("</head>") === -1) throw new Error("index.html has no </head>");
            // Strip the static defaults before injecting, or the document ends up with two of
            // every tag and the first (generic) one wins.
            const html = stripReplaceableHeadTags(rawHtml);
            const closingHead = html.indexOf("</head>");
            const tags = buildHeadTags(configData, req);
            res.type("html").send(html.slice(0, closingHead) + tags + html.slice(closingHead));
        } catch (error) {
            // Serving a page with weak SEO beats serving a 500. Any failure here — unreadable
            // config, malformed HTML — degrades to exactly the previous behaviour.
            log(`Falling back to raw index.html: ${error.message}`, "warn");
            res.sendFile(INDEX_HTML_PATH);
        }
    });
}

// Catch-all error handler. Without it, multer rejections (file too large, disallowed type) fall
// through to Express's default handler and return an HTML stack trace instead of JSON.
app.use((err, req, res, _next) => {
    const isMulterLimit = err && err.code === "LIMIT_FILE_SIZE";
    const status = isMulterLimit ? 413 : 400;
    log(`Request failed: ${err.message}`, "error");
    res.status(status).json({
        error: isMulterLimit ? "File is too large. The limit is 5MB." : err.message || "Request failed",
    });
});

// Start server
const startServer = async () => {
    await initializeDatabase();
    await initializeConfig();
    // Validate before seeding and before listening: a production box with a broken environment
    // must not bind a port, must not half-write config.json, and must exit with a message an
    // operator can act on. Config has to exist first so validation can tell "no admin signature
    // anywhere" (fatal) apart from "already set up, env no longer needed" (fine).
    await validateEnvironment();
    await bootstrapConfig();
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    app.listen(PORT, HOST, () => {
        log(`Server running in ${NODE_ENV} mode on http://${HOST}:${PORT}`);
        if (SERVE_FRONTEND) {
            log("Serving the frontend build from dist/ on the same origin.");
        } else if (IS_PRODUCTION) {
            log("NODE_ENV=production but dist/ is missing — run `yarn build` first.", "warn");
        }
    });
};

startServer();
