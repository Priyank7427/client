// client/src/contexts/ChatContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { Chat, Message, User } from '../types';
import { chatsAPI, messagesAPI } from '../services/api';
import socketService from '../services/socket';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

interface ChatContextType {
  chats: Chat[];
  currentChat: Chat | null;
  messages: Message[];
  isLoading: boolean;
  isLoadingMessages: boolean;
  typingUsers: { [chatId: string]: User[] };
  onlineUsers: Set<string>;
  setCurrentChat: (chat: Chat | null) => void;
  loadChats: () => Promise<void>;
  loadMessages: (chatId: string, page?: number) => Promise<void>;
  sendMessage: (content: string, type?: string, replyTo?: string, forwarded?: boolean, media?: File[]) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  addReaction: (messageId: string, emoji: string) => Promise<void>;
  removeReaction: (messageId: string, emoji: string) => Promise<void>;
  markAsRead: (messageId: string) => Promise<void>;
  startTyping: () => void;
  stopTyping: () => void;
  searchMessages: (query: string, chatId?: string) => Promise<Message[]>;
  refreshChats: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);
export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within a ChatProvider');
  return ctx;
};

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [typingUsers, setTypingUsers] = useState<{ [chatId: string]: User[] }>({});
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const lastRoomRef = useRef<string | null>(null);

  // 1) Normalizer: enforce content { text } and a flat chat id
  const normalizeMessage = (raw: any, fallbackChatId?: string): Message => {
    const m = (raw?.data ?? raw?.message ?? raw) || {};
    const chatId =
      (typeof m.chat === 'string' && m.chat) ||
      (m.chat && typeof m.chat === 'object' && m.chat._id) ||
      m.chatId ||
      fallbackChatId;

      let content = m.content;
      // Only wrap if legacy object, otherwise keep strings as strings!
      if (typeof content === 'object' && content !== null && typeof content.text === 'string') {
        content = content.text; // flatten back to string for {text:....}
      }
      // For modern/new messages, content will remain a string.
      // For very old/edge cases:
      if (typeof content !== 'string') {
        content = '';
      }
      console.log('ChatContext normalizeMessage content:', content, typeof content);

    const reactions = Array.isArray(m.reactions) ? m.reactions : [];
    const readBy = Array.isArray(m.readBy) ? m.readBy : [];
    return { ...m, chat: chatId, content, reactions, readBy } as Message;
  };

  // 2) Bootstrap + socket listeners
  useEffect(() => {
    if (isAuthenticated && user) {
      loadChats().catch(() => {});
      setupSocketListeners();
    }
    return teardownSocketListeners;
  }, [isAuthenticated, user]);

  // 3) Join/leave the active chat room
  useEffect(() => {
    const id = currentChat?._id;
    if (!id || !socketService.isConnected()) return;
    if (lastRoomRef.current && lastRoomRef.current !== id) socketService.leaveChat(lastRoomRef.current);
    socketService.joinChat(id);
    lastRoomRef.current = id;
  }, [currentChat?._id]);

  const setupSocketListeners = () => {
    socketService.onNewMessage(handleNewMessage);
    socketService.onMessageEdited(handleMessageEdited);
    socketService.onMessageDeleted(handleMessageDeleted);
    socketService.onReactionAdded(handleReactionAdded);
    socketService.onReactionRemoved(handleReactionRemoved);
    socketService.onUserTyping(handleUserTyping);
    socketService.onUserStatusChanged(handleUserStatusChanged);
    socketService.onChatUpdated(handleChatUpdated);
    socketService.onMessageRead(handleMessageRead);
    socketService.onError(handleError);
  };

  const teardownSocketListeners = () => {
    socketService.offNewMessage(handleNewMessage);
    socketService.offMessageEdited(handleMessageEdited);
    socketService.offMessageDeleted(handleMessageDeleted);
    socketService.offReactionAdded(handleReactionAdded);
    socketService.offReactionRemoved(handleReactionRemoved);
    socketService.offUserTyping(handleUserTyping);
    socketService.offUserStatusChanged(handleUserStatusChanged);
    socketService.offChatUpdated(handleChatUpdated);
    socketService.offMessageRead(handleMessageRead);
    socketService.offError(handleError);
  };

  // 4) Socket handlers (always normalized)
  const handleNewMessage = (incoming: any) => {
    const message = normalizeMessage(incoming);
    if (!message.chat) return;

    // Append only in the open chat; update previews for all
    setMessages(prev => (currentChat?._id === message.chat ? [...prev, message] : prev));

    setChats(prev =>
      prev.map(c =>
        c._id === message.chat
          ? {
              ...c,
              lastMessage: message,
              lastMessageAt: message.createdAt || new Date().toISOString(),
              unreadCount: c._id === currentChat?._id ? c.unreadCount : (c.unreadCount || 0) + 1,
            }
          : c
      )
    );

    if (currentChat && message.chat === currentChat._id) void markAsRead(message._id);
  };

  const handleMessageEdited = (incoming: any) => {
    const message = normalizeMessage(incoming, currentChat?._id || undefined);
    setMessages(prev => prev.map(m => (m._id === message._id ? message : m)));
  };

  const handleMessageDeleted = (data: { messageId: string; deletedBy: string }) => {
    setMessages(prev => prev.map(m => (m._id === data.messageId ? { ...m, deleted: true, deletedAt: new Date().toISOString(), deletedBy: data.deletedBy } as any : m)));
  };

  const handleReactionAdded = (data: { messageId: string; emoji: string; reactions: any[] }) => {
    setMessages(prev => prev.map(m => (m._id === data.messageId ? { ...m, reactions: data.reactions } : m)));
  };

  const handleReactionRemoved = (data: { messageId: string; emoji: string; reactions: any[] }) => {
    setMessages(prev => prev.map(m => (m._id === data.messageId ? { ...m, reactions: data.reactions } : m)));
  };

  const handleUserTyping = (data: { chatId: string; userId: string; user: User; isTyping: boolean }) => {
    setTypingUsers(prev => ({
      ...prev,
      [data.chatId]: data.isTyping ? [...(prev[data.chatId] || []).filter(u => u._id !== data.userId), data.user] : (prev[data.chatId] || []).filter(u => u._id !== data.userId),
    }));
  };

  const handleUserStatusChanged = (data: { userId: string; status: string; statusMessage?: string; lastSeen: string }) => {
    if (data.status === 'online') setOnlineUsers(prev => new Set([...Array.from(prev), data.userId]));
    else setOnlineUsers(prev => {
      const s = new Set(prev);
      s.delete(data.userId);
      return s;
    });
    setChats(prev =>
      prev.map(chat => ({
        ...chat,
        participants: chat.participants.map(p => (p._id === data.userId ? { ...p, status: data.status as any, statusMessage: data.statusMessage, lastSeen: data.lastSeen } : p)),
        otherParticipant:
          chat.otherParticipant && chat.otherParticipant._id === data.userId
            ? { ...chat.otherParticipant, status: data.status as any, statusMessage: data.statusMessage, lastSeen: data.lastSeen }
            : chat.otherParticipant,
      }))
    );
  };

  const handleChatUpdated = (data: { chatId: string; lastMessage: any; lastMessageAt: string }) => {
    const lastMessage = data.lastMessage ? normalizeMessage(data.lastMessage, data.chatId) : undefined;
    setChats(prev => prev.map(chat => (chat._id === data.chatId ? { ...chat, lastMessage: lastMessage ?? chat.lastMessage, lastMessageAt: data.lastMessageAt } : chat)));
  };

  const handleMessageRead = (data: { messageId: string; userId: string; readAt: string }) => {
    setMessages(prev => prev.map(m => (m._id === data.messageId ? { ...m, readBy: [...(m.readBy || []), { user: data.userId, readAt: data.readAt }] } : m)));
  };

  const handleError = (error: { message: string }) => {
    if (error?.message) toast.error(error.message);
  };

  // 5) Data loading (normalize previews and lists)
  const loadChats = async () => {
    try {
      setIsLoading(true);
      const res = await chatsAPI.getChats();
      const normalized = (res.chats || []).map((c: any) => (c?.lastMessage ? { ...c, lastMessage: normalizeMessage(c.lastMessage, c._id) } : c));
      setChats(normalized);
    } catch (e) {
      toast.error('Failed to load chats');
      console.error('Error loading chats:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (chatId: string, page = 1) => {
    try {
      setIsLoadingMessages(true);
      const res = await messagesAPI.getMessages(chatId, page);
      console.log('API message response:', res);

      const list = res.messages.map((m: any) => normalizeMessage(m, chatId));
      console.log('Normalized messages:', list);
      if (page === 1) setMessages(list);
      else setMessages(prev => [...list, ...prev]);
    } catch (e) {
      toast.error('Failed to load messages');
      console.error('Error loading messages', e);
    } finally {
      setIsLoadingMessages(false);
    }
  };
  

  // 6) Mutations (append normalized result immediately)
  const sendMessage = async (content: string, type = 'text', replyTo?: string, forwarded = false, media?: File[]) => {
    if (!currentChat) return;
    try {
      console.log('ChatContext sendMessage content:', content, typeof content);
      const res = await messagesAPI.sendMessage({ chatId: currentChat._id, content, type, replyTo, forwarded, media });
      const newMsg = normalizeMessage(res, currentChat._id);
      setMessages(prev => [...prev, newMsg]);
      setChats(prev =>
        prev.map(c => (c._id === (newMsg.chat || currentChat._id) ? { ...c, lastMessage: newMsg, lastMessageAt: newMsg.createdAt || new Date().toISOString() } : c))
      );
    } catch (e) {
      toast.error('Failed to send message');
      console.error('Error sending message:', e);
    }
  };
  

  const editMessage = async (messageId: string, content: string) => {
    try {
      const res = await messagesAPI.editMessage(messageId, content);
      const updated = normalizeMessage(res, currentChat?._id);
      setMessages(prev => prev.map(m => (m._id === updated._id ? updated : m)));
    } catch (e) {
      toast.error('Failed to edit message');
      console.error('Error editing message:', e);
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      await messagesAPI.deleteMessage(messageId);
      setMessages(prev => prev.map(m => (m._id === messageId ? { ...m, deleted: true } as any : m)));
    } catch (e) {
      toast.error('Failed to delete message');
      console.error('Error deleting message:', e);
    }
  };

  // 7) Reactions and read receipts
  const addReaction = async (messageId: string, emoji: string) => {
    try {
      await messagesAPI.addReaction(messageId, emoji);
    } catch (e) {
      toast.error('Failed to add reaction');
      console.error(e);
    }
  };

  const removeReaction = async (messageId: string, emoji: string) => {
    try {
      await messagesAPI.removeReaction(messageId, emoji);
    } catch (e) {
      toast.error('Failed to remove reaction');
      console.error(e);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      await messagesAPI.markAsRead(messageId);
    } catch (e) {
      console.error('Error marking message as read:', e);
    }
  };

  // 8) Typing indicators
  const startTyping = () => {
    if (!currentChat) return;
    socketService.startTyping(currentChat._id);
    if (typingTimeout) clearTimeout(typingTimeout);
    const timeout = setTimeout(() => stopTyping(), 3000);
    setTypingTimeout(timeout);
  };

  const stopTyping = () => {
    if (!currentChat) return;
    socketService.stopTyping(currentChat._id);
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      setTypingTimeout(null);
    }
  };

  // 9) Search/refresh
  const searchMessages = async (query: string, chatId?: string): Promise<Message[]> => {
    try {
      const res = await messagesAPI.searchMessages(query, chatId);
      return (res.messages || []).map((m: any) => normalizeMessage(m, chatId));
    } catch (e) {
      toast.error('Failed to search messages');
      console.error('Error searching messages:', e);
      return [];
    }
  };

  const refreshChats = async () => {
    await loadChats();
  };

  const value: ChatContextType = {
    chats,
    currentChat,
    messages,
    isLoading,
    isLoadingMessages,
    typingUsers,
    onlineUsers,
    setCurrentChat,
    loadChats,
    loadMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    markAsRead,
    startTyping,
    stopTyping,
    searchMessages,
    refreshChats,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
