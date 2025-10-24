// client/src/services/socket.ts
import { io, Socket } from 'socket.io-client';
import { Message, User } from '../types';

type NewMessageHandler = (m: Message | any) => void;
type EditedHandler = (m: Message | any) => void;
type DeletedHandler = (p: { messageId: string; deletedBy: string }) => void;
type ReactionHandler = (p: { messageId: string; emoji: string; reactions: any[] }) => void;
type TypingHandler = (p: { chatId: string; userId: string; user: User; isTyping: boolean }) => void;
type StatusHandler = (p: { userId: string; status: string; statusMessage?: string; lastSeen: string }) => void;
type ChatUpdatedHandler = (p: { chatId: string; lastMessage: any; lastMessageAt: string }) => void;
type ReadHandler = (p: { messageId: string; userId: string; readAt: string }) => void;
type ErrorHandler = (p: { message: string }) => void;

const SOCKET_URL =
  (process.env.REACT_APP_SOCKET_URL as string) ||
  (process.env.REACT_APP_API_URL as string)?.replace(/\/api\/?$/, '') ||
  'http://localhost:5001';

class SocketService {
  private socket: Socket | null = null;

  // Connect once; store token in auth payload
  connect(token?: string) {
    if (this.socket?.connected) return this.socket;
    this.socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      auth: token ? { token } : undefined,
      timeout: 20000,
    });
    return this.socket;
  }

  disconnect() {
    try {
      this.socket?.disconnect();
    } catch {}
    this.socket = null;
  }

  isConnected() {
    return !!this.socket?.connected;
  }

  // Rooms: server should use rooms named `chat_<chatId>`
  joinChat(chatId: string) {
    this.socket?.emit('join_chat', `chat_${chatId}`);
  }
  leaveChat(chatId: string) {
    this.socket?.emit('leave_chat', `chat_${chatId}`);
  }

  // Typing indicators
  startTyping(chatId: string) {
    this.socket?.emit('typing_start', { chatId });
  }
  stopTyping(chatId: string) {
    this.socket?.emit('typing_stop', { chatId });
  }

  // Event subscriptions
  onNewMessage(cb: NewMessageHandler) {
    this.socket?.on('new_message', cb);
  }
  offNewMessage(cb: NewMessageHandler) {
    this.socket?.off('new_message', cb);
  }

  onMessageEdited(cb: EditedHandler) {
    this.socket?.on('message_edited', cb);
  }
  offMessageEdited(cb: EditedHandler) {
    this.socket?.off('message_edited', cb);
  }

  onMessageDeleted(cb: DeletedHandler) {
    this.socket?.on('message_deleted', cb);
  }
  offMessageDeleted(cb: DeletedHandler) {
    this.socket?.off('message_deleted', cb);
  }

  onReactionAdded(cb: ReactionHandler) {
    this.socket?.on('reaction_added', cb);
  }
  offReactionAdded(cb: ReactionHandler) {
    this.socket?.off('reaction_added', cb);
  }

  onReactionRemoved(cb: ReactionHandler) {
    this.socket?.on('reaction_removed', cb);
  }
  offReactionRemoved(cb: ReactionHandler) {
    this.socket?.off('reaction_removed', cb);
  }

  onUserTyping(cb: TypingHandler) {
    // Server should emit { chatId, userId, user, isTyping }
    this.socket?.on('user_typing', cb);
  }
  offUserTyping(cb: TypingHandler) {
    this.socket?.off('user_typing', cb);
  }

  onUserStatusChanged(cb: StatusHandler) {
    this.socket?.on('user_status_changed', cb);
  }
  offUserStatusChanged(cb: StatusHandler) {
    this.socket?.off('user_status_changed', cb);
  }

  onChatUpdated(cb: ChatUpdatedHandler) {
    this.socket?.on('chat_updated', cb);
  }
  offChatUpdated(cb: ChatUpdatedHandler) {
    this.socket?.off('chat_updated', cb);
  }

  onMessageRead(cb: ReadHandler) {
    this.socket?.on('message_read', cb);
  }
  offMessageRead(cb: ReadHandler) {
    this.socket?.off('message_read', cb);
  }

  onError(cb: ErrorHandler) {
    this.socket?.on('error_event', cb);
    this.socket?.on('connect_error', (err: any) => cb({ message: err?.message || 'Socket connect error' }));
  }
  offError(cb: ErrorHandler) {
    this.socket?.off('error_event', cb);
    this.socket?.off('connect_error', cb as any);
  }
}

const socketService = new SocketService();
export default socketService;
