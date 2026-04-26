import { Router } from "express";
import { authenticateEventStream } from "../middleware/auth.middleware";
import { authorize } from "../middleware/rbac.middleware";
import { JOBS_UPDATE_EVENT, sseEmitter, type JobsUpdateEvent } from "../lib/sseEmitter";

const router = Router();

router.use(authenticateEventStream);

router.get("/jobs", authorize("ADMIN", "ACCOUNTANT", "PROGRAMMER", "OPERATOR", "QC"), (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  res.write("retry: 5000\n\n");

  const writeEvent = (event: JobsUpdateEvent) => {
    res.write(`event: ${JOBS_UPDATE_EVENT}\n`);
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  const keepAliveTimer = setInterval(() => {
    res.write(": keep-alive\n\n");
  }, 25_000);

  sseEmitter.on(JOBS_UPDATE_EVENT, writeEvent);

  req.on("close", () => {
    clearInterval(keepAliveTimer);
    sseEmitter.off(JOBS_UPDATE_EVENT, writeEvent);
    res.end();
  });
});

export default router;
