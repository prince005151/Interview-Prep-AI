# AI Interview Prep

AI Interview Prep is a full-stack application that turns a job description and company research into a structured interview preparation kit. A kit can include requirements, interview questions, flashcards, and a time-boxed study schedule.

## Live Application

- Production URL: https://interview-prep-ai-1-r8im.onrender.com

## Features

- User registration and login with JWT authentication
- Password hashing with bcrypt
- Protected research and kit-generation endpoints
- Company website discovery with robots.txt awareness
- Job description requirement extraction and normalization
- Gemini-powered interview question and preparation content generation
- Requirement coverage validation before a kit is returned
- Study schedule generation based on available days and session length
- Responsive React dashboard for authentication, generation, and review
- Production serving of the built React application from Express
- Request security headers, CORS, rate limiting, and request logging

## Architecture

The repository is organized as a small monorepo with separate client and server applications:

```text
.
├── client/                    React + Vite frontend
│   ├── src/
│   │   ├── components/        Auth, kit form, and kit workbench UI
│   │   ├── services/          Browser API client
│   │   ├── App.jsx            Application state and page composition
│   │   └── index.css          Global styles
│   ├── public/
│   └── package.json
├── server/                    Express + MongoDB backend
│   ├── controllers/           Authentication controllers
│   ├── middleware/            JWT protection middleware
│   ├── models/                Mongoose schemas
│   ├── routes/                API route modules
│   ├── services/              Research, LLM, and generation logic
│   ├── tests/                 Node test suite
│   ├── server.js              Express application entry point
│   └── .env.example           Backend environment template
├── package.json               Root scripts and deployment build
├── server.js                  Root compatibility entry point
└── render.yaml                Render deployment blueprint
```

### Request flow

1. The user registers or logs in through the React client.
2. The server validates the request, stores users in MongoDB, and returns a JWT.
3. The client sends the JWT as a `Bearer` token on protected requests.
4. The generation endpoint extracts or normalizes requirements and optionally researches a company website.
5. The LLM service requests structured content from Gemini.
6. The generation service validates requirements, questions, and schedule coverage.
7. The client displays the resulting preparation kit in the dashboard and workbench.

## Technology Stack

### Frontend

- React 19
- Vite 8
- Tailwind CSS 3
- PostCSS and Autoprefixer
- Oxlint for frontend linting

### Backend

- Node.js
- Express 5
- Mongoose 8
- MongoDB Atlas or a local MongoDB instance
- JSON Web Tokens with `jsonwebtoken`
- `bcryptjs` for password hashing
- `dotenv` for environment configuration
- `cors` for cross-origin requests
- `helmet` for security headers
- `express-rate-limit` for API throttling
- `morgan` for HTTP request logging
- Node's built-in `fetch` for external research and LLM requests

### AI and external services

- Google Gemini API for structured interview content generation
- Company websites and public pages for research signals
- MongoDB Atlas for hosted database storage
- Render for production hosting

## Requirements

- Node.js 20 or newer recommended
- npm 10 or newer recommended
- A MongoDB database, either MongoDB Atlas or local MongoDB
- A Google AI Studio Gemini API key for AI generation

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/prince005151/Interview-Prep-AI.git
cd Interview-Prep-AI
```

### 2. Install dependencies

Install the root dependencies:

```bash
npm install
```

The root `postinstall` script builds the client automatically. To install or rebuild the client explicitly:

```bash
npm install --prefix client
npm run build --prefix client
```

The backend also has its own package manifest. It is only needed when working from inside the `server` directory:

```bash
npm install --prefix server
```

### 3. Configure environment variables

Create the backend environment file:

```bash
copy server\\.env.example server\\.env
```

On macOS or Linux:

```bash
cp server/.env.example server/.env
```

Create the client environment file if you want to use an explicit API URL:

```bash
copy client\\.env.example client\\.env
```

Set the values in `server/.env`:

```dotenv
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/ai-interview-prep
JWT_SECRET=use-a-long-random-secret
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
GEMINI_API_KEY=your_google_ai_studio_key
GEMINI_MODEL=gemini-3.6-flash
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
GEMINI_TIMEOUT_MS=45000
```

For MongoDB Atlas, make sure the database user exists and the deployment's network access rules allow the server to connect. URL-encode special characters in the database username or password when they appear in the connection string.

Never commit `server/.env` or `client/.env`. They are local secret files and are ignored by Git.

## Running Locally

Run the backend from the repository root:

```bash
npm run dev
```

The API will be available at `http://localhost:5000`.

