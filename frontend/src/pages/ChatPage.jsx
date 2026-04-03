import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { axiosInstance } from '../lib/axios'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { resolveProfilePic } from '../lib/avatar'
import { io } from 'socket.io-client'

const SOCKET_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5001').replace(/\/api\/?$/, '').replace(/\/$/, '');
const toId = (value) => (value == null ? '' : String(value));

const ChatPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [activityByFriend, setActivityByFriend] = useState({});
  const [lastPreviewByFriend, setLastPreviewByFriend] = useState({});
  const [orderedFriends, setOrderedFriends] = useState([]);
  const socketRef = useRef(null);
  const selectedFriendRef = useRef(null);

  const moveFriendToTop = (friendId) => {
    const id = toId(friendId);
    if (!id) return;

    setOrderedFriends((prev) => {
      const withoutCurrent = prev.filter((friend) => toId(friend._id) !== id);
      const target = prev.find((friend) => toId(friend._id) === id) || friends.find((friend) => toId(friend._id) === id);
      if (!target) return prev;
      return [target, ...withoutCurrent];
    });
  };

  // Fetch current user
  const { data: authData } = useQuery({
    queryKey: ["authUser"],
    queryFn: async () => {
      const res = await axiosInstance.get('/auth/me');
      return res.data;
    },
  });

  // Fetch friends list
  const { data: friendsData, isLoading: loadingFriends } = useQuery({
    queryKey: ["myFriends"],
    queryFn: async () => {
      const res = await axiosInstance.get('/users/friends');
      return res.data;
    },
  });

  const { data: unreadSummaryData } = useQuery({
    queryKey: ["unreadSummary"],
    queryFn: async () => {
      const res = await axiosInstance.get('/chat/unread-summary');
      return res.data;
    },
    refetchInterval: 15000,
  });

  // Fetch chat history for selected friend
  const { data: chatData, isLoading: loadingMessages } = useQuery({
    queryKey: ["chatHistory", selectedFriend?._id],
    queryFn: async () => {
      if (!selectedFriend) return { messages: [] };
      const res = await axiosInstance.get(`/chat/history/${selectedFriend._id}`);
      return res.data;
    },
    enabled: !!selectedFriend,
    refetchInterval: 3000, // Auto-refresh every 3 seconds for new messages
  });

  const user = authData?.user;
  const friends = friendsData || [];
  const messages = chatData?.messages || [];
  const unreadBySender = unreadSummaryData?.bySender || {};

  useEffect(() => {
    setOrderedFriends((prev) => {
      if (!friends.length) return [];

      const freshById = new Map(friends.map((friend) => [toId(friend._id), friend]));
      const prevIds = prev.map((friend) => toId(friend._id));

      const kept = prevIds
        .filter((id) => freshById.has(id))
        .map((id) => freshById.get(id));

      const keptIds = new Set(kept.map((friend) => toId(friend._id)));
      const missing = friends.filter((friend) => !keptIds.has(toId(friend._id)));

      return [...kept, ...missing];
    });
  }, [friends]);

  useEffect(() => {
    selectedFriendRef.current = selectedFriend;
  }, [selectedFriend]);

  useEffect(() => {
    if (!unreadSummaryData?.bySender) return;

    setActivityByFriend((prev) => {
      const next = { ...prev };
      Object.entries(unreadSummaryData.bySender).forEach(([friendId, details]) => {
        if (details?.latestAt) {
          next[friendId] = new Date(details.latestAt).getTime();
        }
      });
      return next;
    });
  }, [unreadSummaryData]);

  const totalUnreadMessages = useMemo(
    () => Object.values(unreadBySender).reduce((sum, item) => sum + (item?.unreadCount || 0), 0),
    [unreadBySender]
  );

  const sortedFriends = useMemo(() => {
    return orderedFriends.length ? orderedFriends : friends;
  }, [orderedFriends, friends]);

  // Restore last selected friend from localStorage when friends load
  useEffect(() => {
    if (friends.length > 0 && !selectedFriend && user) {
      const lastSelectedId = localStorage.getItem(`lastSelectedFriend_${user._id}`);
      if (lastSelectedId) {
        const lastFriend = friends.find(f => f._id === lastSelectedId);
        if (lastFriend) {
          setSelectedFriend(lastFriend);
        }
      }
    }
  }, [friends, user, selectedFriend]);

  // Save selected friend to localStorage
  useEffect(() => {
    if (selectedFriend && user) {
      localStorage.setItem(`lastSelectedFriend_${user._id}`, selectedFriend._id);
    }
  }, [selectedFriend, user]);

  useEffect(() => {
    if (!user?._id) return;

    if (!socketRef.current) {
      socketRef.current = io(SOCKET_BASE_URL, {
        withCredentials: true,
        transports: ['websocket', 'polling'],
      });
    }

    const activeSocket = socketRef.current;

    const handleConnect = () => {
      activeSocket.emit('user-online', user._id);
    };

    const handleNewMessage = (incomingMessage) => {
      const senderId = incomingMessage?.sender?._id;
      const senderIdStr = toId(senderId);
      if (!senderIdStr) return;

      const incomingText = incomingMessage?.text || 'New message';

      setActivityByFriend((prev) => ({
        ...prev,
        [senderIdStr]: new Date(incomingMessage.createdAt || Date.now()).getTime(),
      }));
      moveFriendToTop(senderIdStr);

      setLastPreviewByFriend((prev) => ({
        ...prev,
        [senderIdStr]: incomingText,
      }));

      queryClient.invalidateQueries({ queryKey: ['unreadSummary'] });

      const activeFriendId = toId(selectedFriendRef.current?._id);
      if (activeFriendId === senderIdStr) {
        queryClient.invalidateQueries({ queryKey: ['chatHistory', senderIdStr] });
        return;
      }

      toast(`${incomingMessage.sender.fullName}: ${incomingText}`, { icon: '💬' });
    };

    activeSocket.on('connect', handleConnect);
    activeSocket.on('new-message', handleNewMessage);

    return () => {
      activeSocket.off('connect', handleConnect);
      activeSocket.off('new-message', handleNewMessage);
    };
  }, [user?._id, queryClient]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const messagesContainer = document.getElementById('messages-container');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }, [messages]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ recipientId, text }) => {
      const res = await axiosInstance.post('/chat/send', {
        recipientId,
        text
      });
      return res.data;
    },
    onSuccess: (data) => {
      setNewMessage('');
      const createdMessage = data?.message;
      const targetFriendId = toId(selectedFriend?._id);

      if (targetFriendId && createdMessage?.text) {
        setActivityByFriend((prev) => ({
          ...prev,
          [targetFriendId]: new Date(createdMessage.createdAt || Date.now()).getTime(),
        }));

        setLastPreviewByFriend((prev) => ({
          ...prev,
          [targetFriendId]: `You: ${createdMessage.text}`,
        }));
      }

      queryClient.invalidateQueries({ queryKey: ["chatHistory", selectedFriend?._id] });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Failed to send message');
    }
  });

  const sendMessage = () => {
    if (!newMessage.trim() || !selectedFriend) return;

    const now = Date.now();
    const messageText = newMessage.trim();
    const selectedFriendId = toId(selectedFriend._id);
    moveFriendToTop(selectedFriendId);

    setActivityByFriend((prev) => ({
      ...prev,
      [selectedFriendId]: now,
    }));

    setLastPreviewByFriend((prev) => ({
      ...prev,
      [selectedFriendId]: `You: ${messageText}`,
    }));
    
    sendMessageMutation.mutate({
      recipientId: selectedFriendId,
      text: messageText
    });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  return (
    <div className="h-screen overflow-hidden bg-base-200 flex">
      {/* Sidebar - Friends List */}
      <aside className="w-80 h-full bg-base-100 border-r border-base-300 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-base-300">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate('/')}
              className="btn btn-ghost btn-circle btn-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h2 className="text-xl font-bold">💬 Messages</h2>
            {totalUnreadMessages > 0 ? (
              <div className="badge badge-error">{totalUnreadMessages}</div>
            ) : (
              <div className="w-8"></div>
            )}
          </div>
          
          {/* Search Bar */}
          <div className="form-control">
            <input
              type="text"
              placeholder="Search friends..."
              className="input input-bordered input-sm w-full"
            />
          </div>
        </div>

        {/* Friends List */}
        <div className="flex-1 overflow-y-auto">
          {loadingFriends ? (
            <div className="p-4 text-center">
              <span className="loading loading-spinner loading-md"></span>
            </div>
          ) : friends.length > 0 ? (
            <div className="menu p-2">
              {sortedFriends.map((friend) => {
                const friendId = toId(friend._id);
                const unreadCount = unreadBySender[friendId]?.unreadCount || 0;
                const previewText = lastPreviewByFriend[friendId] || friend.location || 'Online';

                return (
                <button
                  key={friend._id}
                  onClick={() => {
                    setSelectedFriend(friend);
                    moveFriendToTop(friendId);
                    queryClient.invalidateQueries({ queryKey: ['chatHistory', friendId] });
                    queryClient.invalidateQueries({ queryKey: ['unreadSummary'] });
                  }}
                  className={`flex items-center space-x-3 p-3 rounded-lg mb-2 hover:bg-base-200 transition-all ${
                    toId(selectedFriend?._id) === friendId ? 'bg-primary text-primary-content' : ''
                  }`}
                >
                  <div className="avatar online">
                    <div className="w-12 rounded-full">
                      <img
                        src={resolveProfilePic(friend.profilePic, friend.fullName || friend._id)}
                        alt={friend.fullName}
                      />
                    </div>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold truncate">{friend.fullName}</p>
                    <p className="text-xs opacity-60 truncate">
                      {previewText}
                    </p>
                  </div>
                  {unreadCount > 0 && toId(selectedFriend?._id) !== friendId ? (
                    <div className="badge badge-primary badge-sm">{unreadCount}</div>
                  ) : null}
                </button>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="text-5xl mb-3">😔</div>
              <p className="text-sm opacity-60">No friends yet</p>
              <button
                onClick={() => navigate('/')}
                className="btn btn-primary btn-sm mt-3"
              >
                Find Friends
              </button>
            </div>
          )}
        </div>

        {/* User Profile at Bottom */}
        <div className="p-4 border-t border-base-300">
          <div className="flex items-center space-x-3">
            <div className="avatar">
              <div className="w-10 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                <img src={resolveProfilePic(user?.profilePic, user?.fullName || 'you')} alt="You" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{user?.fullName}</p>
              <p className="text-xs opacity-60 truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 h-full min-h-0 flex flex-col">
        {selectedFriend ? (
          <>
            {/* Chat Header */}
            <header className="bg-base-100 border-b border-base-300 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="avatar online">
                    <div className="w-12 rounded-full">
                      <img
                        src={resolveProfilePic(selectedFriend.profilePic, selectedFriend.fullName || selectedFriend._id)}
                        alt={selectedFriend.fullName}
                      />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{selectedFriend.fullName}</h3>
                    <p className="text-xs opacity-60">
                      🌍 {selectedFriend.location || 'Earth'} • 💬 {selectedFriend.nativeLanguage || 'English'}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => navigate('/call', { state: { friend: selectedFriend, callType: 'video' } })}
                    className="btn btn-circle btn-ghost"
                    title="Video Call"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <button className="btn btn-circle btn-ghost" title="More options">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            </header>

            {/* Messages Area */}
            <div id="messages-container" className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
              {loadingMessages ? (
                <div className="text-center py-12">
                  <span className="loading loading-spinner loading-lg text-primary"></span>
                  <p className="text-sm opacity-60 mt-2">Loading messages...</p>
                </div>
              ) : messages.length > 0 ? (
                messages.map((message) => {
                  const isSender = message.sender._id === user._id;
                  return (
                    <div
                      key={message._id}
                      className={`chat ${isSender ? 'chat-end' : 'chat-start'}`}
                    >
                      <div className="chat-image avatar">
                        <div className="w-10 rounded-full">
                          <img
                            src={
                              isSender
                                ? resolveProfilePic(message.sender.profilePic || user?.profilePic, user?.fullName || 'you')
                                : resolveProfilePic(message.sender.profilePic || selectedFriend?.profilePic, selectedFriend?.fullName || 'friend')
                            }
                            alt="Avatar"
                          />
                        </div>
                      </div>
                      <div className="chat-header mb-1">
                        {isSender ? 'You' : message.sender.fullName}
                        <time className="text-xs opacity-50 ml-2">
                          {new Date(message.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </time>
                      </div>
                      <div
                        className={`chat-bubble ${
                          isSender
                            ? 'chat-bubble-primary'
                            : 'chat-bubble-secondary'
                        }`}
                      >
                        {message.text}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">👋</div>
                  <p className="text-xl font-semibold opacity-60">Start a conversation!</p>
                  <p className="text-sm opacity-40 mt-2">
                    Say hi to {selectedFriend.fullName}
                  </p>
                </div>
              )}
            </div>

            {/* Message Input */}
            <footer className="bg-base-100 border-t border-base-300 p-4">
              <div className="flex items-end space-x-3">
                <button className="btn btn-circle btn-ghost">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="textarea textarea-bordered flex-1 resize-none"
                  rows="1"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="btn btn-primary btn-circle"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-8xl mb-6">💬</div>
              <h2 className="text-3xl font-bold mb-2">Welcome to Chat!</h2>
              <p className="text-lg opacity-60 mb-6">
                Select a friend to start messaging
              </p>
              {friends.length === 0 && (
                <button
                  onClick={() => navigate('/')}
                  className="btn btn-primary"
                >
                  Find Friends
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default ChatPage