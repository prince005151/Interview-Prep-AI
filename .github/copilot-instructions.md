# Copilot project instructions

- Keep the project organized into a root monorepo with separate client and server apps.
- Use React + Vite + Tailwind in the client app.
- Use Node.js + Express + Mongoose in the server app.
- Store environment variables in server/.env.example and client/.env.example.
- Protect every private route with JWT-based auth middleware.
- Enforce user ownership on all kit/document access in the backend.
- Keep schema fields explicit and validated with Mongoose.
- Prefer production-ready patterns: validation, error handling, rate limiting, and safe defaults.
