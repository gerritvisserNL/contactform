import express from "express";
import nodemailer from "nodemailer";
import cors from "cors";
import rateLimit from "express-rate-limit";
import sanitizeHtml from "sanitize-html";
import helmet from "helmet";
import csrf from "csurf";
import cookieParser from "cookie-parser";

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

app.set("trust proxy", true);

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
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: "Too many requests from this IP, please try again later.",
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
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cors(corsOptions));
app.use(helmet());
app.use(cookieParser());
app.use("/api/contact", limiter);
app.use(csrfProtection);

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

// GET route for CSRF token
app.get("/api/csrf-token", (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// GET route for the index page
app.get("/", (req, res) => {
  res.render("index", { csrfToken: req.csrfToken() });
});

// POST route for contact form
app.post("/api/contact", async (req, res) => {
  const { name, email, message } = req.body;

  // Validate fields
  if (!name || name.length < 2 || name.length > 50) {
    return res
      .status(400)
      .json({ message: "Name must be between 2 and 50 characters." });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Invalid email address." });
  }

  if (!message || message.length < 10 || message.length > 1000) {
    return res
      .status(400)
      .json({ message: "Message must be between 10 and 1000 characters." });
  }

  // Sanitize input
  const sanitizedData = {
    name: sanitizeInput(name),
    email: sanitizeInput(email),
    message: sanitizeInput(message),
  };

  // Send email
  try {
    await transporter.sendMail({
      from: `"${sanitizedData.name}" <${sanitizedData.email}>`,
      to: process.env.RECEIVER_EMAIL,
      subject: "New contact form message",
      text: `Name: ${sanitizedData.name}\nEmail: ${sanitizedData.email}\nMessage: ${sanitizedData.message}`,
    });

    res.status(200).json({
      message: "Message received and sent to your email. Thank you!",
    });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({
      message: "Something went wrong while sending your message.",
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
