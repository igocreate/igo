
# Running Igo in Production

To run your Igo application in production mode, run:
```bash
export NODE_ENV=production
npm install --production
node app.js
```

Of course, you should use a tool like forever, pm2 or supervisord.
