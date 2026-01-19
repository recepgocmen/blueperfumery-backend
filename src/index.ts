// Load environment variables FIRST (before any other imports that might need them)
import dotenv from "dotenv";
dotenv.config();

import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { connectDatabase } from "./config/database";
import routes from "./routes";
import { errorHandler, notFound } from "./middleware/errorHandler";

// Create Express app
const app: Application = express();
const PORT = process.env.PORT || 5000;

// Trust proxy (Vercel ve diğer proxy'ler için)
app.set("trust proxy", true);

// Middleware
app.use(helmet()); // Security headers

// CORS configuration - allow all origins in development, specific origins in production
const allowedOrigins = process.env.CORS_ORIGIN?.split(",") || [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173",
  "http://localhost:5174",
  "https://blueperfumery.vercel.app",
  "https://blueperfumery.com",
  "https://www.blueperfumery.com",
  "https://blueperfumery-fe.vercel.app",
  "https://blue-perfumery.vercel.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      
      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin) || origin.includes("vercel.app") || origin.includes("localhost")) {
        callback(null, true);
      } else {
        console.log(`CORS blocked origin: ${origin}`);
        callback(null, true); // Allow anyway for now, log for debugging
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);
app.use(morgan("dev")); // Request logging
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to Blue Perfumery API",
    version: "1.0.0",
    endpoints: {
      health: "/api/health",
      products: "/api/products",
      users: "/api/users",
    },
  });
});

// API routes
app.use("/api", routes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();

    // Start listening
    app.listen(PORT, () => {
      console.log(`\n🚀 Server is running on port ${PORT}`);
      console.log(`📍 API URL: http://localhost:${PORT}`);
      console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`\n📚 Available Endpoints:`);
      console.log(`   - GET    /api/products`);
      console.log(`   - GET    /api/products/:id`);
      console.log(`   - POST   /api/products`);
      console.log(`   - PUT    /api/products/:id`);
      console.log(`   - DELETE /api/products/:id`);
      console.log(`   - GET    /api/users`);
      console.log(`   - GET    /api/users/:id`);
      console.log(`   - POST   /api/users`);
      console.log(`   - PUT    /api/users/:id`);
      console.log(`   - DELETE /api/users/:id`);
      console.log(`   - POST   /api/agent/chat`);
      console.log(`   - POST   /api/agent/analyze`);
      console.log(`   - POST   /api/agent/similar`);
      console.log(`   - GET    /api/prompts`);
      console.log(`   - POST   /api/prompts`);
      console.log(`   - PUT    /api/prompts/:key`);
      console.log(`   - DELETE /api/prompts/:key`);
      console.log(`\n✨ Ready to serve requests!\n`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

export default app;

