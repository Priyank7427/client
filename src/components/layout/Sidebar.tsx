import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useChat } from '../../contexts/ChatContext';
import { Search } from 'lucide-react';
import { User } from '../../types';
import toast from 'react-hot-toast';
import { usersAPI, chatsAPI } from '../../services/api';

const Sidebar: React.FC = () => {
  const { token } = useAuth();
  const { theme } = useTheme();
  const { chats, currentChat, setCurrentChat, loadChats, isLoading, onlineUsers } = useChat();
  const [activeTab, setActiveTab] = useState<'chats' | 'contacts' | 'groups'>('chats');
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState<User[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [userSearchResults, setUserSearchResults] = useState<User[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  useEffect(() => {
    if (activeTab === 'contacts') {
      loadContacts();
    }
  }, [activeTab]);

  const loadContacts = async () => {
    try {
      setIsLoadingContacts(true);
      const { contacts } = await usersAPI.getContacts();
      setContacts(contacts.map(c => c.user));
    } catch {
      toast.error('Failed to load contacts');
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (activeTab === 'contacts' && e.target.value.length >= 2) {
      setIsSearchingUsers(true);
      try {
        const { users } = await usersAPI.search(e.target.value);
        setUserSearchResults(users);
      } catch {
        setUserSearchResults([]);
      } finally {
        setIsSearchingUsers(false);
      }
    } else {
      setUserSearchResults([]);
    }
  };

  const handleAddContact = async (userId: string) => {
    try {
      await usersAPI.addContact(userId);
      toast.success('Contact added!');
      loadContacts();
    } catch {
      toast.error('Failed to add contact');
    }
  };

  const handleNewChat = async (userId: string) => {
    try {
      const { chat } = await chatsAPI.createDirectChat(userId);
      setCurrentChat(chat);
      await loadChats();
    } catch {
      toast.error('Failed to create chat');
    }
  };

  const filteredContacts = contacts.filter(contact => {
    if (!searchQuery) return true;
    const term = searchQuery.toLowerCase();
    return (
      contact.displayName.toLowerCase().includes(term) ||
      contact.username.toLowerCase().includes(term)
    );
  });

  return (
    <div className={`w-80 flex flex-col h-full ${theme === 'dark' ? 'bg-gray-800 border-r border-gray-700' : 'bg-white border-r border-gray-200'}`}>
      {/* Header & Search */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">ChatApp</h1>
        <div className="relative my-2">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder={activeTab === 'contacts' ? "Search users..." : "Search..."}
            value={searchQuery}
            onChange={handleSearchChange}
            className={`input pl-10 w-full ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300'}`}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {['chats', 'contacts', 'groups'].map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab as any); setSearchQuery(''); setUserSearchResults([]); }}
            className={`flex-1 py-3 px-4 text-sm font-medium ${
              activeTab === tab
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Contacts Tab */}
        {activeTab === 'contacts' && (
          <div className="p-2">
            {/* Global User Search Results */}
            {isSearchingUsers ? (
              <div className="flex justify-center py-4 text-gray-400">Searching users...</div>
            ) : userSearchResults.length > 0 ? (
              <div>
                <div className="font-semibold text-xs mb-2">Add Contacts:</div>
                {userSearchResults.map(u => (
                  <div key={u._id} className="flex items-center justify-between p-2 hover:bg-gray-100 rounded">
                    <span>{u.displayName} (@{u.username})</span>
                    <button
                      onClick={() => handleAddContact(u._id)}
                      className="ml-2 px-2 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700"
                    >
                      Add
                    </button>
                  </div>
                ))}
                <hr className="my-2" />
              </div>
            ) : null}

            {/* Existing Contacts */}
            {isLoadingContacts ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                {searchQuery ? 'No contacts found' : 'No contacts yet'}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredContacts.map(c => (
                  <div
                    key={c._id}
                    className="p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => handleNewChat(c._id)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        {c.profilePicture ? (
                          <img src={c.profilePicture} alt={c.displayName} className="h-12 w-12 rounded-full" />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-600">{c.displayName.charAt(0)}</span>
                          </div>
                        )}
                        {onlineUsers.has(c._id) && (
                          <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {c.displayName}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">@{c.username}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        c.status === 'online'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {c.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {/* Chats and Groups tabs remain unchanged */}
      </div>
    </div>
  );
};

export default Sidebar;
