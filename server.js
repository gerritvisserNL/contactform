import express from "express";
import nodemailer from "nodemailer"; // Nodemailer importeren
import cors from "cors";
import rateLimit from "express-rate-limit";
import sanitizeHtml from "sanitize-html";
import helmet from "helmet";

const corsOptions = {
  origin: process.env.CORS_ORIGIN || "https://www.gerritvisser.nl", // Stel hier het toegestane domein in
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
  credentials: true, // Zorg ervoor dat cookies en credentials mee worden gestuurd
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

app.set("trust proxy", 1); // Vertrouw op de eerste proxy in de keten

// Stel de limiet in (bijv. maximaal 10 verzoeken per minuut per IP)
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuut
  max: 10, // Maximaal 10 verzoeken
  message: "Te veel verzoeken vanaf dit IP. Probeer het later opnieuw.",
  trustProxy: 1, // Vertrouw alleen de eerste proxy
});

const sanitizeInput = (input) => {
  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
  });
};

// Middleware
app.use(express.json());
app.use(express.static("public"));
app.use(cors(corsOptions)); // Voeg dit toe om CORS te activeren
app.use(helmet());
app.use("/api/contact", limiter);

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"], // Alleen resources van je eigen domein toestaan
    },
  })
);

app.use(
  helmet.hsts({
    maxAge: 31536000, // 1 jaar in seconden
    includeSubDomains: true, // HSTS toepassen op subdomeinen
    preload: true, // Laat je domein pre-loaden in HSTS lijsten
  })
);

app.options("/api/contact", cors(corsOptions)); // Allow preflight requests

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

// import express from "express";
// import cors from "cors";
// import sanitizeHtml from "sanitize-html";
// import rateLimit from "express-rate-limit";
// import csrf from "csurf";
// import helmet from "helmet";
// import nodemailer from "nodemailer"; // Nodemailer importeren
// import cookieParser from "cookie-parser";

// const app = express();
// const PORT = process.env.PORT || 3000;

// // CSRF Protection Middleware
// const csrfProtection = csrf({
//   cookie: {
//     httpOnly: true,
//     secure: process.env.NODE_ENV === "production",
//     sameSite: "Strict",
//   },
// });

// // CORS instellingen
// const corsOptions = {
//   origin: process.env.CORS_ORIGIN,
//   methods: ["GET", "POST"],
//   credentials: true,
// };

// // Nodemailer configuratie
// const transporter = nodemailer.createTransport({
//   host: "smtp.gmail.com",
//   port: 587,
//   secure: false,
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });

// // Middleware
// app.use(cors(corsOptions));
// app.use(express.json());
// app.use(express.static("public"));
// app.use(cookieParser());
// // app.use(csrfProtection);
// app.use(helmet());

// app.use("/api/csrf-token", (req, res, next) => next());

// // Beveiliging van invoer
// const sanitizeInput = (input) => {
//   return sanitizeHtml(input, {
//     allowedTags: [],
//     allowedAttributes: {},
//   });
// };

// // Limiteer het aantal aanvragen
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 100,
//   message: "Te veel verzoeken vanaf dit IP, probeer later opnieuw.",
// });
// app.use("/api/contact", limiter);

// // POST route voor contactformulier
// app.post("/api/contact", async (req, res) => {
//   const { name, email, message } = req.body;

//   // Validatie van de velden
//   if (!name || name.length < 2 || name.length > 50) {
//     return res
//       .status(400)
//       .json({ message: "Naam moet tussen 2 en 50 tekens zijn." });
//   }

//   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//   if (!emailRegex.test(email)) {
//     return res.status(400).json({ message: "Ongeldig e-mailadres." });
//   }

//   if (!message || message.length < 10 || message.length > 1000) {
//     return res
//       .status(400)
//       .json({ message: "Bericht moet tussen 10 en 1000 tekens zijn." });
//   }

//   // Sanitize de invoer
//   const sanitizedData = {
//     name: sanitizeInput(name),
//     email: sanitizeInput(email),
//     message: sanitizeInput(message),
//   };

//   // Verstuur de e-mail
//   try {
//     await transporter.sendMail({
//       from: `"${sanitizedData.name}" <${sanitizedData.email}>`,
//       to: process.env.RECEIVER_EMAIL, // Ontvanger instellen als omgevingsvariabele
//       subject: "Nieuw contactformulierbericht",
//       text: `Naam: ${sanitizedData.name}\nE-mail: ${sanitizedData.email}\nBericht: ${sanitizedData.message}`,
//     });

//     res.status(200).json({
//       message: "Bericht ontvangen en verstuurd naar je e-mail. Bedankt!",
//     });
//   } catch (error) {
//     console.error("Fout bij het versturen van e-mail:", error);
//     res.status(500).json({
//       message: "Er ging iets mis bij het versturen van je bericht.",
//     });
//   }
// });

// app.get("/api/csrf-token", (req, res) => {
//   res.cookie("_csrf", req.csrfToken(), {
//     httpOnly: true, // Alleen toegankelijk via HTTP, niet via JavaScript
//     secure: process.env.NODE_ENV === "production", // Alleen via HTTPS in productie
//     sameSite: process.env.NODE_ENV === "production" ? "Strict" : "Lax",
//   });
//   res.json({ csrfToken: req.csrfToken() });
// });

// // Start de server
// app.listen(PORT, () => {
//   console.log(`Server draait op poort ${PORT}`);
// });
