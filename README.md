# 🚀 Team Task Manager

A full-stack team task management system with authentication, role-based access control, project collaboration, and task tracking.

---
Note: Backend is integrated with frontend and accessible via deployed frontend.
## 🛠 Tech Stack

### Frontend
- React (Create React App)
- React Router
- Axios
- CSS

### Backend
- Node.js
- Express.js
- MongoDB (Mongoose)
- JWT Authentication

---

## ✨ Features

- 🔐 User Authentication (Signup/Login)
- 🛡 Role-Based Access (Admin / Member)
- 📁 Project Management
- 👥 Add Members to Projects
- ✅ Task Creation & Assignment
- 🔄 Task Status Updates
- 📊 Dashboard Analytics
- 📅 Due Date Tracking

---

## 📊 Dashboard

- Total Tasks
- Todo / In Progress / Done
- Overdue Tasks
- Recent Tasks

---

## 🔗 API Endpoints

### Auth
- POST `/api/auth/signup`
- POST `/api/auth/login`
- GET `/api/auth/me`

### Projects
- POST `/api/projects`
- GET `/api/projects`
- GET `/api/projects/:id`
- POST `/api/projects/:id/members`

### Tasks
- POST `/api/tasks`
- GET `/api/tasks/project/:projectId`
- PATCH `/api/tasks/:id/status`
- DELETE `/api/tasks/:id`
- GET `/api/tasks/dashboard`

---

## ⚙️ Setup

### Backend

```bash
cd backend
npm install
npm run dev
