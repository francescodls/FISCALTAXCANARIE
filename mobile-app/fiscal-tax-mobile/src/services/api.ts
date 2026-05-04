import { API_URL } from '../config/constants';

// Constants
const REQUEST_TIMEOUT = 15000; // 15 seconds
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;

interface ApiError extends Error {
  status?: number;
  isNetworkError?: boolean;
  isTimeout?: boolean;
}

class ApiService {
  private token: string | null = null;
  private requestCache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTimeout = 30000; // 30 seconds

  setToken(token: string | null) {
    this.token = token;
    if (!token) {
      this.requestCache.clear(); // Clear cache on logout
    }
  }

  // Utility: Create fetch with timeout
  private async fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Utility: Delay for retry
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Improved request with retry, timeout, and caching
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    useCache: boolean = false,
    cacheKey?: string
  ): Promise<T> {
    const fullCacheKey = cacheKey || endpoint;
    
    // Check cache for GET requests
    if (useCache && (!options.method || options.method === 'GET')) {
      const cached = this.requestCache.get(fullCacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    const headers: HeadersInit = {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      ...options.headers,
    };

    let lastError: ApiError | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await this.fetchWithTimeout(
          `${API_URL}${endpoint}`,
          { ...options, headers },
          REQUEST_TIMEOUT
        );

        if (!response.ok) {
          const error = await response.json().catch(() => ({ detail: 'Errore sconosciuto' }));
          const apiError: ApiError = new Error(error.detail || `Errore HTTP: ${response.status}`);
          apiError.status = response.status;
          
          // Don't retry on client errors (4xx) except 408 (timeout) and 429 (rate limit)
          if (response.status >= 400 && response.status < 500 && 
              response.status !== 408 && response.status !== 429) {
            throw apiError;
          }
          
          lastError = apiError;
          if (attempt < MAX_RETRIES) {
            await this.delay(RETRY_DELAY * (attempt + 1));
            continue;
          }
          throw apiError;
        }

        const data = await response.json();
        
        // Cache successful GET responses
        if (useCache && (!options.method || options.method === 'GET')) {
          this.requestCache.set(fullCacheKey, { data, timestamp: Date.now() });
        }
        
        return data;
      } catch (error: any) {
        if (error.name === 'AbortError') {
          const timeoutError: ApiError = new Error('La richiesta ha impiegato troppo tempo. Riprova.');
          timeoutError.isTimeout = true;
          lastError = timeoutError;
        } else if (error.message?.includes('Network') || error.message?.includes('fetch')) {
          const networkError: ApiError = new Error('Errore di connessione. Verifica la tua connessione internet.');
          networkError.isNetworkError = true;
          lastError = networkError;
        } else {
          lastError = error;
        }

        if (attempt < MAX_RETRIES && lastError && (lastError.isTimeout || lastError.isNetworkError)) {
          await this.delay(RETRY_DELAY * (attempt + 1));
          continue;
        }
        
        throw lastError;
      }
    }

    throw lastError || new Error('Errore sconosciuto');
  }

  // Clear specific cache entry
  clearCache(endpoint?: string) {
    if (endpoint) {
      this.requestCache.delete(endpoint);
    } else {
      this.requestCache.clear();
    }
  }

  // Dashboard
  async getDashboardStats() {
    return this.request('/api/client/dashboard', {}, true); // cached
  }

  // Documenti
  async getDocuments() {
    return this.request<any[]>('/api/documents', {}, true); // cached
  }

  async getDocumentFolders() {
    return this.request<any[]>('/api/folder-categories', {}, true); // cached
  }

  async downloadDocument(documentId: string) {
    const response = await this.fetchWithTimeout(
      `${API_URL}/api/documents/${documentId}/download`,
      { headers: { Authorization: `Bearer ${this.token}` } },
      30000 // 30 seconds for downloads
    );
    return response.blob();
  }

  // Dichiarazioni
  async getDeclarations() {
    return this.request<any[]>('/api/declarations/tax-returns', {}, true); // cached
  }

  async getDeclarationDetails(id: string) {
    return this.request(`/api/declarations/tax-returns/${id}`);
  }

  async sendDeclarationMessage(declarationId: string, text: string) {
    return this.request(`/api/declarations/tax-returns/${declarationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  // Notifiche
  async getNotifications() {
    return this.request<any[]>('/api/notifications', {}, true); // cached
  }

  async markNotificationRead(id: string) {
    this.clearCache('/api/notifications'); // Invalidate cache
    return this.request(`/api/notifications/${id}/read`, { method: 'PUT' });
  }

  async markAllNotificationsRead() {
    this.clearCache('/api/notifications'); // Invalidate cache
    return this.request('/api/notifications/read-all', { method: 'PUT' });
  }

  // Scadenze
  async getDeadlines() {
    return this.request<any[]>('/api/deadlines', {}, true); // cached
  }

  // Onorari/Fatture
  async getFees() {
    return this.request<any[]>('/api/client/fees', {}, true); // cached
  }

  // Privacy
  async getPrivacyConsent() {
    return this.request('/api/privacy/consent');
  }

  async acceptPrivacyConsent() {
    return this.request('/api/privacy/consent', {
      method: 'POST',
      body: JSON.stringify({
        consent_type: 'privacy_policy',
        accepted: true,
        policy_url: 'https://fiscaltaxcanarie.com/privacy-policy/',
      }),
    });
  }

  // Profilo
  async updateProfile(data: any) {
    return this.request('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Push notifications
  async registerPushToken(pushToken: string, platform: string) {
    return this.request('/api/push-tokens', {
      method: 'POST',
      body: JSON.stringify({ push_token: pushToken, platform }),
    });
  }

  // Ricerca documenti
  async searchDocuments(query: string) {
    return this.request<any[]>(`/api/documents/search?q=${encodeURIComponent(query)}`);
  }

  // Chat AI Assistant
  async sendChatMessage(message: string, conversationId?: string) {
    return this.request<{ response: string; conversation_id: string; success: boolean }>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ 
        message, 
        conversation_id: conversationId 
      }),
    });
  }

  // Elimina conversazione
  async deleteConversation(conversationId: string) {
    return this.request(`/api/chat/${conversationId}`, { method: 'DELETE' });
  }

  // Change password
  async changePassword(currentPassword: string, newPassword: string) {
    return this.request('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ 
        current_password: currentPassword, 
        new_password: newPassword 
      }),
    });
  }

  // Update email preferences
  async updateEmailPreferences(preferences: Record<string, boolean>) {
    return this.request('/api/profile/email-preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences),
    });
  }

  // Disconnect all sessions
  async disconnectAllSessions() {
    return this.request('/api/auth/logout-all', { method: 'POST' });
  }

  // Get tax models
  async getTaxModels() {
    return this.request('/api/modelli-tributari', {}, true); // cached
  }

  // Get communication threads (admin notifications with replies)
  async getCommunicationThreads() {
    return this.request('/api/communications/threads', {}, true); // cached
  }

  // Get single communication thread
  async getCommunicationThread(threadId: string) {
    return this.request(`/api/communications/threads/${threadId}`);
  }

  // Reply to communication thread
  async replyToThread(threadId: string, content: string) {
    this.clearCache('/api/communications/threads'); // Invalidate cache
    return this.request(`/api/communications/threads/${threadId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  // Force refresh all cached data
  async refreshAll() {
    this.clearCache();
    await Promise.all([
      this.getDocuments().catch(() => []),
      this.getDeadlines().catch(() => []),
      this.getNotifications().catch(() => []),
    ]);
  }

  // ============================================================================
  // DICHIARAZIONI V2 - Nuovo sistema
  // ============================================================================

  // Lista dichiarazioni cliente
  async getDeclarationsV2() {
    return this.request<any[]>('/api/declarations/v2/declarations', {}, true);
  }

  // Dettaglio dichiarazione
  async getDeclarationV2(id: string) {
    return this.request<any>(`/api/declarations/v2/declarations/${id}`);
  }

  // Crea nuova dichiarazione
  async createDeclarationV2(annoFiscale: number) {
    this.clearCache('/api/declarations/v2/declarations');
    return this.request<any>('/api/declarations/v2/declarations', {
      method: 'POST',
      body: JSON.stringify({ anno_fiscale: annoFiscale }),
    });
  }

  // Aggiorna sezione (autosave)
  async updateDeclarationSection(id: string, sectionName: string, sectionData: any) {
    return this.request<any>(`/api/declarations/v2/declarations/${id}/section`, {
      method: 'PUT',
      body: JSON.stringify({
        section_name: sectionName,
        section_data: sectionData,
      }),
    });
  }

  // Firma dichiarazione
  async signDeclaration(id: string, signatureImage: string, acceptedTerms: boolean) {
    const formData = new FormData();
    formData.append('accepted_terms', acceptedTerms.toString());
    formData.append('signature_image', signatureImage);
    
    return this.request<any>(`/api/declarations/v2/declarations/${id}/sign`, {
      method: 'POST',
      body: formData,
    });
  }

  // Invia dichiarazione
  async submitDeclaration(id: string) {
    this.clearCache('/api/declarations/v2/declarations');
    return this.request<any>(`/api/declarations/v2/declarations/${id}/submit`, {
      method: 'POST',
    });
  }

  // Lista messaggi dichiarazione
  async getDeclarationMessages(id: string) {
    return this.request<any[]>(`/api/declarations/v2/declarations/${id}/messages`);
  }

  // Invia messaggio
  async sendDeclarationMessageV2(id: string, content: string, isIntegrationRequest: boolean = false) {
    return this.request<any>(`/api/declarations/v2/declarations/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        content,
        is_integration_request: isIntegrationRequest,
      }),
    });
  }

  // Lista documenti dichiarazione
  async getDeclarationDocuments(id: string) {
    return this.request<any[]>(`/api/declarations/v2/declarations/${id}/documents`);
  }

  // Upload documento
  async uploadDeclarationDocument(id: string, file: any, category: string = 'generale') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    
    return this.request<any>(`/api/declarations/v2/declarations/${id}/documents`, {
      method: 'POST',
      body: formData,
    });
  }

  // Elimina documento
  async deleteDeclarationDocument(declarationId: string, documentId: string) {
    return this.request<any>(`/api/declarations/v2/declarations/${declarationId}/documents/${documentId}`, {
      method: 'DELETE',
    });
  }

  // ===========================================================================
  // IMPORTI DA PAGARE (TAX PAYMENTS)
  // ===========================================================================

  // Lista importi da pagare per il cliente
  async getClientPayments(status: 'upcoming' | 'expired' | 'all' = 'upcoming') {
    return this.request<{
      payments: Array<{
        id: string;
        client_id: string;
        client_name: string;
        tax_model_id: string;
        tax_model_name: string;
        amount_due: number;
        due_date: string;
        period: string;
        internal_notes?: string;
        notification_status: string;
        days_left: number;
        urgency: 'expired' | 'urgent' | 'warning' | 'normal';
        is_expired: boolean;
      }>;
      stats: {
        upcoming_count: number;
        expired_count: number;
        total_upcoming_amount: number;
      };
    }>(`/api/tax-payments/client/payments?status=${status}`);
  }

  // Importi per calendario
  async getClientPaymentsCalendar(month?: number, year?: number) {
    const params = new URLSearchParams();
    if (month) params.append('month', month.toString());
    if (year) params.append('year', year.toString());
    
    return this.request<{
      month: number;
      year: number;
      calendar_data: Array<{
        date: string;
        payments: any[];
        total_amount: number;
        count: number;
      }>;
      marked_dates: Record<string, {
        marked: boolean;
        dotColor: string;
        count: number;
        total: number;
        is_past: boolean;
      }>;
      total_payments: number;
      total_amount: number;
    }>(`/api/tax-payments/client/payments/calendar${params.toString() ? '?' + params.toString() : ''}`);
  }

  // Dettaglio singolo pagamento
  async getClientPaymentDetail(paymentId: string) {
    return this.request<any>(`/api/tax-payments/client/payments/${paymentId}`);
  }
}

export const apiService = new ApiService();
