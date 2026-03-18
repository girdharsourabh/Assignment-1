# Deployment Details

## Live URLs

- **Frontend (Vercel)**: [https://order-management-assignment-pi.vercel.app/](https://order-management-assignment-pi.vercel.app/)
- **Backend (Render)**: [https://order-management-assignment-1.onrender.com/api](https://order-management-assignment-1.onrender.com/api)
- **Database (Render PostgreSQL)**: `dpg-d6tc7pndiees73csaui0-a`

## Configuration Summary

### Frontend (Vercel)
- **Environment Variable**: `REACT_APP_API_URL` set to `https://order-management-assignment-1.onrender.com/api`
- **Build Fix**: Added `vercel.json` to handle `react-scripts` execution permissions.

### Backend (Render)
- **Runtime**: Node / Web Service
- **Database**: PostgreSQL (Automatic initialization via `initDb()` on startup)
- **Environment Variable**: `DATABASE_URL` set to the Internal Database URL from Render.
