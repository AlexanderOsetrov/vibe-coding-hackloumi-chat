#!/usr/bin/env node

/**
 * Construct DATABASE_URL from individual components if not provided
 * This allows flexible database configuration for different deployment methods
 */

function constructDatabaseUrl() {
  // If DATABASE_URL is already set, use it
  if (process.env.DATABASE_URL) {
    console.log("Using existing DATABASE_URL");
    return process.env.DATABASE_URL;
  }

  // Get individual components with defaults
  const host = process.env.POSTGRES_HOST || "localhost";
  const port = process.env.POSTGRES_PORT || "5432";
  const database = process.env.POSTGRES_DB || "hackloumi_chat";
  const user = process.env.POSTGRES_USER || "postgres";
  const password = process.env.POSTGRES_PASSWORD || "password";

  // Construct the URL
  const databaseUrl = `postgresql://${user}:${password}@${host}:${port}/${database}`;

  console.log(`Constructed DATABASE_URL from components:`);
  console.log(`  Host: ${host}`);
  console.log(`  Port: ${port}`);
  console.log(`  Database: ${database}`);
  console.log(`  User: ${user}`);
  console.log(`  Password: [HIDDEN]`);

  return databaseUrl;
}

// If run directly, output the DATABASE_URL
if (require.main === module) {
  const databaseUrl = constructDatabaseUrl();
  console.log("");
  console.log("DATABASE_URL=" + databaseUrl);
}

module.exports = { constructDatabaseUrl };
