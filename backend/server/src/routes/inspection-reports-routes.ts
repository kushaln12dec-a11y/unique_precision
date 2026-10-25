import { Router } from "express";
import puppeteer, { type Browser } from "puppeteer-core";
import { authMiddleware } from "../middleware/auth";
import {
  buildInspectionReportHtml,
  type GenerateInspectionReportPayload,
} from "../utils/inspectionReportTemplate";

const router = Router();
router.use(authMiddleware);

const requireQcRole = (role?: string) => role === "QC" || role === "ADMIN";

let browserPromise: Promise<Browser> | null = null;

// ---------------------------------------------------------------------------
// Browser resolution — tries multiple strategies in order, most reliable first
// ---------------------------------------------------------------------------
const getBrowser = async (): Promise<Browser> => {
  if (!browserPromise) {
    browserPromise = (async () => {
      const args = [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--font-render-hinting=none",
      ];

      // 1. Explicit env override
      if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        console.log("[PDF] Using PUPPETEER_EXECUTABLE_PATH:", process.env.PUPPETEER_EXECUTABLE_PATH);
        return puppeteer.launch({ executablePath: process.env.PUPPETEER_EXECUTABLE_PATH, headless: true, args });
      }

      // 2. @sparticuz/chromium — self-contained, works on Railway/Lambda/etc.
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const chromium = require("@sparticuz/chromium");
        const executablePath: string = await chromium.executablePath();
        const chromiumArgs: string[] = chromium.args ?? [];
        console.log("[PDF] Using @sparticuz/chromium:", executablePath);
        return await puppeteer.launch({
          executablePath,
          headless: chromium.headless ?? true,
          args: [...chromiumArgs, ...args],
        });
      } catch (sparticuzErr) {
        console.warn("[PDF] @sparticuz/chromium unavailable:", (sparticuzErr as Error).message);
      }

      // 3. Hardcoded system paths (apt-installed Chrome, Docker images, Windows)
      const candidates = [
        "/usr/bin/google-chrome-stable",
        "/usr/bin/google-chrome",
        "/usr/bin/chromium-browser",
        "/usr/bin/chromium",
        "/snap/bin/chromium",
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        process.env.LOCALAPPDATA ? `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe` : null,
      ].filter(Boolean) as string[];

      const fs = await import("fs/promises");
      for (const candidate of candidates) {
        try {
          await fs.access(candidate);
          console.log("[PDF] Using system browser:", candidate);
          return await puppeteer.launch({ executablePath: candidate, headless: true, args });
        } catch {
          // not found, try next
        }
      }

      throw new Error(
        "No Chromium-compatible browser found. " +
        "Either @sparticuz/chromium failed to extract or no system Chrome is installed. " +
        "Set PUPPETEER_EXECUTABLE_PATH explicitly or check server logs.",
      );
    })();

    // Don't cache a rejected promise — next request gets a fresh attempt.
    browserPromise.catch(() => { browserPromise = null; });
  }
  return browserPromise;
};

const closeBrowser = async () => {
  if (!browserPromise) return;
  try {
    const browser = await browserPromise;
    await browser.close();
  } catch { /* ignore */ } finally {
    browserPromise = null;
  }
};

process.on("exit", () => void closeBrowser());
process.on("SIGINT", () => void closeBrowser());
process.on("SIGTERM", () => void closeBrowser());

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/** Lightweight diagnostic endpoint — shows which Chrome this deploy would use */
router.get("/pdf-diagnostics", async (req, res) => {
  if (!requireQcRole(req.user?.role)) {
    return res.status(403).json({ message: "Access denied. QC role required." });
  }

  let sparticuzPath: string | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const chromium = require("@sparticuz/chromium");
    sparticuzPath = await chromium.executablePath();
  } catch { /* not available */ }

  return res.json({
    platform: process.platform,
    node: process.version,
    puppeteerExecutablePathEnv: process.env.PUPPETEER_EXECUTABLE_PATH || null,
    sparticuzChromiumPath: sparticuzPath,
    status: sparticuzPath || process.env.PUPPETEER_EXECUTABLE_PATH ? "chromium_available" : "chromium_unknown",
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
    res.setHeader("Content-Disposition", `attachment; filename="inspection-report-${fileStamp}.pdf"`);
    return res.send(Buffer.from(pdfBytes));
  } catch (error: any) {
    console.error("[PDF] Error generating inspection report PDF:", error?.stack || error);

    const raw = String(error?.message || "");
    if (raw.includes("No Chromium-compatible browser found")) {
      return res.status(500).json({ message: "Browser runtime not found for PDF generation. See server logs." });
    }
    return res.status(500).json({
      message: "Failed to generate inspection report PDF",
      ...(process.env.NODE_ENV !== "production" ? { detail: raw } : {}),
    });
  }
});

export default router;
