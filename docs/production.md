
# Running Igo in Production

- Igo dev dependencies are packaged in a separate module [igo-dev](https://github.com/arnaudm/igo-dev)
- Production configuration is loaded separately
- Runtime errors are caught and can be sent by email to the admin
- Igo logger uses [winston](https://github.com/winstonjs/winston) so you can log where you like (eg: [papertrailapp](https://github.com/kenperkins/winston-papertrail))


To run your Igo application in production mode, run:
```bash
export NODE_ENV=production
npm install --production
node app.js
```
