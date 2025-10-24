import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { MoreVertical, Reply, Edit, Trash2, Smile, Check, CheckCheck, Clock } from 'lucide-react';
import { Message } from '../../types';
import EmojiPicker from './EmojiPicker';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  onReply: (message: Message) => void;
  onEdit: (message: Message) => void;
  onDelete: (messageId: string) => void;
  onReaction: (messageId: string, emoji: string) => void;
}

// Robustly extract the text to display
const getDisplayText = (content: any): string => {
  if (typeof content === 'string') return content;
  if (content && typeof content.text === 'string') return content.text;
  return '';
};

const extractType = (src: any): string => {
  if (!src) return 'text';
  if (typeof src === 'string') return 'text';
  if (typeof src.type === 'string') return src.type;
  return 'text';
};

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  onReply,
  onEdit,
  onDelete,
  onReaction,
}) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [showOptions, setShowOptions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showReactions, setShowReactions] = useState(false);

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const displayText = getDisplayText(message.content);
  const replyText = getDisplayText(message?.replyTo?.content);
  const contentType = extractType(message.content);
  const media = (message as any)?.media;

  const getStatusIcon = () => {
    switch (message?.status) {
      case 'sent': return <Check className="h-4 w-4 text-gray-400" />;
      case 'delivered': return <CheckCheck className="h-4 w-4 text-gray-400" />;
      case 'read': return <CheckCheck className="h-4 w-4 text-blue-500" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const handleReactionClick = (emoji: string) => {
    onReaction?.(message._id, emoji);
    setShowEmojiPicker(false);
  };

  const handleOptionClick = (action: 'reply' | 'edit' | 'delete') => {
    if (action === 'reply') onReply?.(message);
    if (action === 'edit') onEdit?.(message);
    if (action === 'delete') onDelete?.(message._id);
    setShowOptions(false);
  };

  if (message?.deleted) {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
        <div
          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
            theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'
          }`}
        >
          <p className="text-sm italic">This message was deleted</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg relative group ${
          isOwn
            ? 'bg-primary-600 text-white'
            : theme === 'dark'
            ? 'bg-gray-700 text-white'
            : 'bg-white text-gray-900'
        }`}
      >
        {/* Reply indicator */}
        {!!message?.replyTo && (
          <div
            className={`mb-2 p-2 rounded border-l-4 ${
              isOwn
                ? 'bg-primary-700 border-primary-400'
                : theme === 'dark'
                ? 'bg-gray-600 border-gray-400'
                : 'bg-gray-100 border-gray-300'
            }`}
          >
            <p className="text-xs opacity-75">
              Replying to {message.replyTo?.sender?.displayName || 'User'}
            </p>
            <p className="text-sm truncate">{replyText || 'Media message'}</p>
          </div>
        )}

        {/* Message content */}
        <div className="space-y-2">
          {!!displayText && (
            <p className="text-sm whitespace-pre-wrap break-words">{displayText}</p>
          )}

          {/* Media content */}
          {media && (
            <div className="space-y-2">
              {contentType === 'image' && media?.url && (
                <img
                  src={media.url}
                  alt="Shared image"
                  className="max-w-full h-auto rounded"
                />
              )}
              {contentType === 'video' && media?.url && (
                <video
                  src={media.url}
                  controls
                  className="max-w-full h-auto rounded"
                />
              )}
              {contentType === 'audio' && media?.url && (
                <audio src={media.url} controls className="w-full" />
              )}
              {contentType === 'document' && (
                <div
                  className={`p-3 rounded border ${
                    isOwn
                      ? 'bg-primary-700 border-primary-400'
                      : theme === 'dark'
                      ? 'bg-gray-600 border-gray-400'
                      : 'bg-gray-100 border-gray-300'
                  }`}
                >
                  <p className="text-sm font-medium">
                    {media?.filename || 'Document'}
                  </p>
                  {typeof media?.size === 'number' && (
                    <p className="text-xs opacity-75">
                      {(media.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Forwarded / edited flags */}
          {message?.forwarded && (
            <div className="text-xs opacity-75">
              Forwarded from {message?.originalSender?.displayName || 'Unknown'}
            </div>
          )}
          {message?.edited && <div className="text-xs opacity-75">(edited)</div>}
        </div>

        {/* Reactions */}
        {Array.isArray(message?.reactions) && message.reactions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {message.reactions.map((reaction: any, i: number) => (
              <button
                key={`${reaction?.emoji ?? 'r'}-${i}`}
                onClick={() => setShowReactions(!showReactions)}
                className={`text-xs px-2 py-1 rounded-full ${
                  isOwn
                    ? 'bg-primary-700 hover:bg-primary-800'
                    : theme === 'dark'
                    ? 'bg-gray-600 hover:bg-gray-500'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
                type="button"
              >
                {reaction?.emoji} {reaction?.count ?? 0}
              </button>
            ))}
          </div>
        )}

        {/* Footer info */}
        <div
          className={`flex items-center justify-between mt-2 text-xs ${
            isOwn ? 'text-primary-200' : 'text-gray-500'
          }`}
        >
          <span>{formatTime(message?.createdAt as any)}</span>
          <div className="flex items-center space-x-1">
            {isOwn && getStatusIcon()}
            <span>
              {Array.isArray(message?.readBy) ? message.readBy.length : 0} read
            </span>
          </div>
        </div>

        {/* Options */}
        <div
          className={`absolute top-0 right-0 transform translate-x-full opacity-0 group-hover:opacity-100 transition-opacity ${
            isOwn ? '-translate-x-2' : 'translate-x-2'
          }`}
        >
          <div className="relative">
            <button
              onClick={() => setShowOptions(!showOptions)}
              className={`p-1 rounded-full ${
                theme === 'dark'
                  ? 'bg-gray-600 hover:bg-gray-500'
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
              type="button"
              aria-label="Message options"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {showOptions && (
              <div
                className={`absolute top-0 right-8 w-32 rounded-md shadow-lg ${
                  theme === 'dark'
                    ? 'bg-gray-700 border border-gray-600'
                    : 'bg-white border border-gray-200'
                }`}
              >
                <div className="py-1">
                  <button
                    onClick={() => handleOptionClick('reply')}
                    className="flex items-center w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                    type="button"
                  >
                    <Reply className="h-4 w-4 mr-2" />
                    Reply
                  </button>
                  {isOwn && (
                    <button
                      onClick={() => handleOptionClick('edit')}
                      className="flex items-center w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                      type="button"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="flex items-center w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                    type="button"
                  >
                    <Smile className="h-4 w-4 mr-2" />
                    React
                  </button>
                  {isOwn && (
                    <button
                      onClick={() => handleOptionClick('delete')}
                      className="flex items-center w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600"
                      type="button"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Emoji Picker */}
        {showEmojiPicker && (
          <div className="absolute top-0 right-0 transform translate-x-full z-10">
            <EmojiPicker
              onEmojiSelect={handleReactionClick}
              onClose={() => setShowEmojiPicker(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
