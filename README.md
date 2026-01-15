# Blue Perfumery Backend API

REST API for Blue Perfumery e-commerce platform with AI-powered chatbot integration, built with Express.js, MongoDB, and TypeScript.

🌐 **Live API**: [blueperfumery-backend.vercel.app/api](https://blueperfumery-backend.vercel.app/api)

## Tech Stack

| Technology    | Version | Purpose        |
| ------------- | ------- | -------------- |
| Node.js       | 18+     | Runtime        |
| Express.js    | 4.18+   | Web Framework  |
| MongoDB       | -       | Database       |
| Mongoose      | 8.0+    | ODM            |
| TypeScript    | 5.3+    | Type Safety    |
| Anthropic SDK | 0.71+   | AI Integration |
| JWT           | 9.0+    | Authentication |

## AI Integration

### Librarian Agent - "Mira" (Claude 3.5 Haiku)

AI-powered perfume consultant that provides:

- Personalized recommendations based on user profiling
- Natural conversation with context awareness
- Product search and similarity matching
- Security filtering (profanity, off-topic detection)

```typescript
// POST /api/agent/chat
{
  "message": "Erkek parfümü arıyorum",
  "conversationHistory": []
}
```

## Features

- **RESTful API** - Products, Users, Chat Sessions
- **AI Chatbot** - Claude Haiku integration for recommendations
- **Advanced Filtering** - Gender, category, price, notes
- **Pagination** - Efficient data loading
- **Security** - Helmet, CORS, input validation

## Getting Started

```bash
# Install dependencies
npm install

# Create .env file
cat > .env << EOF
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/blueperfumery
JWT_SECRET=your-secret-key
ANTHROPIC_API_KEY=your-anthropic-key
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
EOF

# Start development server
npm run dev
```

## API Endpoints

### Products

| Method | Endpoint            | Description                  |
| ------ | ------------------- | ---------------------------- |
| GET    | `/api/products`     | List products (with filters) |
| GET    | `/api/products/:id` | Get product by ID            |
| POST   | `/api/products`     | Create product               |
| PUT    | `/api/products/:id` | Update product               |
| DELETE | `/api/products/:id` | Delete product               |

### Users

| Method | Endpoint         | Description    |
| ------ | ---------------- | -------------- |
| GET    | `/api/users`     | List users     |
| GET    | `/api/users/:id` | Get user by ID |
| POST   | `/api/users`     | Create user    |
| PUT    | `/api/users/:id` | Update user    |
| DELETE | `/api/users/:id` | Delete user    |

### AI Agent

| Method | Endpoint             | Description        |
| ------ | -------------------- | ------------------ |
| POST   | `/api/agent/chat`    | Chat with Mira AI  |
| GET    | `/api/chat-sessions` | List chat sessions |
| POST   | `/api/chat-sessions` | Save chat message  |

## Project Structure

```
src/
├── agents/             # AI Agents
│   └── librarian/      # Mira - Perfume Consultant
├── controllers/        # Route handlers
├── models/             # Mongoose models
├── routes/             # API routes
├── middleware/         # Express middleware
├── utils/              # Utility functions
└── config/             # Database config
```

## Environment Variables

| Variable            | Description                 |
| ------------------- | --------------------------- |
| `PORT`              | Server port (default: 5000) |
| `MONGODB_URI`       | MongoDB connection string   |
| `JWT_SECRET`        | JWT signing key             |
| `ANTHROPIC_API_KEY` | Claude API key              |
| `CORS_ORIGIN`       | Allowed origins             |

## Scripts

| Command           | Description             |
| ----------------- | ----------------------- |
| `npm run dev`     | Start dev server        |
| `npm run build`   | Compile TypeScript      |
| `npm start`       | Start production server |
| `npm run migrate` | Migrate data to DB      |

## License

ISC
