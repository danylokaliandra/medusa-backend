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
const DATABASE_URL = process.env.DATABASE_URL || "postgres://localhost/medusa-store";
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

// SENDGRID
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM = process.env.SENDGRID_FROM;
const SENDGRID_ORDER_PLACED = process.env.SENDGRID_ORDER_PLACED;
const SENDGRID_ORDER_CANCELED = process.env.SENDGRID_ORDER_CANCELED;
const SENDGRID_ORDER_SHIPPED = process.env.SENDGRID_ORDER_SHIPPED;
const SENDGRID_ORDER_RETURN_REQUESTED = process.env.SENDGRID_ORDER_RETURN_REQUESTED;
const SENDGRID_ORDER_ITEMS_RETURNED = process.env.SENDGRID_ORDER_ITEMS_RETURNED;
const SENDGRID_CLAIM_SHIPMENT_CREATED = process.env.SENDGRID_CLAIM_SHIPMENT_CREATED;
const SENDGRID_SWAP_CREATED = process.env.SENDGRID_SWAP_CREATED;
const SENDGRID_SWAP_SHIPMENT_CREATED = process.env.SENDGRID_SWAP_SHIPMENT_CREATED;
const SENDGRID_SWAP_RECEIVED = process.env.SENDGRID_SWAP_RECEIVED;
const SENDGRID_GIFT_CARD_CREATED = process.env.SENDGRID_GIFT_CARD_CREATED;
const SENDGRID_CUSTOMER_PASSWORD_RESET = process.env.SENDGRID_CUSTOMER_PASSWORD_RESET;
const SENDGRID_USER_PASSWORD_RESET = process.env.SENDGRID_USER_PASSWORD_RESET;
const SENDGRID_MEDUSA_RESTOCK = process.env.SENDGRID_MEDUSA_RESTOCK;

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
    resolve: `medusa-plugin-sendgrid`,
    options: {
      api_key: SENDGRID_API_KEY,
      from: SENDGRID_FROM,
      order_placed_template: SENDGRID_ORDER_PLACED,
      order_canceled_template: SENDGRID_ORDER_CANCELED,
      order_shipped_template: SENDGRID_ORDER_SHIPPED,
      gift_card_created_template: SENDGRID_GIFT_CARD_CREATED,
      medusa_restock_template: SENDGRID_MEDUSA_RESTOCK
      /* removed to extend the subscribers
      user_password_reset_template: SENDGRID_USER_PASSWORD_RESET,
      customer_password_reset_template: SENDGRID_CUSTOMER_PASSWORD_RESET,*/
      /* removed as not needed
      order_return_requested_template: SENDGRID_ORDER_RETURN_REQUESTED,
      order_items_returned_template: SENDGRID_ORDER_ITEMS_RETURNED,
      claim_shipment_created_template: SENDGRID_CLAIM_SHIPMENT_CREATED,
      swap_created_template: SENDGRID_SWAP_CREATED,
      swap_shipment_created_template: SENDGRID_SWAP_SHIPMENT_CREATED,
      swap_received_template: SENDGRID_SWAP_RECEIVED,*/
    },
  },
  // File service storage - the LAST plugin declared will be used
  {
    resolve: `medusa-file-minio`,
    options: {
        endpoint: MINIO_ENDPOINT,
        bucket: MINIO_BUCKET,
        access_key_id: MINIO_ACCESS_KEY,
        secret_access_key: MINIO_SECRET_KEY,
    },
  },
  {
    resolve: `medusa-file-spaces`,
    options: {
        spaces_url: SPACE_URL,
        bucket: SPACE_BUCKET,
        endpoint: SPACE_ENDPOINT,
        access_key_id: SPACE_ACCESS_KEY_ID,
        secret_access_key: SPACE_SECRET_ACCESS_KEY,
    },
  },
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

if (DATABASE_URL && DATABASE_TYPE === "postgres") {
  projectConfig.database_url = DATABASE_URL;
  delete projectConfig["database_database"];
}


/** @type {import('@medusajs/medusa').ConfigModule} */
module.exports = {
  projectConfig,
  plugins,
  modules,
};