// client/src/services/api.ts
import axios from 'axios';
import { User, Chat, Message, Contact, AuthResponse, Gif } from '../types';

// CRA-compatible env resolution (no import.meta usage)
const API_BASE_URL =
  (process.env.REACT_APP_API_URL as string) ||
  (window as any).__API_BASE_URL__ ||
  'http://localhost:5001/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // enable cookies if your backend uses them
  headers: { 'Content-Type': 'application/json' },
});

// Attach bearer token for protected routes when present
api.interceptors.request.use(
  (config) => {
    const token =
      (window as any).__authToken__ ||
      localStorage.getItem('auth_token') ||
      localStorage.getItem('token');
    if (token) {
      config.headers = config.headers || {};
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Normalize 401 handling
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ---------- Auth API ----------
export const authAPI = {
  register: async (userData: {
    username: string;
    email: string;
    password: string;
    displayName: string;
  }): Promise<AuthResponse> => {
    const { data } = await api.post('/auth/register', userData);
    return data;
  },

  login: async (credentials: { email: string; password: string }): Promise<AuthResponse> => {
    const { data } = await api.post('/auth/login', credentials);
    const token = (data as any)?.token;
    if (token) {
      localStorage.setItem('auth_token', token);
      (window as any).__authToken__ = token;
    }
    return data;
  },

  verifyEmail: async (token: string): Promise<{ message: string }> => {
    const { data } = await api.post('/auth/verify-email', { token });
    return data;
  },

  resendVerification: async (): Promise<{ message: string }> => {
    const { data } = await api.post('/auth/resend-verification');
    return data;
  },

  setup2FA: async (): Promise<{ secret: string; qrCode: string; backupCodes: string[] }> => {
    const { data } = await api.post('/auth/setup-2fa');
    return data;
  },

  verify2FA: async (token: string): Promise<{ message: string }> => {
    const { data } = await api.post('/auth/verify-2fa', { token });
    return data;
  },

  disable2FA: async (payload: { password: string; token: string }): Promise<{ message: string }> => {
    const { data } = await api.post('/auth/disable-2fa', payload);
    return data;
  },

  updateProfile: async (payload: {
    displayName?: string;
    statusMessage?: string;
    profilePicture?: File;
  }): Promise<{ message: string; user: User }> => {
    const formData = new FormData();
    if (payload.displayName) formData.append('displayName', payload.displayName);
    if (payload.statusMessage !== undefined) formData.append('statusMessage', String(payload.statusMessage));
    if (payload.profilePicture) formData.append('profilePicture', payload.profilePicture);
    const { data } = await api.put('/auth/profile', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  changePassword: async (payload: { currentPassword: string; newPassword: string }): Promise<{ message: string }> => {
    const { data } = await api.put('/auth/change-password', payload);
    return data;
  },

  logout: async (): Promise<{ message: string }> => {
    const { data } = await api.post('/auth/logout');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    (window as any).__authToken__ = undefined;
    return data;
  },

  getMe: async (): Promise<{ user: User }> => {
    const { data } = await api.get('/auth/me');
    return data;
  },
};

// ---------- Users API ----------
export const usersAPI = {
  search: async (query: string, limit = 20): Promise<{ users: User[] }> => {
    const { data } = await api.get(`/users/search?query=${encodeURIComponent(query)}&limit=${limit}`);
    return data;
  },
  getProfile: async (userId: string): Promise<{ user: User }> => {
    const { data } = await api.get(`/users/${userId}`);
    return data;
  },
  addContact: async (userId: string, nickname?: string): Promise<{ message: string; contact: Contact }> => {
    const { data } = await api.post(`/users/contacts/${userId}`, { nickname });
    return data;
  },
  removeContact: async (userId: string): Promise<{ message: string }> => {
    const { data } = await api.delete(`/users/contacts/${userId}`);
    return data;
  },
  updateContactNickname: async (userId: string, nickname: string): Promise<{ message: string }> => {
    const { data } = await api.put(`/users/contacts/${userId}`, { nickname });
    return data;
  },
  getContacts: async (): Promise<{ contacts: Contact[] }> => {
    const { data } = await api.get('/users/contacts/list');
    return data;
  },
  blockUser: async (userId: string): Promise<{ message: string }> => {
    const { data } = await api.post(`/users/block/${userId}`);
    return data;
  },
  unblockUser: async (userId: string): Promise<{ message: string }> => {
    const { data } = await api.delete(`/users/block/${userId}`);
    return data;
  },
  getBlockedUsers: async (): Promise<{ blockedUsers: User[] }> => {
    const { data } = await api.get('/users/blocked/list');
    return data;
  },
  updatePrivacySettings: async (settings: {
    showOnlineStatus?: boolean;
    showLastSeen?: boolean;
    allowDirectMessages?: boolean;
  }): Promise<{ message: string; privacySettings: any }> => {
    const { data } = await api.put('/users/privacy-settings', settings);
    return data;
  },
  updateNotificationSettings: async (settings: {
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    soundEnabled?: boolean;
  }): Promise<{ message: string; notificationSettings: any }> => {
    const { data } = await api.put('/users/notification-settings', settings);
    return data;
  },
};

// ---------- Chats API ----------
export const chatsAPI = {
  getChats: async (page = 1, limit = 20): Promise<{ chats: Chat[] }> => {
    const { data } = await api.get(`/chats?page=${page}&limit=${limit}`);
    return data;
  },
  getChat: async (chatId: string): Promise<{ chat: Chat }> => {
    const { data } = await api.get(`/chats/${chatId}`);
    return data;
  },
  createDirectChat: async (userId: string): Promise<{ message: string; chat: Chat }> => {
    const { data } = await api.post('/chats/direct', { userId });
    return data;
  },
  archiveChat: async (chatId: string): Promise<{ message: string }> => {
    const { data } = await api.put(`/chats/${chatId}/archive`);
    return data;
  },
  unarchiveChat: async (chatId: string): Promise<{ message: string }> => {
    const { data } = await api.put(`/chats/${chatId}/unarchive`);
    return data;
  },
  muteChat: async (chatId: string): Promise<{ message: string }> => {
    const { data } = await api.put(`/chats/${chatId}/mute`);
    return data;
  },
  unmuteChat: async (chatId: string): Promise<{ message: string }> => {
    const { data } = await api.put(`/chats/${chatId}/unmute`);
    return data;
  },
  deleteChat: async (chatId: string): Promise<{ message: string }> => {
    const { data } = await api.delete(`/chats/${chatId}`);
    return data;
  },
};

// ---------- Messages API ----------
export const messagesAPI = {
  getMessages: async (chatId: string, page = 1, limit = 50, before?: string): Promise<{ messages: Message[] }> => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (before) params.append('before', before);
    const { data } = await api.get(`/messages/chat/${chatId}?${params}`);
    return data;
  },

  sendMessage: async (payload: {
    chatId: string;
    content: string;
    type?: string;
    replyTo?: string;
    forwarded?: boolean;
    media?: File[];
  }): Promise<{ data: Message }> => {
    const form = new FormData();
    form.append('chatId', payload.chatId);
    form.append('content', payload.content);
    if (payload.type) form.append('type', payload.type);
    if (payload.replyTo) form.append('replyTo', payload.replyTo);
    if (payload.forwarded !== undefined) form.append('forwarded', String(payload.forwarded));
    payload.media?.forEach((f) => form.append('media', f));

    const { data } = await api.post('/messages/send', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    const msg: Message = (data?.data ?? data?.message ?? data) as Message;
    return { data: msg };
  },

  editMessage: async (messageId: string, content: string): Promise<{ data: Message }> => {
    const { data } = await api.put(`/messages/${messageId}`, { content });
    return { data: (data?.data ?? data?.message ?? data) as Message };
  },

  deleteMessage: async (messageId: string): Promise<{ message: string }> => {
    const { data } = await api.delete(`/messages/${messageId}`);
    return data;
  },

  addReaction: async (messageId: string, emoji: string): Promise<{ message: string }> => {
    const { data } = await api.post(`/messages/${messageId}/reactions`, { emoji });
    return data;
  },

  removeReaction: async (messageId: string, emoji: string): Promise<{ message: string }> => {
    const { data } = await api.delete(`/messages/${messageId}/reactions/${emoji}`);
    return data;
  },

  markAsRead: async (messageId: string): Promise<{ message: string }> => {
    const { data } = await api.put(`/messages/${messageId}/read`);
    return data;
  },

  searchMessages: async (query: string, chatId?: string, limit = 20): Promise<{ messages: Message[] }> => {
    const params = new URLSearchParams({ query, limit: String(limit) });
    if (chatId) params.append('chatId', chatId);
    const { data } = await api.get(`/messages/search?${params}`);
    return data;
  },

  searchGifs: async (query: string, limit = 20, offset = 0): Promise<{ gifs: Gif[] }> => {
    const { data } = await api.get(`/messages/giphy/search?query=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`);
    return data;
  },

  getTrendingGifs: async (limit = 20, offset = 0): Promise<{ gifs: Gif[] }> => {
    const { data } = await api.get(`/messages/giphy/trending?limit=${limit}&offset=${offset}`);
    return data;
  },
};

// ---------- Groups API ----------
export const groupsAPI = {
  createGroup: async (payload: { name: string; description?: string; members?: string[]; avatar?: File }): Promise<{ message: string; group: Chat }> => {
    const form = new FormData();
    form.append('name', payload.name);
    if (payload.description) form.append('description', payload.description);
    payload.members?.forEach((m) => form.append('members', m));
    if (payload.avatar) form.append('avatar', payload.avatar);
    const { data } = await api.post('/groups/create', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return data;
  },

  getGroupDetails: async (groupId: string): Promise<{ group: Chat }> => {
    const { data } = await api.get(`/groups/${groupId}`);
    return data;
  },

  updateGroupInfo: async (groupId: string, payload: { name?: string; description?: string; avatar?: File }): Promise<{ message: string; groupInfo: any }> => {
    const form = new FormData();
    if (payload.name) form.append('name', payload.name);
    if (payload.description !== undefined) form.append('description', payload.description);
    if (payload.avatar) form.append('avatar', payload.avatar);
    const { data } = await api.put(`/groups/${groupId}`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return data;
  },

  addMembers: async (groupId: string, members: string[]): Promise<{ message: string; newMembers: User[] }> => {
    const { data } = await api.post(`/groups/${groupId}/members`, { members });
    return data;
  },

  removeMember: async (groupId: string, userId: string): Promise<{ message: string }> => {
    const { data } = await api.delete(`/groups/${groupId}/members/${userId}`);
    return data;
  },

  promoteMember: async (groupId: string, userId: string): Promise<{ message: string }> => {
    const { data } = await api.put(`/groups/${groupId}/members/${userId}/promote`);
    return data;
  },

  demoteMember: async (groupId: string, userId: string): Promise<{ message: string }> => {
    const { data } = await api.put(`/groups/${groupId}/members/${userId}/demote`);
    return data;
  },

  leaveGroup: async (groupId: string): Promise<{ message: string }> => {
    const { data } = await api.post(`/groups/${groupId}/leave`);
    return data;
  },

  updateGroupSettings: async (groupId: string, settings: { allowMemberInvite?: boolean; allowMemberLeave?: boolean; allowMemberKick?: boolean }): Promise<{ message: string; settings: any }> => {
    const { data } = await api.put(`/groups/${groupId}/settings`, settings);
    return data;
  },

  pinMessage: async (groupId: string, messageId: string): Promise<{ message: string }> => {
    const { data } = await api.post(`/groups/${groupId}/pin/${messageId}`);
    return data;
  },

  unpinMessage: async (groupId: string, messageId: string): Promise<{ message: string }> => {
    const { data } = await api.delete(`/groups/${groupId}/pin/${messageId}`);
    return data;
  },

  getPinnedMessages: async (groupId: string): Promise<{ pinnedMessages: any[] }> => {
    const { data } = await api.get(`/groups/${groupId}/pinned`);
    return data;
  },
};

export default api;
