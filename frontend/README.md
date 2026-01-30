# 💄 MakeUp Match – Frontend

Welcome to the **MakeUp Match** frontend – a modern web app built with React, Firebase, Tailwind CSS, and Vite. It features secure authentication, fast performance, and a clean, responsive UI.

---

## 🚀 Tech Stack

- ⚛️ **React** – Modern component-based UI library with hooks  
- 🔥 **Firebase** – Authentication and Hosting  
- 💨 **Tailwind CSS** – Utility-first CSS framework for styling  
- ⚡ **Vite** – Lightning-fast development and build tooling  
- 🔐 **Custom AuthContext** – Manages authentication and protected routes  
- 🧭 **React Router v7** – Declarative routing with file-based route configuration

---

## 🛠 Getting Started

### 1. Installation

Clone the repository and install dependencies:

```bash
npm install
```


### 2. Environment Setup

Firebase credentials are managed via environment variables.
Make sure to create a `.env` file like this:
```bash
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
```
🔒 Do not commit your .env file to version control. Keep credentials private.

### 3. Local Development

Start the local development server with hot module reloading:

```bash
npm run dev
```

Your application will be available at `http://localhost:5173`.

### 4. Run npm in a Linux Container (Optional Dev Tool)

If you're working on Windows and want to ensure consistent dependency resolution (as on CI/CD or production Linux environments), you can run your `npm install` commands inside a Dockerized Linux container.

This helps avoid issues related to OS-specific dependencies or subtle behavior differences between Windows and Unix-like systems.

When to use it: 
- You want to verify that your dependencies work in a clean **Linux** environment.
- You're running into **Windows-specific package issues** (e.g., `node-gyp`, native modules).
- You want to **mimic your CI environment** locally.

Run the following in your project root (requires Docker Desktop):

```cmd
docker run --rm -v "%cd%:/app" -w /app node:20 bash -c "npm install && npm dedupe && npm ci && echo ✅ npm ci worked in Linux"
```

## 🚚 Deployment with Firebase Hosting

Deployment is managed through Firebase Hosting and automated via GitHub Actions on branch merges.

- 🧪 Development environment: [https://dev-makeupmatch.web.app/](https://dev-makeupmatch.web.app/)
- 🚀 Production environment: [https://makeupmatch.web.app/](https://makeupmatch.web.app/)

## 🎨 Styling

This app uses [Tailwind CSS](https://tailwindcss.com/) for styling. It's configured out of the box and can be extended or replaced with any CSS solution of your choice.

## 🔐 Important Information

Once you’re logged in, you can log out at any time by navigating to `/logout`.
