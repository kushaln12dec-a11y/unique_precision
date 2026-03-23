/// <reference types="node" />
import { defineConfig } from "prisma/config";
import { loadEnv } from "./server/src/config/env";

loadEnv();

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