Run the frontend in a second terminal:

```bash
npm run dev --prefix client
```

The frontend will be available at `http://localhost:5173`.

The Vite development server proxies `/api` requests to `http://localhost:5000`, so the client works even when `VITE_API_URL` is not set. If you use an explicit client environment file, set:

```dotenv
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=AI Interview Prep Kit Generator
```

## Available Commands

### Root commands

| Command | Purpose |
| --- | --- |
| `npm install` | Install root dependencies and build the client through `postinstall` |
| `npm run dev` | Start the backend with Nodemon |
| `npm start` | Start the backend in production mode |
| `npm run build` | Install client dependencies and create `client/dist` |
| `npm test` | Run backend tests |
| `npm run lint` | Check backend JavaScript syntax |
| `npm run evaluate` | Run the generation evaluation script |

### Client commands

Run these from the repository root with `--prefix client`, or from inside `client`:

| Command | Purpose |
| --- | --- |
| `npm run dev --prefix client` | Start the Vite development server |
| `npm run build --prefix client` | Build the React application |
| `npm run preview --prefix client` | Preview the production client bundle |
| `npm run lint --prefix client` | Run Oxlint |

### Server commands

Run these from the repository root with `--prefix server`, or from inside `server`:

| Command | Purpose |
| --- | --- |
| `npm run dev --prefix server` | Start the backend with Nodemon |
| `npm start --prefix server` | Start the backend directly |
| `npm test --prefix server` | Run server tests |
| `npm run lint --prefix server` | Check server JavaScript syntax |

## API Overview

All API routes are prefixed with `/api`.

### Health

```text
GET /api/health
```

Returns the service health message. This endpoint is also used by Render as the health check.

### Authentication

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
```

Registration and login accept JSON bodies such as:

```json
{
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "password": "a-strong-password"
}
```

Login only requires `email` and `password`. Successful registration and login return a JWT and a public user object.

### Research

These routes require an `Authorization` header:

```text
GET /api/research/discover?url=https://example.com
GET /api/research/fetch?url=https://example.com/about
```

Example header:

```text
Authorization: Bearer <jwt-token>
```

### Generation

```text
POST /api/generation/generate-kit
```

This route requires a JWT. A typical request includes:

```json
{
  "name": "Frontend Engineer Prep",
  "role": "Frontend Engineer",
  "jobDescription": "React, JavaScript, accessibility, and testing experience required.",
  "companyUrl": "https://example.com",
  "daysRequested": 7,
  "minutesPerSession": 45
}
```

The response contains the generated kit, normalized requirements, questions, schedule, and validation details.

## Deployment on Render

This repository includes `render.yaml` for a Node web service.

Recommended Render settings:

```text
Build Command: npm run build
Start Command: npm start
Health Check Path: /api/health
```

Add these environment variables in Render's dashboard:

```text
NODE_ENV=production
PORT=10000
MONGO_URI=<MongoDB Atlas connection string>
JWT_SECRET=<long random secret>
JWT_EXPIRES_IN=7d
CLIENT_URL=<frontend or service URL>
GEMINI_API_KEY=<Google AI Studio key>
GEMINI_MODEL=gemini-3.6-flash
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
GEMINI_TIMEOUT_MS=45000
```

The build creates `client/dist`. In production, Express serves that directory and falls back to the React `index.html` for client-side routes.

If a Render service still shows `npm install` as its build command, update the service's dashboard setting to `npm run build` and redeploy. The root `postinstall` hook also triggers the build during `npm install`, but the explicit Render build command is clearer and recommended.

## Security Notes

- Keep all `.env` files out of version control.
- Use a unique, high-entropy `JWT_SECRET` in every deployed environment.
- Rotate credentials immediately if a MongoDB URI or API key is exposed.
- Restrict MongoDB Atlas network access in production where possible.
- Configure `CLIENT_URL` to the exact allowed frontend origin.
- Protected research and generation routes require a valid JWT.
- Passwords are hashed before persistence and are never returned in API responses.
- API requests are protected with Helmet and rate limiting.

## Testing

Run the complete backend test suite:

```bash
npm test
```

The tests cover generation validation, requirement coverage, schedule allocation, research robots rules, retry behavior, and LLM response parsing.

For a basic live smoke test after starting the server, open:

```text
http://localhost:5000/api/health
```

## License

This project is licensed under the MIT License.
