import { useState, useEffect, useRef } from "react";
import type { UseCarouselOptions, UseCarouselReturn } from "../types/carousel";

export const useCarousel = ({
  totalSlides,
  threshold = 50,
  enableAutoPlay = false,
  autoPlayInterval = 5000,
}: UseCarouselOptions): UseCarouselReturn => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Drag handlers
  const handleDragStart = (clientX: number) => {
    setIsDragging(true);
    setDragStart(clientX);
    setDragOffset(0);
  };


  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX);
  };

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientX);
  };

  // Navigation functions
  const goToSlide = (index: number) => {
    if (index >= 0 && index < totalSlides) {
      setCurrentSlide(index);
    }
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  // Slide wrapper style
  const slideWrapperStyle: React.CSSProperties = {
    transform: `translateX(calc(-${currentSlide * 100}% + ${dragOffset}px))`,
    transition: isDragging
      ? "none"
      : "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
  };

  // Global mouse/touch event listeners for smooth dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      const offset = e.clientX - dragStart;
      setDragOffset(offset);
    };

    const handleGlobalMouseUp = () => {
      const thresholdValue = threshold || 50;
      if (Math.abs(dragOffset) > thresholdValue) {
        if (dragOffset > 0) {
          setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
        } else {
          setCurrentSlide((prev) => (prev + 1) % totalSlides);
        }
      }
      setIsDragging(false);
      setDragOffset(0);
      setDragStart(0);
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const offset = e.touches[0].clientX - dragStart;
      setDragOffset(offset);
    };

    const handleGlobalTouchEnd = () => {
      const thresholdValue = threshold || 50;
      if (Math.abs(dragOffset) > thresholdValue) {
        if (dragOffset > 0) {
          setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
        } else {
          setCurrentSlide((prev) => (prev + 1) % totalSlides);
        }
      }
      setIsDragging(false);
      setDragOffset(0);
      setDragStart(0);
    };

    document.addEventListener("mousemove", handleGlobalMouseMove);
    document.addEventListener("mouseup", handleGlobalMouseUp);
    document.addEventListener("touchmove", handleGlobalTouchMove, {
      passive: false,
    });
    document.addEventListener("touchend", handleGlobalTouchEnd);

    return () => {
      document.removeEventListener("mousemove", handleGlobalMouseMove);
      document.removeEventListener("mouseup", handleGlobalMouseUp);
      document.removeEventListener("touchmove", handleGlobalTouchMove);
      document.removeEventListener("touchend", handleGlobalTouchEnd);
    };
  }, [isDragging, dragStart, dragOffset, threshold, totalSlides]);

  // Auto-play functionality
  useEffect(() => {
    if (!enableAutoPlay || isDragging) return;

    autoPlayRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }, autoPlayInterval);

    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
    };
  }, [enableAutoPlay, autoPlayInterval, totalSlides, isDragging]);

  return {
    currentSlide,
    isDragging,
    dragOffset,
    handleMouseDown,
    handleTouchStart,
    goToSlide,
    nextSlide,
    prevSlide,
    slideWrapperStyle,
  };
};
