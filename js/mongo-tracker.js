/**
 * MongoDB Tracker for Reel Carousel Study
 * Extends base tracker with carousel-specific events
 */

// Load base tracker first (should be loaded before this)
if (typeof window.MongoTracker === 'undefined') {
    console.error('MongoTracker: Base tracker not loaded. Include mongo-tracker-base.js first.');
}

(function() {
    'use strict';
    
    // Initialize with study type
    if (window.MongoTracker && !window.MongoTracker.isInitialized) {
        window.MongoTracker.initialize('reel_carousel');
    }
    
    // Carousel tracking state
    let carouselState = {
        isStarted: false,
        currentSlide: 0,
        slidesViewed: [],
        slideStartTime: null
    };
    
    /**
     * Track carousel start
     */
    function trackCarouselStart(totalSlides) {
        if (window.MongoTracker && !carouselState.isStarted) {
            carouselState.isStarted = true;
            window.MongoTracker.track('carousel_start', {
                total_slides: totalSlides,
                carousel_type: 'reel_carousel',
                carousel_id: 'nyu_reel_carousel'
            });
        }
    }
    
    /**
     * Track slide view
     */
    function trackSlideView(slideIndex, direction = 'unknown') {
        if (window.MongoTracker) {
            if (!carouselState.slidesViewed.includes(slideIndex)) {
                carouselState.slidesViewed.push(slideIndex);
            }
            
            window.MongoTracker.track('slide_view', {
                slide_index: slideIndex,
                direction: direction,
                total_slides_viewed: carouselState.slidesViewed.length,
                carousel_type: 'reel_carousel'
            });
        }
    }
    
    /**
     * Track dwell end (time spent on slide)
     */
    function trackDwellEnd(slideIndex, dwellMs) {
        if (window.MongoTracker) {
            window.MongoTracker.track('dwell_end', {
                slide_index: slideIndex,
                dwell_ms: dwellMs,
                dwell_seconds: Math.round(dwellMs / 1000 * 100) / 100,
                carousel_type: 'reel_carousel'
            });
        }
    }
    
    /**
     * Track carousel complete
     */
    function trackCarouselComplete(totalSlides) {
        if (window.MongoTracker && carouselState.isStarted) {
            window.MongoTracker.track('carousel_complete', {
                total_slides: totalSlides,
                slides_viewed_count: carouselState.slidesViewed.length,
                slides_viewed: carouselState.slidesViewed,
                carousel_type: 'reel_carousel',
                completed: carouselState.slidesViewed.length === totalSlides
            });
        }
    }
    
    /**
     * Track CTA click
     */
    function trackCTAClick(ctaType, ctaId) {
        if (window.MongoTracker) {
            window.MongoTracker.track('cta_click', {
                cta_type: ctaType,
                cta_id: ctaId,
                carousel_type: 'reel_carousel'
            });
        }
    }
    
    /**
     * Track scroll
     */
    function trackScroll(scrollDepth) {
        if (window.MongoTracker) {
            window.MongoTracker.track('scroll', {
                scroll_depth: scrollDepth,
                carousel_type: 'reel_carousel'
            });
        }
    }
    
    // Expose functions globally for integration
    window.MongoCarouselTracker = {
        trackCarouselStart: trackCarouselStart,
        trackSlideView: trackSlideView,
        trackDwellEnd: trackDwellEnd,
        trackCarouselComplete: trackCarouselComplete,
        trackCTAClick: trackCTAClick,
        trackScroll: trackScroll
    };
    
    console.log('MongoTracker: Reel Carousel tracker loaded');
    
})();

