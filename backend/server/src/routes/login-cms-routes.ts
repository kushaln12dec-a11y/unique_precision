import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import { authorize } from "../middleware/rbac-middleware";

const router = Router();

const DEFAULT_COMPANY_SLIDES = [
    {
        title: "UNIQUE PRECISION",
        subtitle: "Our Advanced Manufacturing Solutions",
        content:
            "FANUC ROBOCUT WIRE EDM MACHINE: The superior engineered Robocut Aoic Series comes with fully integrated Japan's Fanuc reliability, 3 axis Capability, maximum taper angle, accuracy and high surface finish\n" +
            'EDM DRILLING MACHINE: The controlled technology built super EDM Machine comprises of "one-touch one hole" feature adopting 3D accuracy equally among x, y and z-axis\n' +
            "Tesa - Hite 600 - Height Master: Experience fastest and Simplest measurement with TESA- HITE features programmed routines for more accurate and complex measurement which is far efficient than ever before",
        sortOrder: 0,
        isActive: true,
    },
    {
        title: "Facilities",
        subtitle: "The Service we render are auto components & All Types of wedm job works with some as follows",
        content:
            "Forging Dies\nGear Cutting\nDie Insert\nSpoke Dies\nConducting Dies\nPcd Cutting\nBullet Dies\nCarbide Snap Gauges\nRing Gauges\nPlug Gauges\nDiamond Gauges\nDrop Gauges\nProfile Gauges\nFixtures\nMould Tools\nPress Tools",
        sortOrder: 1,
        isActive: true,
    },
    {
        title: "Quality Instrument Traits",
        subtitle: "Precision Measurement Instruments",
        content:
            "Slip Gauges: Come in sets of blocks of various sizes. Two or more blocks are wrung together to form a stack of required dimension, used to measure the length or width of a slot as accurate as 0.005mm\n" +
            "Pin Gauges: Precision ground cylindrical bars used to measure the diameter of a hole. Available from dia 1.00mm to dia 5.00mm in step of 0.01mm\n" +
            "Outside Micrometer: Precision measuring instrument used to measure small distances. Measurements are digitally displayed on the LCD screen. Least count is 0.001mm. Maximum measurable size available is 25.000mm\n" +
            "Dial Caliper: Used to measure the inner and outer dimensions accurately. Least count is 0.01mm. Available size is 150.00mm\n" +
            "Dial Gauge: Used to accurately measure small linear distances, for example to square a job before starting the wire EDM process, to check the perpendicularity of the job. Least count is 0.002mm\n" +
            "Vernier Height Gauge: A measuring device used for determining the height of objects, and for marking of items to be worked on. Used in metalworking or metrology to either set or measure vertical distances",
        sortOrder: 2,
        isActive: true,
    },
    {
        title: "Why Unique Precision",
        subtitle: "We at Unique Precision, strive to give our customers an incomparable tooling experience with a commitment of quality, trust, accuracy and affordability. our promises include:",
        content:
            "Accuracy Variety & Quality: When we say variety, unique precision has got, Digital Micrometer, Dial Vernier, Dial Gauge, Slip Gauges, Pin Gauges as precision measuring instruments. We wire EDM parts as accurate as 0.002mm and surface finish up to Ra 0.30\n" +
            "Quality & On-Time Job Processing: Customers have the flexibility to send the drawings any time via e-mail. We do accept hard copy drawings as well. We ensure fast turnarounds. Also, we work 24/7 to help us meet our production commitments\n" +
            "4 Axis Capability: With our 4 axis capabilities, we can machine major complex profiles. When it comes to suiting punch and die we can either press or slip fit as per customer demand and requirements",
        sortOrder: 3,
        isActive: true,
    },
];

async function ensureDefaultSlidesExist() {
    try {
        const count = await prisma.loginSlide.count();
        if (count === 0) {
            await prisma.loginSlide.createMany({
                data: DEFAULT_COMPANY_SLIDES,
            });
            console.log("[LoginCMS] Seeded 4 default company slides.");
        }
    } catch (error) {
        console.error("Error checking/seeding default login slides:", error);
    }
}

// Public endpoint — read active slides (no auth required, for login page)
router.get("/public", async (_req, res) => {
    try {
        await ensureDefaultSlidesExist();
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
        await ensureDefaultSlidesExist();
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
