import { Router } from "express";
import { execFile } from "child_process";
import { promisify } from "util";
import puppeteer, { type Browser } from "puppeteer";
import { authMiddleware } from "../middleware/auth";
import {
  buildInspectionReportHtml,
  type GenerateInspectionReportPayload,
} from "../utils/inspectionReportTemplate";

const router = Router();

router.use(authMiddleware);

const execFileAsync = promisify(execFile);

const CHROME_PATH_CANDIDATES = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  // Linux paths (Render, Docker, apt-installed Chrome)
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
  "/snap/bin/chromium",
  // Windows paths
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  process.env.LOCALAPPDATA ? `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe` : null,
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean) as string[];

// Binaries to look up on PATH via `which`/`where`. This is what actually finds
// Chromium on Railway/Nixpacks, where it's installed by nix into a dynamically
// hashed path like /nix/store/<hash>-chromium-.../bin/chromium — a path that can
// never be hardcoded above.
const WHICH_CANDIDATES = ["chromium", "chromium-browser", "google-chrome-stable", "google-chrome"];

let browserPromise: Promise<Browser> | null = null;
let resolvedExecutablePathCache: string | undefined;

const requireQcRole = (role?: string) => role === "QC" || role === "ADMIN";

const fileExists = async (candidate: string): Promise<boolean> => {
  try {
    const fs = await import("fs/promises");
    await fs.access(candidate);
    return true;
  } catch {
    return false;
  }
};

const resolveViaWhich = async (): Promise<string | undefined> => {
  const lookupCmd = process.platform === "win32" ? "where" : "which";
  for (const bin of WHICH_CANDIDATES) {
    try {
      const { stdout } = await execFileAsync(lookupCmd, [bin]);
      const resolved = stdout.split("\n")[0]?.trim();
      if (resolved && (await fileExists(resolved))) {
        return resolved;
      }
    } catch {
      // binary not on PATH, try next
    }
  }
  return undefined;
};

const resolveBrowserPath = async (): Promise<string | undefined> => {
  // 1. Explicit override always wins if it actually exists.
  if (process.env.PUPPETEER_EXECUTABLE_PATH && (await fileExists(process.env.PUPPETEER_EXECUTABLE_PATH))) {
    console.log("[PDF] Using PUPPETEER_EXECUTABLE_PATH:", process.env.PUPPETEER_EXECUTABLE_PATH);
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  // 2. Puppeteer's own bundled browser (works when it downloaded successfully at install time).
  try {
    // @ts-ignore — puppeteer may not be installed; this is a runtime fallback
    const puppeteerFull = await import("puppeteer");
    const bundledPath = (puppeteerFull as any).executablePath?.() ?? (puppeteerFull.default as any).executablePath?.();
    if (bundledPath && (await fileExists(bundledPath))) {
      console.log("[PDF] Using puppeteer bundled browser:", bundledPath);
      return bundledPath;
    }
  } catch {
    // Bundled browser not available, fall through
  }

  // 3. Hardcoded common install locations (apt/Debian/Windows).
  for (const candidate of CHROME_PATH_CANDIDATES) {
    if (await fileExists(candidate)) {
      console.log("[PDF] Using system browser:", candidate);
      return candidate;
    }
  }

  // 4. Resolve dynamically via PATH — this is what catches Nixpacks/Railway's
  //    nix-installed chromium, whose path is not predictable/hardcodable.
  const viaWhich = await resolveViaWhich();
  if (viaWhich) {
    console.log("[PDF] Using PATH-resolved browser:", viaWhich);
    return viaWhich;
  }

  return undefined;
};

const getBrowser = async (): Promise<Browser> => {
  if (!browserPromise) {
    browserPromise = (async () => {
      const executablePath = await resolveBrowserPath();
      if (!executablePath) {
        throw new Error(
          "No Chromium-compatible browser found. On Railway, add the nixpacks.toml chromium package " +
          "(see backend README) or set PUPPETEER_EXECUTABLE_PATH explicitly.",
        );
      }
      resolvedExecutablePathCache = executablePath;
      try {
        return await puppeteer.launch({
          executablePath,
          headless: true,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--font-render-hinting=none",
          ],
        });
      } catch (launchError) {
        // Surface launch failures clearly instead of a bare "Protocol error" —
        // this is almost always missing shared libraries (libnss3, libatk-bridge2.0-0,
        // libgbm1, libasound2, etc.) in the container image.
        console.error(
          `[PDF] Chromium found at "${executablePath}" but failed to launch. This usually means ` +
          "required shared libraries are missing from the runtime image. Original error:",
          launchError,
        );
        throw launchError;
      }
    })();
    // If launch failed, don't cache the rejected promise — let the next request retry cleanly.
    browserPromise.catch(() => {
      browserPromise = null;
    });
  }
  return browserPromise;
};

