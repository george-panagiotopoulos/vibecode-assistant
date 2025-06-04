/**
 * AutoScrollService - Handles automatic scrolling for streaming content
 * 
 * Features:
 * - Detects streaming content updates
 * - Checks for scrollbar presence
 * - Implements smooth auto-scrolling
 * - Provides user override controls
 * - Cross-browser compatibility
 * - Performance optimization
 * 
 * NFR Compliance:
 * - Performance: Debounced scroll operations
 * - Usability: User can override auto-scroll
 * - Accessibility: Respects user preferences
 * - Cross-browser: Works on all modern browsers
 */

import loggingService from './LoggingService';

class AutoScrollService {
  constructor() {
    this.scrollTargets = new Map(); // Track multiple scroll targets
    this.userOverrides = new Map(); // Track user scroll overrides
    this.scrollObservers = new Map(); // Track scroll observers
    this.config = {
      scrollThreshold: 50, // Pixels from bottom to trigger auto-scroll
      scrollBehavior: 'smooth', // 'smooth' or 'auto'
      debounceDelay: 100, // Debounce delay for performance
      userOverrideTimeout: 3000, // Time before re-enabling auto-scroll after user interaction
      enableLogging: true
    };
    
    // Bind methods to preserve context
    this.handleUserScroll = this.handleUserScroll.bind(this);
    this.checkAndScroll = this.checkAndScroll.bind(this);
    
    this.log('AutoScrollService initialized', { config: this.config });
  }

  /**
   * Step 1: Register a scroll target for auto-scrolling
   * @param {string} targetId - Unique identifier for the scroll target
   * @param {HTMLElement} element - DOM element to scroll
   * @param {Object} options - Configuration options
   */
  registerScrollTarget(targetId, element, options = {}) {
    if (!element || !element.scrollHeight) {
      this.log('Invalid scroll target element', { targetId, element }, 'warn');
      return false;
    }

    const config = {
      ...this.config,
      ...options,
      element,
      isStreaming: false,
      lastScrollHeight: element.scrollHeight,
      lastScrollTop: element.scrollTop
    };

    this.scrollTargets.set(targetId, config);
    this.userOverrides.set(targetId, false);

    // Add user scroll listener
    element.addEventListener('scroll', (e) => this.handleUserScroll(targetId, e), { passive: true });

    // Add resize observer for responsive behavior
    if (window.ResizeObserver) {
      const resizeObserver = new ResizeObserver(() => {
        this.checkAndScroll(targetId);
      });
      resizeObserver.observe(element);
      this.scrollObservers.set(targetId, resizeObserver);
    }

    this.log('Scroll target registered', { targetId, config: { ...config, element: '[HTMLElement]' } });
    return true;
  }

  /**
   * Step 2: Unregister a scroll target
   * @param {string} targetId - Target identifier to remove
   */
  unregisterScrollTarget(targetId) {
    const target = this.scrollTargets.get(targetId);
    if (target) {
      // Remove event listeners
      target.element.removeEventListener('scroll', this.handleUserScroll);
      
      // Clean up resize observer
      const observer = this.scrollObservers.get(targetId);
      if (observer) {
        observer.disconnect();
        this.scrollObservers.delete(targetId);
      }
    }

    this.scrollTargets.delete(targetId);
    this.userOverrides.delete(targetId);
    
    this.log('Scroll target unregistered', { targetId });
  }

  /**
   * Step 3: Detect if element has scrollbar
   * @param {HTMLElement} element - Element to check
   * @returns {boolean} True if scrollbar is present
   */
  hasScrollbar(element) {
    if (!element) return false;
    
    const hasVerticalScrollbar = element.scrollHeight > element.clientHeight;
    const hasHorizontalScrollbar = element.scrollWidth > element.clientWidth;
    
    return hasVerticalScrollbar || hasHorizontalScrollbar;
  }

  /**
   * Step 4: Check if element is near bottom (within threshold)
   * @param {HTMLElement} element - Element to check
   * @param {number} threshold - Distance from bottom in pixels
   * @returns {boolean} True if near bottom
   */
  isNearBottom(element, threshold = this.config.scrollThreshold) {
    if (!element) return false;
    
    const { scrollTop, scrollHeight, clientHeight } = element;
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
    
    return distanceFromBottom <= threshold;
  }

  /**
   * Step 5: Handle user scroll events to detect manual scrolling
   * @param {string} targetId - Target identifier
   * @param {Event} event - Scroll event
   */
  handleUserScroll(targetId, event) {
    const target = this.scrollTargets.get(targetId);
    if (!target) return;

    const element = target.element;
    const currentScrollTop = element.scrollTop;
    const previousScrollTop = target.lastScrollTop;

    // Detect if user scrolled up (manual interaction)
    if (currentScrollTop < previousScrollTop && target.isStreaming) {
      this.userOverrides.set(targetId, true);
      this.log('User scroll override detected', { targetId, currentScrollTop, previousScrollTop });

      // Set timeout to re-enable auto-scroll
      setTimeout(() => {
        if (this.isNearBottom(element)) {
          this.userOverrides.set(targetId, false);
          this.log('Auto-scroll re-enabled after timeout', { targetId });
        }
      }, target.userOverrideTimeout || this.config.userOverrideTimeout);
    }

    // Update last scroll position
    target.lastScrollTop = currentScrollTop;
  }

