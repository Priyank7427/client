export interface User {
  _id: string;
  username: string;
  email: string;
  displayName: string;
  profilePicture?: string;
  status: 'online' | 'offline' | 'away' | 'busy';
  statusMessage?: string;
  lastSeen: string;
  isEmailVerified: boolean;
  twoFactorEnabled: boolean;
  privacySettings: {
    showOnlineStatus: boolean;
    showLastSeen: boolean;
    allowDirectMessages: boolean;
  };
  notificationSettings: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    soundEnabled: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Chat {
  _id: string;
  type: 'direct' | 'group';
  participants: User[];
  otherParticipant?: User;
  lastMessage?: Message;
  lastMessageAt: string;
  unreadCount: number;
  isArchived: boolean;
  isMuted: boolean;
  groupInfo?: GroupInfo;
  createdAt: string;
  updatedAt: string;
}

export interface GroupInfo {
  name: string;
  description?: string;
  avatar?: string;
  createdBy: User;
  admins: User[];
  members: GroupMember[];
  settings: {
    allowMemberInvite: boolean;
    allowMemberLeave: boolean;
    allowMemberKick: boolean;
  };
}

export interface GroupMember {
  user: User;
  role: 'admin' | 'member';
  joinedAt: string;
}

export interface Message {
  _id: string;
  chat: string;
  sender: User;
  content: {
    text?: string;
    type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'gif' | 'emoji' | 'system';
  };
  media?: {
    url: string;
    filename: string;
    mimetype: string;
    size: number;
    thumbnail?: string;
  };
  reactions: MessageReaction[];
  replyTo?: Message;
  forwarded: boolean;
  originalSender?: User;
  status: 'sent' | 'delivered' | 'read';
  edited: boolean;
  editHistory: EditHistory[];
  deleted: boolean;
  deletedAt?: string;
  deletedBy?: string;
  readBy: ReadReceipt[];
  metadata?: {
    giphyId?: string;
    giphyUrl?: string;
    linkPreview?: {
      title: string;
      description: string;
      image: string;
      url: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}

export interface MessageReaction {
  emoji: string;
  users: string[];
  count: number;
}

export interface EditHistory {
  content: string;
  editedAt: string;
}

export interface ReadReceipt {
  user: string;
  readAt: string;
}

export interface Contact {
  user: User;
  nickname: string;
  addedAt: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface ApiResponse<T> {
  message: string;
  data?: T;
}

export interface SocketEvents {
  // Connection events
  join_chats: () => void;
  join_chat: (chatId: string) => void;
  leave_chat: (chatId: string) => void;
  
  // Message events
  send_message: (data: {
    chatId: string;
    content: string;
    type?: string;
    replyTo?: string;
    forwarded?: boolean;
  }) => void;
  
  // Reaction events
  add_reaction: (data: { messageId: string; emoji: string }) => void;
  remove_reaction: (data: { messageId: string; emoji: string }) => void;
  
  // Typing events
  typing_start: (data: { chatId: string }) => void;
  typing_stop: (data: { chatId: string }) => void;
  
  // Status events
  update_status: (data: { status?: string; statusMessage?: string }) => void;
  update_presence: (data: { status: string }) => void;
  
  // Read receipt events
  mark_message_read: (data: { messageId: string }) => void;
}

export interface SocketListeners {
  // Connection events
  connect: () => void;
  disconnect: () => void;
  
  // Message events
  new_message: (message: Message) => void;
  message_edited: (message: Message) => void;
  message_deleted: (data: { messageId: string; deletedBy: string }) => void;
  
  // Reaction events
  reaction_added: (data: { messageId: string; emoji: string; reactions: MessageReaction[] }) => void;
  reaction_removed: (data: { messageId: string; emoji: string; reactions: MessageReaction[] }) => void;
  
  // Typing events
  user_typing: (data: { chatId: string; userId: string; user: User; isTyping: boolean }) => void;
  
  // Status events
  user_status_changed: (data: { userId: string; status: string; statusMessage?: string; lastSeen: string }) => void;
  
  // Chat events
  chat_updated: (data: { chatId: string; lastMessage: string; lastMessageAt: string }) => void;
  
  // Read receipt events
  message_read: (data: { messageId: string; userId: string; readAt: string }) => void;
  
  // Error events
  error: (error: { message: string }) => void;
}

export interface Gif {
  id: string;
  title: string;
  url: string;
  preview: string;
  width: number;
  height: number;
}

export interface Theme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    foreground: string;
    accent: string;
  };
}

export interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  soundEnabled: boolean;
}

export interface PrivacySettings {
  showOnlineStatus: boolean;
  showLastSeen: boolean;
  allowDirectMessages: boolean;
}
