import { API_URL } from '../config/constants';

class ApiService {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      ...options.headers,
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Errore sconosciuto' }));
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Dashboard
  async getDashboardStats() {
    return this.request('/api/client/dashboard');
  }

  // Documenti
  async getDocuments() {
    return this.request<any[]>('/api/documents');
  }

  async getDocumentFolders() {
    return this.request<any[]>('/api/folder-categories');
  }

  async downloadDocument(documentId: string) {
    const response = await fetch(`${API_URL}/api/documents/${documentId}/download`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    return response.blob();
  }

  // Dichiarazioni
  async getDeclarations() {
    return this.request<any[]>('/api/declarations/tax-returns');
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
    return this.request<any[]>('/api/notifications');
  }

  async markNotificationRead(id: string) {
    return this.request(`/api/notifications/${id}/read`, { method: 'PUT' });
  }

  async markAllNotificationsRead() {
    return this.request('/api/notifications/read-all', { method: 'PUT' });
  }

  // Ticket
  async getTickets() {
    return this.request<any[]>('/api/tickets');
  }

  async getTicketDetails(ticketId: string) {
    return this.request<any>(`/api/tickets/${ticketId}`);
  }

  async createTicket(data: { subject: string; message: string; category?: string; priority?: string }) {
    return this.request('/api/tickets', {
      method: 'POST',
      body: JSON.stringify({ 
        subject: data.subject, 
        content: data.message,  // Backend usa 'content' invece di 'message'
      }),
    });
  }

  async getTicketMessages(ticketId: string) {
    return this.request<any[]>(`/api/tickets/${ticketId}/messages`);
  }

  async sendTicketMessage(ticketId: string, message: string) {
    return this.request(`/api/tickets/${ticketId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content: message }),
    });
  }

  // Scadenze
  async getDeadlines() {
    return this.request<any[]>('/api/deadlines');
  }

  // Onorari/Fatture
  async getFees() {
    return this.request<any[]>('/api/client/fees');
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
    return this.request('/api/modelli-tributari');
  }
}

export const apiService = new ApiService();
