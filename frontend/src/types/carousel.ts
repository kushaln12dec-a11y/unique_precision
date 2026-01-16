export interface UseCarouselOptions {
  totalSlides: number;
  threshold?: number; // Minimum drag distance to trigger slide change (default: 50px)
  enableAutoPlay?: boolean;
  autoPlayInterval?: number;
}

export interface UseCarouselReturn {
  currentSlide: number;
  isDragging: boolean;
  dragOffset: number;
  handleMouseDown: (e: React.MouseEvent) => void;
  handleTouchStart: (e: React.TouchEvent) => void;
  goToSlide: (index: number) => void;
  nextSlide: () => void;
  prevSlide: () => void;
  slideWrapperStyle: React.CSSProperties;
}