  /**
   * Step 6: Perform auto-scroll with smooth animation
   * @param {string} targetId - Target identifier
   * @param {Object} options - Scroll options
   */
  scrollToBottom(targetId, options = {}) {
    const target = this.scrollTargets.get(targetId);
    if (!target) {
      this.log('Scroll target not found', { targetId }, 'warn');
      return false;
    }

    const element = target.element;
    const scrollBehavior = options.behavior || target.scrollBehavior || this.config.scrollBehavior;

    try {
      // Use scrollTo for smooth scrolling
      element.scrollTo({
        top: element.scrollHeight,
        behavior: scrollBehavior
      });

      // Fallback for older browsers
      if (element.scrollTop !== element.scrollHeight - element.clientHeight) {
        element.scrollTop = element.scrollHeight;
      }

      this.log('Auto-scroll performed', { 
        targetId, 
        scrollHeight: element.scrollHeight,
        scrollTop: element.scrollTop,
        behavior: scrollBehavior
      });

      return true;
    } catch (error) {
      this.log('Auto-scroll failed', { targetId, error: error.message }, 'error');
      return false;
    }
  }

  /**
   * Step 7: Check conditions and perform auto-scroll if needed
   * @param {string} targetId - Target identifier
   */
  checkAndScroll(targetId) {
    const target = this.scrollTargets.get(targetId);
    if (!target) return;

    const element = target.element;
    const isUserOverridden = this.userOverrides.get(targetId);

    // Skip if user has overridden or not streaming
    if (isUserOverridden || !target.isStreaming) {
      return;
    }

    // Check if content has grown (new content added)
    const currentScrollHeight = element.scrollHeight;
    const hasNewContent = currentScrollHeight > target.lastScrollHeight;

    // Check if scrollbar exists and we're near bottom
    const hasScrollbar = this.hasScrollbar(element);
    const isNearBottom = this.isNearBottom(element, target.scrollThreshold);

    if (hasNewContent && hasScrollbar && isNearBottom) {
      this.scrollToBottom(targetId);
    }

    // Update last scroll height
    target.lastScrollHeight = currentScrollHeight;
  }

  /**
   * Step 8: Start streaming mode for a target
   * @param {string} targetId - Target identifier
   */
  startStreaming(targetId) {
    const target = this.scrollTargets.get(targetId);
    if (!target) {
      this.log('Cannot start streaming - target not found', { targetId }, 'warn');
      return false;
    }

    target.isStreaming = true;
    this.userOverrides.set(targetId, false); // Reset user override
    
    this.log('Streaming started', { targetId });
    return true;
  }

  /**
   * Step 9: Stop streaming mode for a target
   * @param {string} targetId - Target identifier
   */
  stopStreaming(targetId) {
    const target = this.scrollTargets.get(targetId);
    if (!target) {
      this.log('Cannot stop streaming - target not found', { targetId }, 'warn');
      return false;
    }

    target.isStreaming = false;
    
    this.log('Streaming stopped', { targetId });
    return true;
  }

  /**
   * Step 10: Handle content updates during streaming
   * @param {string} targetId - Target identifier
   * @param {string} newContent - New content added
   */
  onContentUpdate(targetId, newContent = '') {
    // Debounced scroll check for performance
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    this.scrollTimeout = setTimeout(() => {
      this.checkAndScroll(targetId);
    }, this.config.debounceDelay);

    this.log('Content update processed', { 
      targetId, 
      contentLength: newContent.length,
      debounceDelay: this.config.debounceDelay 
    });
  }

  /**
   * Step 11: Update configuration
   * @param {Object} newConfig - New configuration options
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.log('Configuration updated', { config: this.config });
  }

  /**
   * Step 12: Get current status for a target
   * @param {string} targetId - Target identifier
   * @returns {Object} Status information
   */
  getStatus(targetId) {
    const target = this.scrollTargets.get(targetId);
    if (!target) {
      return { exists: false };
    }

    const element = target.element;
    return {
      exists: true,
      isStreaming: target.isStreaming,
      isUserOverridden: this.userOverrides.get(targetId),
      hasScrollbar: this.hasScrollbar(element),
      isNearBottom: this.isNearBottom(element),
      scrollHeight: element.scrollHeight,
      scrollTop: element.scrollTop,
      clientHeight: element.clientHeight
    };
  }

  /**
   * Utility: Logging with service prefix
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   * @param {string} level - Log level
   */
  log(message, data = {}, level = 'info') {
    if (!this.config.enableLogging) return;

    const logData = {
      service: 'AutoScrollService',
      ...data
    };

    switch (level) {
      case 'error':
        loggingService.logError('auto_scroll_service', message, logData);
        break;
      case 'warn':
        loggingService.logWarning(message, logData);
        break;
      default:
        loggingService.logInfo(message, logData);
    }
  }

  /**
   * Cleanup method for component unmounting
   */
  cleanup() {
    // Clear all timeouts
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    // Unregister all targets
    for (const targetId of this.scrollTargets.keys()) {
      this.unregisterScrollTarget(targetId);
    }

    this.log('AutoScrollService cleaned up');
  }
}

// Export singleton instance
export default new AutoScrollService(); 