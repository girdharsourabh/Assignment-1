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


