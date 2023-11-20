const dotenv = require("dotenv");

let ENV_FILE_NAME = "";
switch (process.env.NODE_ENV) {
  case "production":
    ENV_FILE_NAME = ".env.production";
    break;
  case "staging":
    ENV_FILE_NAME = ".env.staging";
    break;
  case "test":
    ENV_FILE_NAME = ".env.test";
    break;
  case "development":
  default:
    ENV_FILE_NAME = ".env";
    break;
}
console.log(process.env.NODE_ENV,'environment using',ENV_FILE_NAME);

try {
  dotenv.config({ path: process.cwd() + "/" + ENV_FILE_NAME });
} catch (e) {}

// CORS when consuming Medusa from admin
const ADMIN_CORS = process.env.ADMIN_CORS || "http://localhost:7000,http://localhost:7001";

// CORS to avoid issues when consuming Medusa from a client
const STORE_CORS = process.env.STORE_CORS || "http://localhost:8000";

const DATABASE_TYPE = process.env.DATABASE_TYPE || "sqlite";
const DATABASE_URL = process.env.DATABASE_URL || "postgres://localhost/db";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// MINIO
const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT;
const MINIO_BUCKET = process.env.MINIO_BUCKET;
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY;
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY;

// SPACES
const SPACE_URL = process.env.SPACE_URL;
const SPACE_BUCKET = process.env.SPACE_BUCKET;
const SPACE_ENDPOINT = process.env.SPACE_ENDPOINT;
const SPACE_ACCESS_KEY_ID = process.env.SPACE_ACCESS_KEY_ID;
const SPACE_SECRET_ACCESS_KEY = process.env.SPACE_SECRET_ACCESS_KEY;

// S3
const S3_URL = process.env.S3_URL;
const S3_BUCKET = process.env.S3_BUCKET;
const S3_REGION = process.env.S3_REGION;
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID;
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY;

// RESEND
const RESEND_API_KEY = process.env.RESEND_API_ID;
const RESEND_ENABLE_ENDPOINT = process.env.RESEND_ENABLE_ENDPOINT;
const RESEND_TEMPLATE_PATH = process.env.RESEND_TEMPLATE_PATH;
const RESEND_SUBJECT_TEMPLATE_TYPE = process.env.RESEND_SUBJECT_TEMPLATE_TYPE;
const RESEND_BODY_TEMPLATE_TYPE = process.env.RESEND_BODY_TEMPLATE_TYPE;

// PLUGINS
const plugins = [
  `medusa-fulfillment-manual`,
  `medusa-payment-manual`,
  {
    resolve: "@medusajs/admin",
    /** @type {import('@medusajs/admin').PluginOptions} */
    options: {
      autoRebuild: true,
    },
  },
  // Email notifications
  {
    resolve: `medusa-plugin-resend`,
    options: {
      api_key: RESEND_API_KEY,
      enable_endpoint: RESEND_ENABLE_ENDPOINT,
      template_path: RESEND_TEMPLATE_PATH,
      subject_template_type: RESEND_SUBJECT_TEMPLATE_TYPE,
      body_template_type: RESEND_BODY_TEMPLATE_TYPE,
    }
  },
  // File service storage - the LAST plugin declared will be used
  {
    resolve: `medusa-file-s3`,
    options: {
        s3_url: S3_URL,
        bucket: S3_BUCKET,
        region: S3_REGION,
        access_key_id: S3_ACCESS_KEY_ID,
        secret_access_key: S3_SECRET_ACCESS_KEY,
    },
  },
  {
    resolve: `@devon/medusa-file-bunny`,
    options: {
      storageAccessKey: process.env.BUNNY_STORAGE_ACCESS_KEY,
      storageEndpoint: process.env.BUNNY_STORAGE_ENDPOINT,
      storageZoneName: process.env.BUNNY_STORAGE_ZONE_NAME,
      storagePath: process.env.BUNNY_STORAGE_PATH,
      pullZoneDomain: process.env.BUNNY_PULL_ZONE_DOMAIN,

    },
  },
];

// MODULES
const modules = {
  eventBus: {
    resolve: "@medusajs/event-bus-redis",
    options: {
      redisUrl: REDIS_URL,
    }
  },
  cacheService: {
    resolve: "@medusajs/cache-redis",
    options: {
      redisUrl: REDIS_URL,
      ttl: 30
    }
  },
}

/** @type {import('@medusajs/medusa').ConfigModule["projectConfig"]} */
const projectConfig = {
  jwtSecret: process.env.JWT_SECRET,
  cookieSecret: process.env.COOKIE_SECRET,
  database_database: "./medusa-db.sql",
  database_type: DATABASE_TYPE,
  store_cors: STORE_CORS,
  admin_cors: ADMIN_CORS,
  redis_url: REDIS_URL
}

// ADMIN ROUTES
const adminConfig = {
  routes: [
    {
      path: "/a/shipping",
      component: "Shipping",
      navigation: {
        title: "Shipping",
      },
    },
  ],
}

if (DATABASE_URL && DATABASE_TYPE === "postgres") {
  projectConfig.database_url = DATABASE_URL;
  delete projectConfig["database_database"];
}


/** @type {import('@medusajs/medusa').ConfigModule} */
module.exports = {
  projectConfig,
  adminConfig,
  plugins,
  modules,
};