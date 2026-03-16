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

