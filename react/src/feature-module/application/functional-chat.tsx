import React, { useEffect, useState, useRef } from "react";
import Scrollbars from "react-custom-scrollbars-2";
import { Link, useLocation } from "react-router-dom";
import { all_routes } from "../router/all_routes";
import ImageWithBasePath from "../../core/common/imageWithBasePath";
import "react-modal-video/scss/modal-video.scss";
import CollapseHeader from "../../core/common/collapse-header/collapse-header";
import { useSocket } from "../../SocketContext";
import { useAuth, useUser } from "@clerk/clerk-react";
import { Socket } from "socket.io-client";

interface User {
  userId: string;
  name: string;
  avatar?: string;
  role: string;
  email?: string;
  isOnline: boolean;
  lastSeen: Date;
}

interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  type: 'text' | 'file' | 'image';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  isEdited: boolean;
  isDeleted: boolean;
  readBy: Array<{ userId: string; readAt: Date }>;
  createdAt: Date;
}

interface Conversation {
  _id: string;
  participants: User[];
  lastMessage?: {
    content: string;
    senderId: string;
    senderName: string;
    timestamp: Date;
    type: string;
  };
  isGroup: boolean;
  groupName?: string;
  groupDescription?: string;
  groupAvatar?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const FunctionalChat = () => {
  const useBodyClass = (className: string) => {
    const location = useLocation();

    useEffect(() => {
      if (location.pathname === "/application/chat") {
        document.body.classList.add(className);
      } else {
        document.body.classList.remove(className);
      }
      return () => {
        document.body.classList.remove(className);
      };
    }, [location.pathname, className]);
  };
  useBodyClass("app-chat");

  const routes = all_routes;
  const socket = useSocket() as Socket | null;
  const { user: clerkUser } = useUser();
  
  // State management
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [companyUsers, setCompanyUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [showUsersList, setShowUsersList] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const [typingByConversation, setTypingByConversation] = useState<Record<string, boolean>>({});
  const [unreadByConversation, setUnreadByConversation] = useState<Record<string, number>>({});
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    // Listen for conversations list
    socket.on('conversations_list', (data: { conversations: Conversation[]; hasMore: boolean }) => {
      setConversations(data.conversations);
    });

    // Listen for messages list
    socket.on('messages_list', (data: { conversationId: string; messages: Message[]; hasMore: boolean }) => {
      if (data.conversationId === currentConversation?._id) {
        setMessages(data.messages);
      }
    });

    // Listen for new messages
    socket.on('new_message', (data: { conversationId: string; message: Message }) => {
      if (data.conversationId === currentConversation?._id) {
        setMessages(prev => [...prev, data.message]);
      }
      
      // Update conversations list with new message
      setConversations(prev => prev.map(conv => 
        conv._id === data.conversationId 
          ? { ...conv, lastMessage: { 
              content: data.message.content, 
              senderId: data.message.senderId, 
              senderName: data.message.senderName, 
              timestamp: data.message.createdAt, 
              type: data.message.type 
            }, updatedAt: new Date() }
          : conv
      ));

      // Increment unread count for non-active conversations
      if (data.conversationId !== currentConversation?._id && data.message.senderId !== clerkUser?.id) {
        setUnreadByConversation(prev => ({
          ...prev,
          [data.conversationId]: (prev[data.conversationId] || 0) + 1,
        }));
      }
    });

    // Listen for user status changes
    socket.on('user_status_changed', (data: { userId: string; isOnline: boolean }) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        if (data.isOnline) {
          newSet.add(data.userId);
        } else {
          newSet.delete(data.userId);
        }
        return newSet;
      });
    });

    // Listen for unread count
    socket.on('unread_count', (data: { count: number }) => {
      setUnreadCount(data.count);
    });

    // Listen for company users list
    socket.on('company_users_list', (data: { users: User[]; hasMore: boolean }) => {
      setCompanyUsers(data.users);
    });

    // Listen for conversation started
    socket.on('conversation_started', (data: { conversation: Conversation }) => {
      setConversations(prev => {
        const exists = prev.find(conv => conv._id === data.conversation._id);
        if (exists) return prev;
        return [data.conversation, ...prev];
      });
      setCurrentConversation(data.conversation);
      setShowUsersList(false);
    });

    // Listen for search results
    socket.on('search_results', (data: { conversations: Conversation[]; messages: any[] }) => {
      setIsSearching(true);
      setConversations(data.conversations || []);
    });

    // Typing indicators
    socket.on('user_typing', (data: { conversationId: string; userId: string }) => {
      // mark for current conversation detailed map and for sidebar list
      setTypingByConversation(prev => ({ ...prev, [data.conversationId]: true }));
      if (data.conversationId === currentConversation?._id) {
        setTypingUsers((prev) => ({ ...prev, [data.userId]: true }));
      }
    });

    socket.on('user_stopped_typing', (data: { conversationId: string; userId: string }) => {
      // clear sidebar indicator
      setTypingByConversation(prev => {
        const next = { ...prev };
        delete next[data.conversationId];
        return next;
      });
      if (data.conversationId === currentConversation?._id) {
        setTypingUsers((prev) => {
          const copy = { ...prev };
          delete copy[data.userId];
          return copy;
        });
      }
    });

    // Listen for errors
    socket.on('error', (error: { message: string }) => {
      console.warn('Chat warning:', error.message);
    });

    return () => {
      socket.off('conversations_list');
      socket.off('messages_list');
      socket.off('new_message');
      socket.off('user_status_changed');
      socket.off('unread_count');
      socket.off('company_users_list');
      socket.off('conversation_started');
      socket.off('search_results');
      socket.off('error');
    };
  }, [socket, currentConversation]);

  // Load initial data
  useEffect(() => {
    if (socket && clerkUser) {
      // Get conversations
      socket.emit('get_conversations', { limit: 50, skip: 0 });
      
      // Get unread count
      socket.emit('get_unread_count');
      
      // Get company users
      socket.emit('get_company_users', { limit: 50, skip: 0 });
      
      // Update online status
      socket.emit('update_online_status', { isOnline: true });

      const handleUnload = () => {
        try {
          socket.emit('update_online_status', { isOnline: false });
        } catch (e) {}
      };
      window.addEventListener('beforeunload', handleUnload);
      return () => window.removeEventListener('beforeunload', handleUnload);
    }
  }, [socket, clerkUser]);

  // Restore last opened conversation when conversations load
  useEffect(() => {
    const lastId = localStorage.getItem('lastConversationId');
    if (!lastId || currentConversation) return;
    const found = conversations.find(c => c._id === lastId);
    if (found) handleConversationSelect(found);
  }, [conversations, currentConversation]);

  // Handle conversation selection
  const handleConversationSelect = (conversation: Conversation) => {
    setCurrentConversation(conversation);
    setMessages([]);
    
    if (socket) {
      // Join conversation room
      socket.emit('join_conversation', { conversationId: conversation._id });
      
      // Get messages for this conversation
      socket.emit('get_messages', { 
        conversationId: conversation._id, 
        limit: 50, 
        skip: 0 
      });
      
      // Mark messages as read
      socket.emit('mark_messages_read', { conversationId: conversation._id });
    }

    // Reset unread, persist, and close sidebar on mobile after selecting a conversation
    setUnreadByConversation(prev => ({ ...prev, [conversation._id]: 0 }));
    localStorage.setItem('lastConversationId', conversation._id);
    setIsSidebarOpen(false);
  };

  // Handle starting new conversation
  const handleStartConversation = (targetUser: User) => {
    if (!socket) return;
    
    socket.emit('start_conversation', { targetUserId: targetUser.userId });
  };

  // Handle sending message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !currentConversation || !socket) return;

    socket.emit('send_message', {
      conversationId: currentConversation._id,
      content: messageInput.trim(),
      type: 'text'
    });

    setMessageInput("");
  };

  // Emit typing events
  useEffect(() => {
    if (!socket || !currentConversation) return;
    const conversationId = currentConversation._id;
    if (!messageInput) {
      socket.emit('stop_typing', { conversationId });
      return;
    }
    const t = setTimeout(() => {
      socket.emit('typing', { conversationId });
    }, 150);
    return () => clearTimeout(t);
  }, [messageInput, socket, currentConversation]);

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentConversation || !socket) return;

    // For now, we'll just send the file name as text
    // In a real implementation, you'd upload the file first and get a URL
    socket.emit('send_message', {
      conversationId: currentConversation._id,
      content: `📎 ${file.name}`,
      type: 'file',
      fileData: {
        name: file.name,
        size: file.size,
        type: file.type
      }
    });
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim() || !socket) return;

    socket.emit('search_chats', { 
      searchTerm: searchTerm.trim(), 
      limit: 20 
    });
  };

  // Get other participant in conversation
  const getOtherParticipant = (conversation: Conversation) => {
    if (!clerkUser) return null;
    return conversation.participants.find(p => p.userId !== clerkUser.id);
  };

  // Format time
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Format date
  const formatDate = (date: Date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffTime = now.getTime() - messageDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return messageDate.toLocaleDateString([], { weekday: 'long' });
    return messageDate.toLocaleDateString();
  };

  return (
    <>
      {/* Page Wrapper */}
      <div className="page-wrapper">
        <div className="content">
          {/* Breadcrumb */}
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">Chat</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={routes.adminDashboard}>
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">Application</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Chat
                  </li>
                </ol>
              </nav>
            </div>
            <div className="head-icons">
              <CollapseHeader />
            </div>
          </div>
          <div className={`chat-wrapper ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
            {/* Chats sidebar */}
            <div className={`sidebar-group ${isSidebarOpen ? 'show' : ''}`}>
              <div id="chats" className="sidebar-content active slimscroll">
                <Scrollbars>
                  <div className="chat-search-header">
                    <div className="header-title d-flex align-items-center justify-content-between">
                      <h4 className="mb-3">Chats</h4>
                      <div className="d-flex align-items-center gap-2">
                        {unreadCount > 0 && (
                          <span className="badge bg-danger">{unreadCount}</span>
                        )}
                        <button 
                          className="btn btn-sm btn-primary"
                          onClick={() => setShowUsersList(!showUsersList)}
                          title="Start new conversation"
                        >
                          <i className="ti ti-plus" />
                        </button>
                      </div>
                    </div>
                    {/* Chat Search */}
                    <div className="search-wrap">
                      <form onSubmit={handleSearch}>
                        <div className="input-group">
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Search For Contacts or Messages"
                            value={searchTerm}
                            onChange={(e) => {
                              const v = e.target.value;
                              setSearchTerm(v);
                              if (!v.trim()) {
                                setIsSearching(false);
                                socket?.emit('get_conversations', { limit: 50, skip: 0 });
                              }
                            }}
                          />
                          <span className="input-group-text">
                            <i className="ti ti-search" />
                          </span>
                        </div>
                      </form>
                    </div>
                    {/* /Chat Search */}
                  </div>
                  <div className="sidebar-body chat-body" id="chatsidebar">
                    {/* Show users list or conversations */}
                    {showUsersList ? (
                      <div>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <h5 className="chat-title">Company Members</h5>
                          <button 
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => setShowUsersList(false)}
                          >
                            <i className="ti ti-arrow-left" />
                          </button>
                        </div>
                        <div className="chat-users-wrap">
                          {companyUsers.map((user) => (
                            <div 
                              key={user.userId}
                              className="chat-list"
                              onClick={() => handleStartConversation(user)}
                              style={{ cursor: 'pointer' }}
                            >
                              <div className="chat-user-list">
                                <div className={`avatar avatar-lg ${onlineUsers.has(user.userId) ? 'online' : 'offline'} me-2`}>
                                  <ImageWithBasePath
                                    src={user.avatar || "assets/img/profiles/avatar-02.jpg"}
                                    className="rounded-circle"
                                    alt="image"
                                  />
                                </div>
                                <div className="chat-user-info">
                                  <div className="chat-user-msg">
                                    <h6>{user.name}</h6>
                                    <p className="text-muted text-capitalize">{user.role}</p>
                                  </div>
                                  <div className="chat-user-time">
                                    <span className={`status ${onlineUsers.has(user.userId) ? 'text-success' : 'text-muted'}`}>
                                      {onlineUsers.has(user.userId) ? 'Online' : 'Offline'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {companyUsers.length === 0 && (
                            <div className="text-center py-4">
                              <p className="text-muted">No company members found</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <h5 className="chat-title">{isSearching ? 'Search Results' : 'All Chats'}</h5>
                        </div>
                        <div className="chat-users-wrap">
                          {conversations.map((conversation) => {
                            const otherParticipant = getOtherParticipant(conversation);
                            const isOnline = otherParticipant ? onlineUsers.has(otherParticipant.userId) : false;
                            
                            const isTyping = typingByConversation[conversation._id];
                            return (
                              <div 
                                key={conversation._id}
                                className={`chat-list ${currentConversation?._id === conversation._id ? 'active' : ''}`}
                                onClick={() => handleConversationSelect(conversation)}
                                style={{ cursor: 'pointer' }}
                              >
                                <div className="chat-user-list">
                                  <div className={`avatar avatar-lg ${isOnline ? 'online' : 'offline'} me-2`}>
                                    <ImageWithBasePath
                                      src={otherParticipant?.avatar || "assets/img/profiles/avatar-02.jpg"}
                                      className="rounded-circle"
                                      alt="image"
                                    />
                                  </div>
                                  <div className="chat-user-info">
                                    <div className="chat-user-msg">
                                      <h6>{otherParticipant?.name || conversation.groupName || 'Unknown'}</h6>
                                      {isTyping ? (
                                        <p className="text-primary">is typing •••</p>
                                      ) : (
                                        <p className={conversation.lastMessage ? '' : 'text-muted'}>
                                          {conversation.lastMessage?.content || 'No messages yet'}
                                        </p>
                                      )}
                                    </div>
                                    <div className="chat-user-time">
                                      <span className="time">
                                        {conversation.lastMessage 
                                          ? formatTime(conversation.lastMessage.timestamp)
                                          : formatTime(conversation.createdAt)
                                        }
                                      </span>
                                      {unreadByConversation[conversation._id] > 0 && (
                                        <span className="count-message fs-12 fw-semibold ms-2">
                                          {unreadByConversation[conversation._id]}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          
                          {conversations.length === 0 && (
                            <div className="text-center py-4">
                              <p className="text-muted">No conversations yet</p>
                              <small className="text-muted">Click the + button to start a conversation</small>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </Scrollbars>
              </div>
            </div>
            {/* /Chats sidebar */}

            {/* Chat main */}
            <div className="chat-main">
              {currentConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="chat-header">
                    <div className="chat-user-info">
                      <div className="avatar avatar-lg me-2">
                        <ImageWithBasePath
                          src={getOtherParticipant(currentConversation)?.avatar || "assets/img/profiles/avatar-02.jpg"}
                          className="rounded-circle"
                          alt="image"
                        />
                      </div>
                      <div className="chat-user-details">
                        <h6>{getOtherParticipant(currentConversation)?.name || currentConversation.groupName || 'Unknown'}</h6>
                        <p className={onlineUsers.has(getOtherParticipant(currentConversation)?.userId || '') ? 'text-success' : 'text-muted'}>
                          {Object.keys(typingUsers).length > 0 ? 'Typing…' : (onlineUsers.has(getOtherParticipant(currentConversation)?.userId || '') ? 'Online' : 'Offline')}
                        </p>
                      </div>
                    </div>
                    <div className="chat-header-actions">
                      <button
                        className="btn btn-outline-secondary d-md-none me-2"
                        onClick={() => setIsSidebarOpen(true)}
                        title="Open chat list"
                      >
                        <i className="ti ti-layout-sidebar-left" />
                      </button>
                      <div className="dropdown">
                        <Link className="dropdown-toggle" to="#" data-bs-toggle="dropdown">
                          <i className="ti ti-dots-vertical" />
                        </Link>
                        <ul className="dropdown-menu dropdown-menu-end">
                          <li>
                            <Link className="dropdown-item" to="#" onClick={() => {
                              if (!socket || !currentConversation) return;
                              const current = (window as any).CHAT_MUTED?.[currentConversation._id] || false;
                              (window as any).CHAT_MUTED = { ...(window as any).CHAT_MUTED, [currentConversation._id]: !current };
                              socket.emit('mute_conversation', { conversationId: currentConversation._id, muted: !current });
                            }}>
                              <i className="ti ti-phone me-2" />
                              Mute Notification
                            </Link>
                          </li>
                          <li>
                            <Link className="dropdown-item" to="#" onClick={() => {
                              if (!socket || !currentConversation) return;
                              const current = (window as any).CHAT_DISAPPEAR?.[currentConversation._id] || false;
                              (window as any).CHAT_DISAPPEAR = { ...(window as any).CHAT_DISAPPEAR, [currentConversation._id]: !current };
                              socket.emit('disappearing_toggle', { conversationId: currentConversation._id, enabled: !current });
                            }}>
                              <i className="ti ti-clock-hour-4 me-2" />
                              Disappearing Message
                            </Link>
                          </li>
                          <li>
                            <Link className="dropdown-item" to="#" onClick={() => {
                              if (!socket || !currentConversation) return;
                              socket.emit('clear_conversation', { conversationId: currentConversation._id });
                              setMessages([]);
                            }}>
                              <i className="ti ti-eraser me-2" />
                              Clear Message
                            </Link>
                          </li>
                          <li>
                            <Link className="dropdown-item" to="#" onClick={() => {
                              if (!socket || !currentConversation) return;
                              socket.emit('delete_conversation', { conversationId: currentConversation._id });
                              setCurrentConversation(null);
                            }}>
                              <i className="ti ti-trash me-2" />
                              Delete Chat
                            </Link>
                          </li>
                          <li>
                            <Link className="dropdown-item" to="#" onClick={() => {
                              if (!socket || !currentConversation) return;
                              const current = (window as any).CHAT_BLOCKED?.[currentConversation._id] || false;
                              (window as any).CHAT_BLOCKED = { ...(window as any).CHAT_BLOCKED, [currentConversation._id]: !current };
                              socket.emit('block_user', { conversationId: currentConversation._id, blocked: !current });
                            }}>
                              <i className="ti ti-ban me-2" />
                              Block
                            </Link>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  {/* /Chat Header */}

                  {/* Chat Messages */}
                  <div className="chat chat-messages show" id="middle">
                    <Scrollbars>
                      <div className="messages">
                                                 {messages.map((message) => {
                           const isOwnMessage = message.senderId === clerkUser?.id;
                           const isRead = message.readBy.some(read => read.userId !== message.senderId);
                          
                          return (
                            <div key={message._id} className={`chat-content ${isOwnMessage ? 'chat-content-right' : ''}`}>
                              <div className="message-content">
                                <div className="message-time">
                                  <span>{formatTime(message.createdAt)}</span>
                                  {isOwnMessage && (
                                    <span className="ms-2">
                                      {isRead ? '✓✓' : '✓'}
                                    </span>
                                  )}
                                </div>
                                <div className="message-text">
                                  {message.type === 'file' ? (
                                    <div className="file-message">
                                      <i className="ti ti-file me-2" />
                                      <span>{message.content}</span>
                                    </div>
                                  ) : (
                                    <p>{message.content}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                    </Scrollbars>
                  </div>
                  {/* /Chat Messages */}

                  {/* Chat Footer */}
                  <div className="chat-footer">
                    <form onSubmit={handleSendMessage}>
                      <div className="input-group">
                        <input
                          type="file"
                          ref={fileInputRef}
                          style={{ display: 'none' }}
                          onChange={handleFileUpload}
                          accept="image/*,.pdf,.doc,.docx,.txt"
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <i className="ti ti-paperclip" />
                        </button>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Type a message"
                          value={messageInput}
                          onChange={(e) => setMessageInput(e.target.value)}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => setMessageInput(prev => prev + ' 😀')}
                          title="Insert emoji"
                        >
                          <i className="ti ti-mood-smile" />
                        </button>
                        <button className="btn btn-primary" type="submit">
                          <i className="ti ti-send" />
                        </button>
                      </div>
                    </form>
                  </div>
                  {/* /Chat Footer */}
                </>
              ) : (
                <div className="chat-welcome">
                  <div className="text-center">
                    <div className="avatar avatar-xl mx-auto mb-3">
                      <ImageWithBasePath
                        src="assets/img/profiles/avatar-02.jpg"
                        className="rounded-circle"
                        alt="image"
                      />
                    </div>
                    <h4>Welcome to Chat</h4>
                    <p className="text-muted">Select a conversation to start chatting or click the + button to start a new conversation</p>
                  </div>
                </div>
              )}
            </div>
            {/* /Chat main */}
          </div>
        </div>
      </div>
    </>
  );
};

export default FunctionalChat;
