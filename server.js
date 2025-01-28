import express from "express";
import nodemailer from "nodemailer";
import cors from "cors";
import rateLimit from "express-rate-limit";
import sanitizeHtml from "sanitize-html";
import helmet from "helmet";
import csrf from "csurf";
import cookieParser from "cookie-parser";

// CSRF-beveiliging instellen
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
  },
});

const corsOptions = {
  origin: process.env.CORS_ORIGIN || "https://www.gerritvisser.nl",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "CSRF-Token"],
  credentials: true,
  optionsSuccessStatus: 204,
};

const app = express();
const PORT = process.env.PORT || 3000;

// Vertrouw op de X-Forwarded-For header
app.set("trust proxy", true);

// Nodemailer configuratie
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuut
  max: 10,
  message: "Te veel verzoeken vanaf dit IP. Probeer het later opnieuw.",
  trustProxy: true,
});

const sanitizeInput = (input) => {
  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
  });
};

app.set("view engine", "ejs");

// Middleware
app.use(express.json());
app.use(express.static("public"));
app.use(cors(corsOptions));
app.use(helmet());
app.use(cookieParser());
app.use("/api/contact", limiter);
app.use(csrfProtection); // Gebruik enkel csrfProtection hier

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "https://contactform-htfd.onrender.com/api/contact",
        "https://www.gerritvisser.nl",
      ],
      connectSrc: [
        "'self'",
        "https://contactform-htfd.onrender.com/api/contact",
        "https://www.gerritvisser.nl",
      ],
    },
  })
);

app.use(
  helmet.hsts({
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  })
);

app.options("/api/contact", cors(corsOptions)); // Allow preflight requests

// GET route voor CSRF-token
app.get("/api/csrf-token", (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

app.get("/", (req, res) => {
  res.render("index", { csrfToken: req.csrfToken() });
});

// POST route voor contactformulier
app.post("/api/contact", async (req, res) => {
  const { name, email, message } = req.body;

  // Validatie van de velden
  if (!name || name.length < 2 || name.length > 50) {
    return res
      .status(400)
      .json({ message: "Naam moet tussen 2 en 50 tekens zijn." });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Ongeldig e-mailadres." });
  }

  if (!message || message.length < 10 || message.length > 1000) {
    return res
      .status(400)
      .json({ message: "Bericht moet tussen 10 en 1000 tekens zijn." });
  }

  // Pas sanitatie toe
  const sanitizedData = {
    name: sanitizeInput(name),
    email: sanitizeInput(email),
    message: sanitizeInput(message),
  };

  // Verstuur de e-mail
  try {
    await transporter.sendMail({
      from: `"${sanitizedData.name}" <${sanitizedData.email}>`,
      to: process.env.RECEIVER_EMAIL,
      subject: "Nieuw contactformulierbericht",
      text: `Naam: ${sanitizedData.name}\nE-mail: ${sanitizedData.email}\nBericht: ${sanitizedData.message}`,
    });

    res.status(200).json({
      message: "Bericht ontvangen en verstuurd naar je e-mail. Bedankt!",
    });
  } catch (error) {
    console.error("Fout bij het versturen van e-mail:", error);
    res.status(500).json({
      message: "Er ging iets mis bij het versturen van je bericht.",
    });
  }
});

// Start de server
app.listen(PORT, () => {
  console.log(`Server draait op poort ${PORT}`);
});