const closeBrowser = async () => {
  if (!browserPromise) return;
  try {
    const browser = await browserPromise;
    await browser.close();
  } catch {
    // ignore
  } finally {
    browserPromise = null;
  }
};

process.on("exit", () => {
  void closeBrowser();
});
process.on("SIGINT", () => {
  void closeBrowser();
});
process.on("SIGTERM", () => {
  void closeBrowser();
});

// Lightweight diagnostic: reports what Chromium executable (if any) this environment
// would use, without actually launching it. Call this after deploying to confirm the
// fix worked, e.g. GET /api/inspection-reports/pdf-diagnostics
router.get("/pdf-diagnostics", async (req, res) => {
  if (!requireQcRole(req.user?.role)) {
    return res.status(403).json({ message: "Access denied. QC role required." });
  }
  const executablePath = await resolveBrowserPath();
  return res.json({
    platform: process.platform,
    node: process.version,
    puppeteerExecutablePathEnv: process.env.PUPPETEER_EXECUTABLE_PATH || null,
    resolvedExecutablePath: executablePath || null,
    browserAlreadyLaunchedOnce: Boolean(resolvedExecutablePathCache),
    status: executablePath ? "chromium_found" : "chromium_not_found",
  });
});

router.post("/preview-html", async (req, res) => {
  try {
    if (!requireQcRole(req.user?.role)) {
      return res.status(403).json({ message: "Access denied. QC role required." });
    }

    const payload = (req.body ?? {}) as GenerateInspectionReportPayload;
    const html = buildInspectionReportHtml(payload);
    return res.json({ html });
  } catch (error) {
    console.error("Error generating inspection report HTML preview:", error);
    return res.status(500).json({ message: "Failed to generate inspection report preview" });
  }
});

router.post("/generate", async (req, res) => {
  try {
    if (!requireQcRole(req.user?.role)) {
      return res.status(403).json({ message: "Access denied. QC role required." });
    }

    const payload = (req.body ?? {}) as GenerateInspectionReportPayload;
    const html = buildInspectionReportHtml(payload);
    const browser = await getBrowser();
    const page = await browser.newPage();

    await page.setViewport({ width: 1100, height: 1400 });
    await page.setContent(html, { waitUntil: "load" });

    const pdfBytes = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
      preferCSSPageSize: true,
    });
    await page.close();

    const fileStamp = String(payload.groupId ?? Date.now()).trim();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=\"inspection-report-${fileStamp}.pdf\"`);
    return res.send(Buffer.from(pdfBytes));
  } catch (error: any) {
    console.error("Error generating inspection report PDF:", error?.stack || error);

    const rawMessage = String(error?.message || "");
    if (rawMessage.includes("No Chromium-compatible browser found")) {
      return res.status(500).json({
        message: "Browser runtime not found for PDF generation. See server logs for setup instructions.",
      });
    }
    if (rawMessage.toLowerCase().includes("libnss") || rawMessage.toLowerCase().includes("error while loading shared libraries")) {
      return res.status(500).json({
        message: "PDF renderer is missing required system libraries on this server. Contact an administrator.",
      });
    }

    // In non-production, include the real reason so it's actionable without digging through logs.
    return res.status(500).json({
      message: "Failed to generate inspection report PDF",
      ...(process.env.NODE_ENV !== "production" ? { detail: rawMessage } : {}),
    });
  }
});

export default router;
