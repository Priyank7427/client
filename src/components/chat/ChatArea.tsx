import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useChat } from '../../contexts/ChatContext';
import {
  Send, Smile, Paperclip,
} from 'lucide-react';
import { Message } from '../../types';
import MessageBubble from './MessageBubble';
import EmojiPicker from './EmojiPicker';
import FileUpload from './FileUpload';
import toast from 'react-hot-toast';

const ChatArea: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const {
    currentChat,
    messages,
    sendMessage,
    startTyping,
    stopTyping,
    typingUsers,
    onlineUsers,
    isLoadingMessages,
    loadMessages,
  } = useChat();

  const [messageText, setMessageText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  const lastLoadedChatRef = useRef<string | null>(null);

  // DEBUG: show raw messages for diagnostics
  useEffect(() => {
    console.log('ChatArea messages:', messages);
  }, [messages]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    if (currentChat) {
      setReplyingTo(null);
      setEditingMessage(null);
      setMessageText('');
    }
  }, [currentChat]);

  useEffect(() => {
    if (!currentChat) return;
    if (lastLoadedChatRef.current === currentChat._id) return;
    (async () => {
      try {
        await loadMessages?.(currentChat._id);
        lastLoadedChatRef.current = currentChat._id;
      } catch (err) {
        console.error('loadMessages failed:', err);
        toast.dismiss();
        toast.error('Failed to load messages');
      }
    })();
  }, [currentChat, loadMessages]);

  if (!user || typeof user !== 'object' || !currentChat || typeof currentChat !== 'object') {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="mx-auto h-24 w-24 text-gray-400 mb-4">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Welcome to ChatApp</h3>
          <p className="text-gray-500 dark:text-gray-400">Please select a chat and make sure you are logged in.</p>
        </div>
      </div>
    );
  }

  // Sending text message – always send content as plain string
  const sendTextMessage = async () => {
    const content = messageText.trim();
    if (!content) return;
    try {
      await sendMessage(
        content, // plain string!
        'text',
        replyingTo?._id ?? undefined,
        false,
        undefined
      );
      setMessageText('');
      setReplyingTo(null);
      setEditingMessage(null);
      stopTyping();
      if (typingTimeoutRef.current !== null) {
        window.clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    } catch (err) {
      console.error('Send message failed:', err);
      toast.dismiss();
      toast.error('Failed to send message');
    }
  };

  const handleSendMessage = async () => {
    if (!currentChat) return;
    await sendTextMessage();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value);
    if (e.target.value.trim()) {
      startTyping();
      if (typingTimeoutRef.current !== null) window.clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = window.setTimeout(() => { stopTyping(); typingTimeoutRef.current = null; }, 3000);
    } else {
      stopTyping();
      if (typingTimeoutRef.current !== null) { window.clearTimeout(typingTimeoutRef.current); typingTimeoutRef.current = null; }
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessageText(prev => prev + emoji);
    setShowEmojiPicker(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleFileUpload = (files: File[]) => {
    if (!currentChat || files.length === 0) return;
    console.log('Files to upload:', files);
    setShowFileUpload(false);
  };

  const handleReply = (message: Message) => {
    setReplyingTo(message);
    setEditingMessage(null);
    inputRef.current?.focus();
  };

  const handleEdit = (message: Message) => {
    setEditingMessage(message);
    setReplyingTo(null);
    setMessageText(typeof message.content === 'string' ? message.content : '');
    inputRef.current?.focus();
  };

  const handleCancelEdit = () => { setEditingMessage(null); setMessageText(''); };

  const typingList = typingUsers[currentChat._id] || [];
  const otherParticipant = currentChat.otherParticipant;
  const isOnline = otherParticipant && onlineUsers.has(otherParticipant._id);

  // Main Render
  return (
    <div className={`flex-1 flex flex-col ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Debug: show raw array */}
        <pre className="mb-2 p-2 bg-gray-100 rounded text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
          {JSON.stringify(messages, null, 2)}
        </pre>
        {isLoadingMessages ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : Array.isArray(messages) && messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">No messages yet. Start the conversation!</div>
        ) : Array.isArray(messages) ? (
          messages.map((message) =>
            message && message._id ? (
              <MessageBubble
                key={message._id}
                message={message}
                isOwn={message.sender?.['_id'] === user?._id}
                onReply={handleReply}
                onEdit={handleEdit}
                onDelete={() => {}}
                onReaction={() => {}}
              />
            ) : null
          )
        ) : (
          <div className="text-center py-8 text-red-500">Message list error</div>
        )}
        {typingList.length > 0 && (
          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            </div>
            <span>{typingList.map(u => u.displayName).join(', ')} {typingList.length === 1 ? 'is' : 'are'} typing...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply indicator */}
      {replyingTo && (
        <div className={`px-4 py-2 border-t ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-1 h-8 bg-primary-600 rounded" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Replying to {replyingTo.sender?.displayName || 'Unknown'}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                  {typeof replyingTo.content === 'string' ? replyingTo.content : 'Media message'}
                </p>
              </div>
            </div>
            <button onClick={() => setReplyingTo(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">×</button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className={`p-4 border-t ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center space-x-2">
          <button onClick={() => setShowFileUpload(!showFileUpload)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
            <Paperclip className="h-5 w-5 text-gray-500" />
          </button>
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={messageText}
              onChange={handleTyping}
              onKeyPress={handleKeyPress}
              placeholder={editingMessage ? 'Edit message...' : 'Type a message...'}
              className={`input w-full pr-20 ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300'}`}
            />
            {editingMessage && (
              <button onClick={handleCancelEdit} className="absolute right-12 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">×</button>
            )}
          </div>
          <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
            <Smile className="h-5 w-5 text-gray-500" />
          </button>
          <button
            onClick={handleSendMessage}
            disabled={!messageText.trim()}
            className="p-2 rounded-full bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>

      {showEmojiPicker && (
        <div className="absolute bottom-20 right-4 z-10">
          <EmojiPicker onEmojiSelect={handleEmojiSelect} onClose={() => setShowEmojiPicker(false)} />
        </div>
      )}
      {showFileUpload && (
        <div className="absolute bottom-20 left-4 z-10">
          <FileUpload onFileSelect={handleFileUpload} onClose={() => setShowFileUpload(false)} />
        </div>
      )}
    </div>
  );
};

export default ChatArea;
