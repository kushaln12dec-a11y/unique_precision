import fs from "fs";
import path from "path";
import dotenv from "dotenv";

const KNOWN_APP_ENVS = new Set(["development", "staging", "production", "test"]);

let envLoaded = false;

const resolveAppEnv = (): string => {
  const appEnv = process.env.APP_ENV?.trim();
  if (appEnv && KNOWN_APP_ENVS.has(appEnv)) {
    return appEnv;
  }

  const nodeEnv = process.env.NODE_ENV?.trim();
  if (nodeEnv && KNOWN_APP_ENVS.has(nodeEnv)) {
    return nodeEnv;
  }

  return "development";
};

export const loadEnv = (): void => {
  if (envLoaded) {
    return;
  }

  const baseEnvPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(baseEnvPath)) {
    dotenv.config({ path: baseEnvPath });
  }

  const appEnv = resolveAppEnv();

  if (appEnv !== "development") {
    const overlayPath = path.resolve(process.cwd(), `.env.${appEnv}`);
    if (fs.existsSync(overlayPath)) {
      dotenv.config({
        path: overlayPath,
        override: true,
      });
    }
  }

  process.env.APP_ENV = appEnv;
  envLoaded = true;
};
