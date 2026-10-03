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

  const basePathsToTry = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "..", ".env"),
    path.resolve(process.cwd(), "..", "..", ".env"),
  ];

  for (const envPath of basePathsToTry) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
      break;
    }
  }

  const appEnv = resolveAppEnv();

  if (appEnv !== "development") {
    const overlayPathsToTry = [
      path.resolve(process.cwd(), `.env.${appEnv}`),
      path.resolve(process.cwd(), "..", `.env.${appEnv}`),
    ];
    for (const overlayPath of overlayPathsToTry) {
      if (fs.existsSync(overlayPath)) {
        dotenv.config({
          path: overlayPath,
          override: true,
        });
        break;
      }
    }
  }

  process.env.APP_ENV = appEnv;
  envLoaded = true;
};
