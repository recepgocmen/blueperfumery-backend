# Blue Perfumery Backend API

MongoDB + Express + TypeScript backend for Blue Perfumery application.

## 🚀 Features

- **RESTful API** with Express.js
- **MongoDB** database with Mongoose ODM
- **TypeScript** for type safety
- **CRUD Operations** for Products and Users
- **Advanced Filtering** and pagination
- **Error Handling** middleware
- **CORS** enabled
- **Security** with Helmet
- **Request Logging** with Morgan

## 📦 Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB ODM
- **TypeScript** - Type safety
- **bcryptjs** - Password hashing
- **JWT** - Authentication (ready for implementation)

## 🛠️ Installation

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or MongoDB Atlas)

### Setup Steps

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create .env file**

   ```bash
   # Copy the example below to a new .env file
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/blueperfumery
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRE=7d
   CORS_ORIGIN=http://localhost:3000,http://localhost:5173
   ```

3. **Start MongoDB**

   If using local MongoDB:

   ```bash
   mongod
   ```

   Or use MongoDB Atlas (cloud):

   - Create account at mongodb.com/atlas
   - Create cluster
   - Get connection string
   - Update MONGODB_URI in .env

4. **Run Development Server**

   ```bash
   npm run dev
   ```

5. **Build for Production**
   ```bash
   npm run build
   npm start
   ```

## 📚 API Endpoints

### Health Check

```
GET /api/health
```

### Products

| Method | Endpoint                   | Description        | Query Params                                                                                                      |
| ------ | -------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/products`            | Get all products   | `page`, `limit`, `gender`, `category`, `brand`, `status`, `search`, `minPrice`, `maxPrice`, `sortBy`, `sortOrder` |
| GET    | `/api/products/:id`        | Get product by ID  | -                                                                                                                 |
| POST   | `/api/products`            | Create new product | -                                                                                                                 |
| PUT    | `/api/products/:id`        | Update product     | -                                                                                                                 |
| DELETE | `/api/products/:id`        | Delete product     | -                                                                                                                 |
| GET    | `/api/products/brands`     | Get all brands     | -                                                                                                                 |
| GET    | `/api/products/categories` | Get all categories | -                                                                                                                 |

### Users

| Method | Endpoint         | Description     | Query Params                                                       |
| ------ | ---------------- | --------------- | ------------------------------------------------------------------ |
| GET    | `/api/users`     | Get all users   | `page`, `limit`, `role`, `status`, `search`, `sortBy`, `sortOrder` |
| GET    | `/api/users/:id` | Get user by ID  | -                                                                  |
| POST   | `/api/users`     | Create new user | -                                                                  |
| PUT    | `/api/users/:id` | Update user     | -                                                                  |
| DELETE | `/api/users/:id` | Delete user     | -                                                                  |

## 🔄 Data Migration

To migrate existing perfume data from frontend to database:

```bash
npm run migrate
```

This will:

1. Connect to MongoDB
2. Clear existing products (if any)
3. Import all perfumes from frontend data
4. Create indexes

## 📂 Project Structure

```
blueperfumery-backend/
├── src/
│   ├── config/          # Database configuration
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Express middleware
│   ├── models/          # Mongoose models
│   ├── routes/          # API routes
│   ├── types/           # TypeScript types
│   ├── utils/           # Utility functions
│   └── index.ts         # App entry point
├── .env                 # Environment variables (create this!)
├── package.json
├── tsconfig.json
└── README.md
```

## 🔐 Environment Variables

| Variable      | Description               | Default                                       |
| ------------- | ------------------------- | --------------------------------------------- |
| `PORT`        | Server port               | `5000`                                        |
| `NODE_ENV`    | Environment               | `development`                                 |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/blueperfumery`     |
| `JWT_SECRET`  | JWT secret key            | -                                             |
| `JWT_EXPIRE`  | JWT expiration time       | `7d`                                          |
| `CORS_ORIGIN` | Allowed CORS origins      | `http://localhost:3000,http://localhost:5173` |

## 📝 Example API Requests

### Get Products with Filters

```bash
GET /api/products?gender=male&category=luxury&page=1&limit=10
```

### Create Product

```bash
POST /api/products
Content-Type: application/json

{
  "id": "unique-id",
  "name": "Product Name",
  "brand": "Brand Name",
  "description": "Description",
  "price": 1000,
  "ml": 50,
  "gender": "unisex",
  "category": "luxury",
  "stock": 10,
  "sku": "SKU-001",
  "notes": ["note1", "note2"],
  "characteristics": ["char1", "char2"],
  "ageRange": { "min": 20, "max": 45 }
}
```

## 🤝 Integration with Frontend & Admin Panel

### Frontend (Next.js)

Update your API calls to use: `http://localhost:5000/api`

### Admin Panel (React)

Update your API configuration to point to: `http://localhost:5000/api`

## 📊 Response Format

### Success Response

```json
{
  "success": true,
  "data": {},
  "message": "Optional success message"
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message"
}
```

### Paginated Response

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

## 🐛 Troubleshooting

### MongoDB Connection Error

- Check if MongoDB is running
- Verify MONGODB_URI in .env
- Check network/firewall settings

### Port Already in Use

- Change PORT in .env
- Kill process using the port: `lsof -ti:5000 | xargs kill -9`

## 📝 TODO

- [ ] Implement JWT authentication
- [ ] Add role-based access control
- [ ] Add order management
- [ ] Add analytics endpoints
- [ ] Add file upload for images
- [ ] Add unit tests
- [ ] Add API documentation (Swagger)

## 📄 License

ISC

