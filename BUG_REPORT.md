# SDE Assignment - Bug Report

I've gone through the code and found several issues that need fixing. Here’s a breakdown of the most critical ones:

## 1. Security: Database Hackable via Search
- **Where**: `backend/src/routes/customers.js` (line 19)
- **Problem**: In the customer search, the code just sticks whatever the user types directly into a SQL query. A hacker could type special characters to steal all customer data or even wipe the database.
- **Why it matters**: It's a huge security hole (SQL Injection).
- **Fix**: Use "stickers" (parameterized queries) so the database knows what is data and what is a command.

## 2. Security: Hardcoded Database Password
- **Where**: `backend/src/config/db.js` (lines 5-6)
- **Problem**: The database username and password are written right there in the source code.
- **Why it matters**: Anyone who sees the code can access the database. If this gets pushed to GitHub, it's game over.
- **Fix**: Move these to an `.env` file and use environment variables.

## 3. Security: No Protection on Sensitive Actions
- **Where**: `backend/src/routes/products.js` (line 29)
- **Problem**: There's an endpoint that lets anyone change the inventory count of a product. There's no login or check to see who is doing it.
- **Why it matters**: Anyone who knows the URL can set their favorite product's stock to 9999 or 0.
- **Fix**: Add authentication (like a JWT check) or at least restrict who can call this.

## 4. Performance: Extremely Slow Order Loading
- **Where**: `backend/src/routes/orders.js` (lines 13-24)
- **Problem**: Every time you load the list of orders, the server has to go back to the database twice for *every single order* just to get the customer's name and product name.
- **Why it matters**: If you have 50 orders, it makes 101 trips to the database. This will be super slow as the business grows.
- **Fix**: Use a single "JOIN" query to get all the data at once.

## 5. Bug: Race Condition / Stock Mistakes
- **Where**: `backend/src/routes/orders.js` (line 54)
- **Problem**: When two people buy the same item at the exact same time, the code might check the stock and think both are okay, even if there's only one left.
- **Why it matters**: This leads to "overselling" where you sell items you don't actually have.
- **Fix**: Use a database "Transaction" to make sure the check and the update happen as one single, solid step.

## 6. Bug: Website Crashes on Server Errors
- **Where**: `frontend/src/api/index.js` (everywhere)
- **Problem**: The frontend assumes the server always works. It doesn't check if the server returned an error (like a 404 or 500) before trying to read the data.
- **Why it matters**: If the backend has a tiny hiccup, the whole website shows a white screen or a "TypeError" to the user.
- **Fix**: Add a check to see if the response is "OK" before trying to use it.

## 7. UX: Too many API calls while typing
- **Where**: `frontend/src/components/CustomerSearch.js` (line 56)
- **Problem**: Every single letter you type in the search box sends a brand new request to the server immediately.
- **Why it matters**: It's waste of server power and can make the results "flicker" if you type fast.
- **Fix**: Add a tiny delay (debouncing) so it only searches once you stop typing for a split second.

---

### Architectural Observations (The "Bad Code" stuff)
- **Messy Structure**: Everything is crammed into the route files. A "MVC" structure (Models, Views, Controllers) would make this much cleaner.
- **Lazy Validation**: The app doesn't check if emails are valid or if numbers are positive before saving them. Adding something like `Zod` would fix this easily.
- **Wide Open API**: The CORS setting is set to allow *everybody* (`*`). This should be restricted to only our frontend.
