import { Router } from "express";
import puppeteer, { type Browser } from "puppeteer-core";
import { authMiddleware } from "../middleware/auth";
import {
  buildInspectionReportHtml,
  type GenerateInspectionReportPayload,
} from "../utils/inspectionReportTemplate";

const router = Router();

router.use(authMiddleware);

const CHROME_PATH_CANDIDATES = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean) as string[];

let browserPromise: Promise<Browser> | null = null;

const requireQcRole = (role?: string) => role === "QC" || role === "ADMIN";

const resolveBrowserPath = async (): Promise<string> => {
  for (const candidate of CHROME_PATH_CANDIDATES) {
    try {
      await import("fs/promises").then((fs) => fs.access(candidate));
      return candidate;
    } catch {
      // continue
    }
  }
  throw new Error("No Chromium-compatible browser found. Set PUPPETEER_EXECUTABLE_PATH.");
};

const getBrowser = async (): Promise<Browser> => {
  if (!browserPromise) {
    browserPromise = (async () => {
      const executablePath = await resolveBrowserPath();
      return puppeteer.launch({
        executablePath,
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=none"],
      });
    })();
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
    await page.setContent(html, { waitUntil: "networkidle0" });

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
    if (String(error?.message || "").includes("No Chromium-compatible browser found")) {
      return res.status(500).json({
        message: "Browser runtime not found for PDF generation. Set PUPPETEER_EXECUTABLE_PATH.",
      });
    }
    console.error("Error generating inspection report PDF:", error);
    return res.status(500).json({ message: "Failed to generate inspection report PDF" });
  }
});

export default router;
