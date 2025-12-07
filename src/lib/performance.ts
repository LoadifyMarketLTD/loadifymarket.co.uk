/**
 * Performance Monitoring Utilities
 * Track and report web vitals and performance metrics
 */

export interface PerformanceMetrics {
  FCP?: number; // First Contentful Paint
  LCP?: number; // Largest Contentful Paint
  FID?: number; // First Input Delay
  CLS?: number; // Cumulative Layout Shift
  TTFB?: number; // Time to First Byte
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {};

  constructor() {
    if (typeof window !== 'undefined') {
      this.measureWebVitals();
    }
  }

  private measureWebVitals() {
    // Measure First Contentful Paint (FCP)
    this.measureFCP();

    // Measure Largest Contentful Paint (LCP)
    this.measureLCP();

    // Measure First Input Delay (FID)
    this.measureFID();

    // Measure Cumulative Layout Shift (CLS)
    this.measureCLS();

    // Measure Time to First Byte (TTFB)
    this.measureTTFB();
  }

  private measureFCP() {
    try {
      const perfObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            this.metrics.FCP = entry.startTime;
            console.log('[Performance] FCP:', entry.startTime.toFixed(2), 'ms');
          }
        }
      });
      perfObserver.observe({ entryTypes: ['paint'] });
    } catch (e) {
      console.warn('FCP measurement not supported');
    }
  }

  private measureLCP() {
    try {
      const perfObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.metrics.LCP = lastEntry.startTime;
        console.log('[Performance] LCP:', lastEntry.startTime.toFixed(2), 'ms');
      });
      perfObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      console.warn('LCP measurement not supported');
    }
  }

  private measureFID() {
    try {
      const perfObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          const fidEntry = entry as PerformanceEventTiming;
          this.metrics.FID = fidEntry.processingStart - fidEntry.startTime;
          console.log('[Performance] FID:', this.metrics.FID.toFixed(2), 'ms');
        }
      });
      perfObserver.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      console.warn('FID measurement not supported');
    }
  }

  private measureCLS() {
    try {
      let clsValue = 0;
      const perfObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          const layoutShift = entry as any;
          if (!layoutShift.hadRecentInput) {
            clsValue += layoutShift.value;
          }
        }
        this.metrics.CLS = clsValue;
        console.log('[Performance] CLS:', clsValue.toFixed(4));
      });
      perfObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      console.warn('CLS measurement not supported');
    }
  }

  private measureTTFB() {
    try {
      const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigationTiming) {
        this.metrics.TTFB = navigationTiming.responseStart - navigationTiming.requestStart;
        console.log('[Performance] TTFB:', this.metrics.TTFB.toFixed(2), 'ms');
      }
    } catch (e) {
      console.warn('TTFB measurement not supported');
    }
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public logMetrics() {
    console.group('[Performance Metrics]');
    console.table(this.metrics);
    console.groupEnd();
  }

  // Log page load time
  public logPageLoadTime() {
    if (typeof window !== 'undefined') {
      window.addEventListener('load', () => {
        const loadTime = performance.now();
        console.log(`[Performance] Page loaded in ${loadTime.toFixed(2)}ms`);
      });
    }
  }

  // Monitor navigation timing
  public getNavigationTiming() {
    const timing = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (!timing) return null;

    return {
      dns: timing.domainLookupEnd - timing.domainLookupStart,
      tcp: timing.connectEnd - timing.connectStart,
      request: timing.responseStart - timing.requestStart,
      response: timing.responseEnd - timing.responseStart,
      dom: timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart,
      load: timing.loadEventEnd - timing.loadEventStart,
      total: timing.loadEventEnd - timing.fetchStart,
    };
  }

  // Monitor resource timing
  public getResourceTimings() {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    
    return resources.map((resource) => ({
      name: resource.name,
      type: resource.initiatorType,
      duration: resource.duration,
      size: resource.transferSize,
    }));
  }

  // Get the slowest resources
  public getSlowestResources(limit = 10) {
    const resources = this.getResourceTimings();
    return resources
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Helper function to mark performance points
export const markPerformance = (name: string) => {
  try {
    performance.mark(name);
  } catch (e) {
    console.warn('Performance marking not supported');
  }
};

// Helper function to measure between marks
export const measurePerformance = (name: string, startMark: string, endMark: string) => {
  try {
    performance.measure(name, startMark, endMark);
    const measure = performance.getEntriesByName(name)[0];
    console.log(`[Performance] ${name}:`, measure.duration.toFixed(2), 'ms');
    return measure.duration;
  } catch (e) {
    console.warn('Performance measurement not supported');
    return 0;
  }
};

// Initialize performance monitoring in development
if (import.meta.env.DEV) {
  performanceMonitor.logPageLoadTime();
  
  // Log metrics after 5 seconds
  setTimeout(() => {
    performanceMonitor.logMetrics();
    console.log('[Performance] Navigation Timing:', performanceMonitor.getNavigationTiming());
    console.log('[Performance] Slowest Resources:', performanceMonitor.getSlowestResources(5));
  }, 5000);
}
