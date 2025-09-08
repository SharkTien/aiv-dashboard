// Client-side UTM click tracking utilities

export interface UTMTrackingConfig {
  apiEndpoint?: string;
  autoTrack?: boolean;
  trackExternalLinks?: boolean;
}

export class UTMTracker {
  private config: UTMTrackingConfig;
  private trackedLinks: Set<string> = new Set();

  constructor(config: UTMTrackingConfig = {}) {
    this.config = {
      apiEndpoint: '/api/utm/track',
      autoTrack: true,
      trackExternalLinks: false,
      ...config
    };

    if (this.config.autoTrack && typeof window !== 'undefined') {
      this.initAutoTracking();
    }
  }

  // Initialize automatic click tracking
  private initAutoTracking() {
    // Track clicks on UTM links
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a') as HTMLAnchorElement;
      
      if (link && this.shouldTrackLink(link)) {
        this.trackLinkClick(link, 'original');
      }
    });

    // Track form submissions with UTM parameters
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement;
      if (form && this.hasUTMParams(form.action)) {
        this.trackFormSubmission(form);
      }
    });
  }

  // Check if link should be tracked
  private shouldTrackLink(link: HTMLAnchorElement): boolean {
    const href = link.href;
    
    // Skip if no href
    if (!href) return false;
    
    // Skip if already tracked this session
    if (this.trackedLinks.has(href)) return false;
    
    // Check if link has UTM parameters
    if (this.hasUTMParams(href)) return true;
    
    // Check if link has UTM tracking data attribute
    if (link.dataset.utmLinkId) return true;
    
    // Skip external links unless enabled
    if (!this.config.trackExternalLinks && this.isExternalLink(href)) return false;
    
    return false;
  }

  // Check if URL has UTM parameters
  private hasUTMParams(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const params = urlObj.searchParams;
      
      return params.has('utm_source') || 
             params.has('utm_medium') || 
             params.has('utm_campaign') ||
             params.has('utm_content') ||
             params.has('utm_term');
    } catch {
      return false;
    }
  }

  // Check if link is external
  private isExternalLink(href: string): boolean {
    try {
      const url = new URL(href);
      return url.hostname !== window.location.hostname;
    } catch {
      return false;
    }
  }

  // Track link click
  async trackLinkClick(link: HTMLAnchorElement, clickType: 'original' | 'shortened' = 'original') {
    const href = link.href;
    
    // Mark as tracked
    this.trackedLinks.add(href);
    
    try {
      // Extract UTM link ID from data attribute or try to find in database
      const utmLinkId = link.dataset.utmLinkId || await this.findUTMLinkId(href);
      
      if (!utmLinkId) {
        console.warn('UTM link ID not found for:', href);
        return;
      }

      // Fire-and-forget tracking to avoid delaying navigation
      this.sendTrackingRequest({
        utm_link_id: parseInt(utmLinkId),
        click_type: clickType,
        url: href,
        element_type: 'link',
        element_text: link.textContent?.trim() || '',
        element_position: this.getElementPosition(link)
      }).catch(() => {});

    } catch (error) {
      console.error('Error tracking link click:', error);
    }
  }

  // Track form submission
  async trackFormSubmission(form: HTMLFormElement) {
    try {
      const action = form.action;
      const utmLinkId = await this.findUTMLinkId(action);
      
      if (!utmLinkId) return;

      await this.sendTrackingRequest({
        utm_link_id: parseInt(utmLinkId),
        click_type: 'original',
        url: action,
        element_type: 'form',
        element_text: 'Form Submission',
        form_data: this.extractFormData(form)
      });

    } catch (error) {
      console.error('Error tracking form submission:', error);
    }
  }

  // Find UTM link ID by URL
  private async findUTMLinkId(url: string): Promise<string | null> {
    try {
      // Try to extract UTM parameters and match with database
      const urlObj = new URL(url);
      const searchParams = new URLSearchParams();
      
      // Add UTM parameters to search
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(param => {
        const value = urlObj.searchParams.get(param);
        if (value) searchParams.set(param, value);
      });
      
      if (searchParams.toString()) {
        const response = await fetch(`/api/utm/find?${searchParams.toString()}`);
        if (response.ok) {
          const data = await response.json();
          return data.utm_link_id?.toString() || null;
        }
      }
      
      return null;
    } catch {
      return null;
    }
  }

  // Send tracking request
  private async sendTrackingRequest(data: any) {
    try {
      // Prefer sendBeacon for non-blocking delivery
      if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        const ok = navigator.sendBeacon(this.config.apiEndpoint!, blob);
        if (ok) return { success: true, method: 'beacon' } as any;
      }

      // Fallback to fetch with keepalive to not block navigation
      const response = await fetch(this.config.apiEndpoint!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        keepalive: true,
        cache: 'no-store'
      });
      if (!response.ok) throw new Error(`Tracking request failed: ${response.status}`);
      return await response.json();
    } catch (error) {
      // Use image pixel as fallback for tracking
      const img = new Image();
      img.src = `${this.config.apiEndpoint}?id=${data.utm_link_id}&type=${data.click_type}&_=${Date.now()}`;
      throw error;
    }
  }

  // Get element position on page
  private getElementPosition(element: HTMLElement): { x: number; y: number } {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY
    };
  }

  // Extract form data
  private extractFormData(form: HTMLFormElement): any {
    const formData = new FormData(form);
    const data: any = {};
    
    for (const [key, value] of formData.entries()) {
      // Only include non-sensitive data
      if (!this.isSensitiveField(key)) {
        data[key] = value;
      }
    }
    
    return data;
  }

  // Check if form field is sensitive
  private isSensitiveField(fieldName: string): boolean {
    const sensitiveFields = [
      'password', 'pwd', 'pass', 'secret',
      'token', 'api_key', 'credit_card', 'ssn',
      'social_security', 'bank_account'
    ];
    
    return sensitiveFields.some(field => 
      fieldName.toLowerCase().includes(field)
    );
  }

  // Manual tracking method
  async trackClick(utmLinkId: number, clickType: 'original' | 'shortened' = 'original', additionalData?: any) {
    try {
      await this.sendTrackingRequest({
        utm_link_id: utmLinkId,
        click_type: clickType,
        ...additionalData
      });
    } catch (error) {
      console.error('Error in manual tracking:', error);
    }
  }

  // Add UTM link ID to elements for tracking
  static addTrackingToLink(element: HTMLAnchorElement, utmLinkId: number) {
    element.dataset.utmLinkId = utmLinkId.toString();
  }

  // Generate trackable UTM link with embedded tracking
  static generateTrackableLink(
    baseUrl: string, 
    utmParams: { [key: string]: string }, 
    utmLinkId: number
  ): string {
    const url = new URL(baseUrl);
    
    // Add UTM parameters
    Object.entries(utmParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    
    // Add tracking parameter
    url.searchParams.set('utm_track_id', utmLinkId.toString());
    
    return url.toString();
  }
}

// Global instance
export const utmTracker = new UTMTracker();

// Auto-initialize on client side
if (typeof window !== 'undefined') {
  // Initialize tracking when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('UTM Tracker initialized');
    });
  }
}
