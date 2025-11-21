/**
 * MongoDB Tracker - REEL CAROUSEL Study Only
 * Tracks time spent on each slide and total slides swiped
 * Specifically designed for reel carousel structure
 */

(function() {
    'use strict';
    
    if (typeof window.MongoTracker === 'undefined') {
        console.error('MongoReelCarouselTracker: Base tracker not loaded');
        return;
    }
    
    if (!window.MongoTracker.isInitialized) {
        window.MongoTracker.initialize('reel_carousel');
    }
    
    // Reel Carousel specific state
    const reelState = {
        slides: null,
        track: null,
        carousel: null,
        currentSlideIndex: 0,
        slideStartTime: null,
        slideDwellTimes: {},
        totalSwipes: 0,
        uniqueSlidesViewed: new Set(),
        isTracking: false
    };
    
    /**
     * Find reel carousel elements (specific to reel structure)
     */
    function findReelCarousel() {
        const reel = document.querySelector('.reel[data-reel="1"]');
        if (!reel) return null;
        
        const carousel = reel.querySelector('.reel-carousel');
        const track = carousel ? carousel.querySelector('.reel-carousel-track') : null;
        const slides = track ? track.querySelectorAll('.reel-carousel-slide') : null;
        
        return { carousel, track, slides };
    }
    
    /**
     * Get current slide index from track transform
     * Handles both matrix() and translateX() formats
     */
    function getCurrentSlideIndex() {
        if (!reelState.track) return 0;
        
        // Try inline style first (more reliable)
        const inlineTransform = reelState.track.style.transform;
        if (inlineTransform) {
            // Check for translateX(-X%) format (percentage-based)
            const percentMatch = inlineTransform.match(/translateX\((-?\d+(?:\.\d+)?)%\)/);
            if (percentMatch) {
                const translatePercent = parseFloat(percentMatch[1]);
                const slideIndex = Math.round(Math.abs(translatePercent) / 100);
                return Math.min(slideIndex, reelState.slides ? reelState.slides.length - 1 : 0);
            }
            
            // Check for translateX(-Xpx) format (pixel-based)
            const pxMatch = inlineTransform.match(/translateX\((-?\d+(?:\.\d+)?)px\)/);
            if (pxMatch) {
                const translatePx = parseFloat(pxMatch[1]);
                const slideWidth = window.innerWidth;
                const slideIndex = Math.round(Math.abs(translatePx) / slideWidth);
                return Math.min(slideIndex, reelState.slides ? reelState.slides.length - 1 : 0);
            }
        }
        
        // Fallback to computed style (matrix format)
        const computedTransform = window.getComputedStyle(reelState.track).transform;
        if (computedTransform && computedTransform !== 'none') {
            const matrix = computedTransform.match(/matrix\(([^)]+)\)/);
            if (matrix) {
                const values = matrix[1].split(',');
                const translateX = parseFloat(values[4]) || 0;
                const slideWidth = window.innerWidth;
                const currentIndex = Math.round(Math.abs(translateX) / slideWidth);
                return Math.min(currentIndex, reelState.slides ? reelState.slides.length - 1 : 0);
            }
        }
        
        return 0;
    }
    
    /**
     * Track slide dwell time
     */
    function trackSlideDwell(slideIndex, dwellMs) {
        if (!reelState.slideDwellTimes[slideIndex]) {
            reelState.slideDwellTimes[slideIndex] = 0;
        }
        reelState.slideDwellTimes[slideIndex] += dwellMs;
        reelState.uniqueSlidesViewed.add(slideIndex);
        
        window.MongoTracker.track('reel_carousel_slide_dwell', {
            slide_index: slideIndex,
            dwell_ms: dwellMs,
            total_dwell_ms: reelState.slideDwellTimes[slideIndex],
            dwell_seconds: Math.round((reelState.slideDwellTimes[slideIndex] / 1000) * 100) / 100,
            condition: 'reel_carousel'
        });
    }
    
    /**
     * Track slide swipe
     */
    function trackSlideSwipe(fromSlide, toSlide) {
        reelState.totalSwipes++;
        reelState.uniqueSlidesViewed.add(toSlide);
        
        window.MongoTracker.track('reel_carousel_swipe', {
            from_slide: fromSlide,
            to_slide: toSlide,
            total_swipes: reelState.totalSwipes,
            unique_slides_viewed: reelState.uniqueSlidesViewed.size,
            condition: 'reel_carousel'
        });
    }
    
    /**
     * Track final summary
     */
    function trackSummary() {
        const totalTime = Object.values(reelState.slideDwellTimes).reduce((sum, time) => sum + time, 0);
        
        window.MongoTracker.track('reel_carousel_summary', {
            total_slides: reelState.slides.length,
            slides_viewed: reelState.uniqueSlidesViewed.size,
            total_swipes: reelState.totalSwipes,
            slide_dwell_times: reelState.slideDwellTimes,
            total_time_seconds: Math.round((totalTime / 1000) * 100) / 100,
            condition: 'reel_carousel'
        });
    }
    
    /**
     * Handle slide change
     */
    function handleSlideChange(newSlideIndex) {
        if (!reelState.isTracking) return;
        
        const now = Date.now();
        const dwellMs = reelState.slideStartTime ? (now - reelState.slideStartTime) : 0;
        
        // Track dwell time for previous slide
        if (reelState.currentSlideIndex >= 0 && dwellMs > 0) {
            trackSlideDwell(reelState.currentSlideIndex, dwellMs);
        }
        
        // Track swipe if slide changed
        if (newSlideIndex !== reelState.currentSlideIndex) {
            trackSlideSwipe(reelState.currentSlideIndex, newSlideIndex);
        }
        
        reelState.currentSlideIndex = newSlideIndex;
        reelState.slideStartTime = now;
        reelState.uniqueSlidesViewed.add(newSlideIndex);
        
        console.log('MongoReelCarouselTracker: Slide changed to', newSlideIndex);
    }
    
    /**
     * Monitor slide changes using multiple methods
     */
    function monitorSlides() {
        // Method 1: MutationObserver for transform changes
        if (reelState.track) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                        setTimeout(() => {
                            const currentSlide = getCurrentSlideIndex();
                            if (currentSlide !== reelState.currentSlideIndex) {
                                handleSlideChange(currentSlide);
                            }
                        }, 50);
                    }
                });
            });
            
            observer.observe(reelState.track, {
                attributes: true,
                attributeFilter: ['style']
            });
        }
        
        // Method 2: Event listeners for swipe/touch events
        if (reelState.carousel) {
            const handleSwipeEnd = () => {
                setTimeout(() => {
                    const currentSlide = getCurrentSlideIndex();
                    if (currentSlide !== reelState.currentSlideIndex) {
                        handleSlideChange(currentSlide);
                    }
                }, 100);
            };
            
            reelState.carousel.addEventListener('touchend', handleSwipeEnd);
            reelState.carousel.addEventListener('mouseup', handleSwipeEnd);
        }
        
        // Method 3: Listen for dot clicks (direct navigation)
        const dots = document.querySelectorAll('.reel-carousel-dot');
        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                setTimeout(() => {
                    handleSlideChange(index);
                }, 50);
            });
        });
        
        // Method 4: Polling as fallback (less frequent)
        setInterval(() => {
            if (!reelState.isTracking) return;
            
            const currentSlide = getCurrentSlideIndex();
            if (currentSlide !== reelState.currentSlideIndex) {
                handleSlideChange(currentSlide);
            }
        }, 1000); // Check every second as fallback
    }
    
    /**
     * Start tracking
     */
    function startTracking() {
        const carouselData = findReelCarousel();
        if (!carouselData || !carouselData.slides || carouselData.slides.length === 0) {
            setTimeout(startTracking, 1000);
            return;
        }
        
        reelState.slides = carouselData.slides;
        reelState.track = carouselData.track;
        reelState.carousel = carouselData.carousel;
        reelState.currentSlideIndex = getCurrentSlideIndex();
        reelState.slideStartTime = Date.now();
        reelState.isTracking = true;
        reelState.uniqueSlidesViewed.add(reelState.currentSlideIndex);
        
        console.log('MongoReelCarouselTracker: Started tracking', reelState.slides.length, 'slides');
        console.log('MongoReelCarouselTracker: Initial slide index:', reelState.currentSlideIndex);
        monitorSlides();
    }
    
    /**
     * Handle page unload
     */
    function handleUnload() {
        if (!reelState.isTracking) return;
        
        if (reelState.slideStartTime) {
            const dwellMs = Date.now() - reelState.slideStartTime;
            if (dwellMs > 0) {
                trackSlideDwell(reelState.currentSlideIndex, dwellMs);
            }
        }
        
        trackSummary();
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(startTracking, 1500));
    } else {
        setTimeout(startTracking, 1500);
    }
    
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);
    
    console.log('MongoReelCarouselTracker: Loaded');
    
})();

