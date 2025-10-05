import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { connectDatabase } from "./config/database";
import routes from "./routes";
import { errorHandler, notFound } from "./middleware/errorHandler";

// Load environment variables
dotenv.config();

// Create Express app
const app: Application = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet()); // Security headers
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") || [
      "http://localhost:3000",
      "http://localhost:5173",
    ],
    credentials: true,
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
      console.log(`\n✨ Ready to serve requests!\n`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

export default app;

