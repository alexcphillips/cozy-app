# Getting Started

## Environment Setup

Create a `.env` file in the project root and use `.env.example` as a reference for the required variables.

## Running the Application

Start the UI:

```bash
npm run dev
```

Start the server:

```bash
npm run server
```

## Creating a User

Before logging in through the UI, create a user using the `/register` endpoint in Postman.

## Authentication

To test authenticated endpoints in Postman:

1. Log in using the `/login` endpoint.
2. Copy the returned JWT.
3. Select Auth Type of Bearer Token and paste the JWT (no quotes)
