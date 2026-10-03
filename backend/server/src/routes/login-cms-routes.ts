import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import { authorize } from "../middleware/rbac-middleware";

const router = Router();

// Public endpoint — read active slides (no auth required, for login page)
router.get("/public", async (_req, res) => {
    try {
        const slides = await prisma.loginSlide.findMany({
            where: { isActive: true },
            orderBy: { sortOrder: "asc" },
            select: {
                id: true,
                title: true,
                subtitle: true,
                content: true,
                highlight: true,
                imageUrl: true,
                buttonLabel: true,
                buttonUrl: true,
                sortOrder: true,
            },
        });
        res.json(slides);
    } catch (error: any) {
        console.error("Error fetching public login slides:", error);
        res.status(500).json({ message: "Error fetching login slides" });
    }
});

// All management routes require authentication
router.use(authMiddleware);

// Get all slides (admin management view)
router.get("/", authorize("ADMIN"), async (_req, res) => {
    try {
        const slides = await prisma.loginSlide.findMany({
            orderBy: { sortOrder: "asc" },
        });
        res.json(slides);
    } catch (error: any) {
        console.error("Error fetching login slides:", error);
        res.status(500).json({ message: "Error fetching login slides" });
    }
});

// Get single slide
router.get("/:id", authorize("ADMIN"), async (req, res) => {
    try {
        const slide = await prisma.loginSlide.findUnique({
            where: { id: String(req.params.id) },
        });
        if (!slide) {
            return res.status(404).json({ message: "Login slide not found" });
        }
        res.json(slide);
    } catch (error: any) {
        res.status(500).json({ message: "Error fetching login slide" });
    }
});

// Create slide
router.post("/", authorize("ADMIN"), async (req, res) => {
    try {
        const { title, subtitle, content, highlight, imageUrl, buttonLabel, buttonUrl, sortOrder, isActive } = req.body;

        if (!title || typeof title !== "string" || !title.trim()) {
            return res.status(400).json({ message: "title is required" });
        }
        if (!content || typeof content !== "string" || !content.trim()) {
            return res.status(400).json({ message: "content is required" });
        }

        // Sanitize title/content (strip script tags)
        const sanitize = (text: string) => text.replace(/<script[\s\S]*?<\/script>/gi, "").substring(0, 10000);

        const slide = await prisma.loginSlide.create({
            data: {
                title: sanitize(title.trim()),
                subtitle: subtitle ? sanitize(subtitle.trim()) : null,
                content: sanitize(content.trim()),
                highlight: highlight ? sanitize(highlight.trim()) : null,
                imageUrl: imageUrl?.trim() || null,
                buttonLabel: buttonLabel?.trim() || null,
                buttonUrl: buttonUrl?.trim() || null,
                sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
                isActive: typeof isActive === "boolean" ? isActive : true,
            },
        });

        res.status(201).json(slide);
    } catch (error: any) {
        console.error("Error creating login slide:", error);
        res.status(500).json({ message: "Error creating login slide" });
    }
});

// Update slide
router.put("/:id", authorize("ADMIN"), async (req, res) => {
    try {
        const id = String(req.params.id);
        const { title, subtitle, content, highlight, imageUrl, buttonLabel, buttonUrl, sortOrder, isActive } = req.body;

        const existing = await prisma.loginSlide.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ message: "Login slide not found" });
        }

        const sanitize = (text: string) => text.replace(/<script[\s\S]*?<\/script>/gi, "").substring(0, 10000);

        const slide = await prisma.loginSlide.update({
            where: { id },
            data: {
                ...(title !== undefined && { title: sanitize(String(title).trim()) }),
                ...(subtitle !== undefined && { subtitle: subtitle ? sanitize(String(subtitle).trim()) : null }),
                ...(content !== undefined && { content: sanitize(String(content).trim()) }),
                ...(highlight !== undefined && { highlight: highlight ? sanitize(String(highlight).trim()) : null }),
                ...(imageUrl !== undefined && { imageUrl: imageUrl?.trim() || null }),
                ...(buttonLabel !== undefined && { buttonLabel: buttonLabel?.trim() || null }),
                ...(buttonUrl !== undefined && { buttonUrl: buttonUrl?.trim() || null }),
                ...(typeof sortOrder === "number" && { sortOrder }),
                ...(typeof isActive === "boolean" && { isActive }),
            },
        });

        res.json(slide);
    } catch (error: any) {
        if (error.code === "P2025") {
            return res.status(404).json({ message: "Login slide not found" });
        }
        console.error("Error updating login slide:", error);
        res.status(500).json({ message: "Error updating login slide" });
    }
});

// Reorder slides (batch update sortOrder)
router.put("/reorder/batch", authorize("ADMIN"), async (req, res) => {
    try {
        const { order } = req.body as { order: Array<{ id: string; sortOrder: number }> };

        if (!Array.isArray(order)) {
            return res.status(400).json({ message: "order array is required" });
        }

        await prisma.$transaction(
            order.map((item) =>
                prisma.loginSlide.update({
                    where: { id: String(item.id) },
                    data: { sortOrder: item.sortOrder },
                })
            )
        );

        const slides = await prisma.loginSlide.findMany({ orderBy: { sortOrder: "asc" } });
        res.json(slides);
    } catch (error: any) {
        console.error("Error reordering login slides:", error);
        res.status(500).json({ message: "Error reordering login slides" });
    }
});

// Delete slide
router.delete("/:id", authorize("ADMIN"), async (req, res) => {
    try {
        await prisma.loginSlide.delete({ where: { id: String(req.params.id) } });
        res.json({ message: "Login slide deleted successfully" });
    } catch (error: any) {
        if (error.code === "P2025") {
            return res.status(404).json({ message: "Login slide not found" });
        }
        console.error("Error deleting login slide:", error);
        res.status(500).json({ message: "Error deleting login slide" });
    }
});

export default router;
