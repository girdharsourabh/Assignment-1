BUG REPORT
==========

1. CORS problem: There was no CORS configuration, So in production it will not work properly. Also, it is not secure to allow all origins. 

Problems it will create:
- Security vulnerabilities
- Cross-site request forgery attacks
- Data theft

Assignment-1\backend\src\index.js , line 10
app.use(cors());

How to fix:
- Configure CORS properly to allow only specific origins
- Use environment variables for allowed origins
- Implement proper authentication and authorization


2. No gitignore files and .env files: I don't see any .gitignore file and .env file is not ignored. which is bad practice. and it is a security problem too what i see in this project. 

How to fix:
- Create a .gitignore file and add the following:
  - .env
  - node_modules
  - .vscode
  - .idea
  - .DS_Store
  - .env.local
  - .env.production
  - .env.development
  - .env.test
  - .env.example
  - .env.*.local
  - .env.*.production
  - .env.*.development
  - .env.*.test

3. No debouncing is used while searching customers: This will cause too many API calls to the server. 

Assignment-1\frontend\src\components\CustomerSearch.js , line - 14 
handleSearch(query)

Problem it causes:
- High server load
- Slow response times
- Increased bandwidth usage
- Potential server crashes
- Not good for scalability as user data increases this particular API or service will not be able to handle the load. or will cost you more because server resources will be utilized more.

How to fix:
- Implement debouncing in the search functionality
- Use a debounce delay of 300-500ms
- Cancel previous API calls when new search is made
- Show loading state while searching
- Implement pagination for better performance


4. Use Enum in database schema: Instead of using strings for status, use enum type in database schema. This will ensure data integrity and prevent invalid values.

Assignment-1\db\init.sql , line 19


I am not saying proper ENUM which is not good for scalability, but at least use enum type in database schema. But what i am saying 
Create a seperate table which will have all status values and use foreign key reference in customer table. 

Problem I am seeing: 
- Hard to maintain
- creating a new status value is not easy 
- if in future i would want to add more status values, it will be difficult
- Not scalable

What i will do is: Create a seperate table for status values and use foreign key reference in customer table.

5. Order table and Product table less than 0 problem:
These kind of thing should be verified on the model level and while defining the schema.
Problems:
- Quantity and Total amount should not be less than 0. This will cause negative values in the database. 
- This will cause issues with calculations and reporting. 

Assignment-1\db\init.sql , line 14,15,23,24

How to fix:
- Add validation in the database schema to prevent negative values
- Add validation in the application to prevent negative values
- Add validation in the API to prevent negative values


6. N+1 Problem at Orders:
In the orders route, for each order, individual queries are made to fetch customer and product details. This causes N+1 problem where N is the number of orders.

Assignment-1\backend\src\routes\orders.js , line 8-24

Problem:
- High database load
- Slow response times
- Increased latency
- Not scalable

How to fix:
- Use JOIN queries to fetch all data in single query
- Use eager loading to fetch related data
- Use pagination to limit number of records
- Use caching to store frequently accessed data
- Increase Performance by using proper indexing


7. Orders Not Paginated: if data increases, it will be difficult to handle the load.
Problem: 
- High database load
- Slow response times
- Increased latency
- Not scalable

Changes:
- OrderList component should have next and previous which will tell the offset 
- change the fetching function so that it accepts offset as a parameter and limit parameters
- change the backend route to accept offset and limit parameters


How to fix:
- Use pagination to limit number of records
- Use caching to store frequently accessed data
- Increase Performance by using proper indexing


8. Validation on Creating Customer:
name , email and phone number should be validated. but currently there is no validation and it was considering empty string and not null values. 

Assignment-1\backend\src\routes\customers.js , line around 40 

that is not good for the database.

and also i used regex for email format checking which could be also used in phone number but i am not increasing the problem in this.

Problem:
- No validation on creating customer
- No validation on email format
- Security issues 

How to fix:
- Add validation on creating customer
- Add validation on email format
- Add regex for email validation 