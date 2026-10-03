export type LoginSlide = {
    id: string;
    title: string;
    subtitle?: string | null;
    content: string;
    highlight?: string | null;
    imageUrl?: string | null;
    buttonLabel?: string | null;
    buttonUrl?: string | null;
    sortOrder: number;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
};

export type LoginSlideInput = Omit<LoginSlide, "id" | "createdAt" | "updatedAt">;
