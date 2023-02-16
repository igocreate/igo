
# Running Igo in Production

- Igo dev dependencies are packaged in a separate module [igo-dev](https://github.com/arnaudm/igo-dev)
- Production configuration is loaded separately
- Runtime errors are caught and can be sent by email to the admin


To run your Igo application in production mode, run:
```bash
export NODE_ENV=production
npm install --production
node app.js
```
