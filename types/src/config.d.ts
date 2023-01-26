export type config = Partial<IConfig>

export type IConfig = {
  init: () => void
  _loaded: boolean
  env: string 
  httpport: number
  projectRoot: string

  cookieSecret: string
  cookieSession: {
    name: string,
    keys: string[]
    maxAge: number
    sameSite: string
  }

  igodust: {
    stream: boolean
  }

  urlencoded: { 
    limit: string
    extended: boolean 
  }

  json: { 
    limit: string
  }

  i18n: {
    whitelist: string[]
    preload: string[]
    fallbackLng: string
    backend: {
      loadPath: string
    },
    detection: {
      order: string[]
      lookupQuerystring: string
      lookupLocalStorage: string
      lookupCookie: string
      caches: string[]
    },
  }

  mailer: {
    transport: {
      host: string
      port: number
      secure: boolean
      auth: {
        user: string
        pass: string
      },
    },
    defaultfrom: string
    subaccount: string
  }

  databases: string[]

  skip_reinit_db?: boolean;

  mysql: {
    driver: string
    host: string
    port: number
    user: string
    password: string
    database: string
    charset: string
    debug: boolean
    connectionLimit: number
    debugsql: boolean
  };

  // postgresql
  postgresql: {
    driver: string
    host: string
    port: number
    user: string
    password: string
    database: string
    max: number
    idleTimeoutMillis: number
    connectionTimeoutMillis: number
    debugsql: boolean
  }

  redis: {
    socket: {
      host: string
      port: number
    },
    database: number
  }
}