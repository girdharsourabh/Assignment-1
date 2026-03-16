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

