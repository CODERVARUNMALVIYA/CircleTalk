import React, { useState, useEffect } from 'react'
import { axiosInstance } from '../lib/axios'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { resolveProfilePic } from '../lib/avatar'

const HomePages = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [showThemeSelector, setShowThemeSelector] = useState(false);

  // Apply theme to document
  useEffect(() => {
    console.log('Setting theme:', theme);
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    console.log('HTML element data-theme:', document.documentElement.getAttribute('data-theme'));
  }, [theme]);

  const { data: authData } = useQuery({
    queryKey: ["authUser"],
    queryFn: async () => {
      const res = await axiosInstance.get('/auth/me');
      return res.data;
    },
  });

  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ["allUsers"],
    queryFn: async () => {
      const res = await axiosInstance.get('/users/');
      return res.data;
    },
  });

  // Fetch actual friends list
  const { data: friendsData, isLoading: loadingFriends } = useQuery({
    queryKey: ["myFriends"],
    queryFn: async () => {
      const res = await axiosInstance.get('/users/friends');
      console.log('🔵 Friends API Response:', res.data);
      return res.data;
    },
  });

  // Fetch friend requests to track pending requests
  const { data: requestsData } = useQuery({
    queryKey: ["friendRequests"],
    queryFn: async () => {
      const res = await axiosInstance.get('/users/friend-request');
      return res.data;
    },
  });

  // Fetch outgoing requests
  const { data: outgoingRequests } = useQuery({
    queryKey: ["outgoingRequests"],
    queryFn: async () => {
      const res = await axiosInstance.get('/users/outgoing-friend-requests');
      return res.data;
    },
  });

  const user = authData?.user;
  const allUsers = usersData?.data || [];
  const myFriends = friendsData || [];
  const pendingRequests = outgoingRequests || [];
  const incomingRequests = requestsData?.incomingRequests || [];

  console.log('👥 My Friends:', myFriends);
  console.log('📊 Friends Count:', myFriends?.length);

  // Get IDs of users we've already sent requests to or received from
  const pendingUserIds = [
    ...pendingRequests.map((request) => request?.recipient?._id).filter(Boolean),
    ...incomingRequests.map((request) => request?.sender?._id).filter(Boolean)
  ];

  // Filter discover users - exclude self, friends, and users with pending requests
  const discoverUsers = allUsers.filter(person => 
    person._id !== user?._id && // Exclude self
    !myFriends.some(friend => friend._id === person._id) && // Exclude friends
    !pendingUserIds.includes(person._id) // Exclude users with pending requests
  );

  // DaisyUI Theme configurations
  const themes = [
    { name: 'light', icon: '☀️', label: 'Light' },
    { name: 'dark', icon: '🌙', label: 'Dark' },
    { name: 'cupcake', icon: '🧁', label: 'Cupcake' },
    { name: 'bumblebee', icon: '�', label: 'Bumblebee' },
    { name: 'emerald', icon: '💚', label: 'Emerald' },
    { name: 'corporate', icon: '💼', label: 'Corporate' },
    { name: 'synthwave', icon: '�', label: 'Synthwave' },
    { name: 'retro', icon: '📻', label: 'Retro' },
    { name: 'cyberpunk', icon: '🤖', label: 'Cyberpunk' },
    { name: 'valentine', icon: '💝', label: 'Valentine' },
    { name: 'halloween', icon: '🎃', label: 'Halloween' },
    { name: 'garden', icon: '🌻', label: 'Garden' },
    { name: 'forest', icon: '🌲', label: 'Forest' },
    { name: 'aqua', icon: '🌊', label: 'Aqua' },
    { name: 'lofi', icon: '�', label: 'Lofi' },
    { name: 'pastel', icon: '🎨', label: 'Pastel' },
    { name: 'fantasy', icon: '🦄', label: 'Fantasy' },
    { name: 'wireframe', icon: '📐', label: 'Wireframe' },
    { name: 'black', icon: '⚫', label: 'Black' },
    { name: 'luxury', icon: '💎', label: 'Luxury' },
    { name: 'dracula', icon: '🧛', label: 'Dracula' },
    { name: 'cmyk', icon: '🖨️', label: 'CMYK' },
    { name: 'autumn', icon: '�', label: 'Autumn' },
    { name: 'business', icon: '👔', label: 'Business' },
    { name: 'acid', icon: '🧪', label: 'Acid' },
    { name: 'lemonade', icon: '🍋', label: 'Lemonade' },
    { name: 'night', icon: '�', label: 'Night' },
    { name: 'coffee', icon: '☕', label: 'Coffee' },
    { name: 'winter', icon: '❄️', label: 'Winter' },
    { name: 'dim', icon: '🔅', label: 'Dim' },
    { name: 'nord', icon: '🏔️', label: 'Nord' },
    { name: 'sunset', icon: '�', label: 'Sunset' },
  ];

  const currentTheme = themes.find(t => t.name === theme) || themes[1];

  const handleLogout = async () => {
    try {
      await axiosInstance.post('/auth/logout');
      localStorage.removeItem('auth_token');
      toast.success('Logged out successfully!');
      window.location.href = '/login';
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  const sendFriendRequest = async (receiverId) => {
    try {
      await axiosInstance.post(`/users/friend-request/${receiverId}`);
      toast.success('Friend request sent!');
      // Refresh queries to update UI
      queryClient.invalidateQueries({ queryKey: ["outgoingRequests"] });
      queryClient.invalidateQueries({ queryKey: ["allUsers"] });
      queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to send request');
    }
  };

  return (
    <div className="min-h-screen bg-base-200 flex flex-col md:flex-row relative overflow-x-hidden">
      {/* Theme Selector Button */}
      <button
        onClick={() => setShowThemeSelector(!showThemeSelector)}
        className="fixed top-3 right-3 md:top-4 md:right-4 z-50 btn btn-circle btn-sm md:btn-md btn-primary shadow-lg"
      >
        <span className="text-xl md:text-2xl">{currentTheme.icon}</span>
      </button>

      {/* Theme Selector Panel */}
      {showThemeSelector && (
        <div className="fixed top-16 right-3 left-3 md:left-auto md:top-20 md:right-4 z-50 bg-base-100 rounded-2xl shadow-2xl p-4 md:p-6 border border-base-300 w-auto md:w-96 max-h-[70vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg md:text-xl font-bold">🎨 Choose Theme</h3>
            <button
              onClick={() => setShowThemeSelector(false)}
              className="btn btn-ghost btn-sm btn-circle"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {themes.map((t) => (
              <button
                key={t.name}
                onClick={() => {
                  setTheme(t.name);
                  setShowThemeSelector(false);
                }}
                className={`p-4 rounded-xl border-2 transition-all hover:scale-105 ${
                  theme === t.name
                    ? 'border-primary bg-primary bg-opacity-10'
                    : 'border-base-300 hover:border-primary'
                }`}
              >
                <div className="text-3xl mb-2">{t.icon}</div>
                <div className="text-xs font-semibold">{t.label}</div>
                {theme === t.name && (
                  <div className="text-xs text-primary mt-1">✓</div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="hidden md:flex md:w-64 w-full bg-base-100 border-r border-base-300 flex-col shadow-xl">
        {/* Logo Section */}
        <div className="p-6 border-b border-base-300">
          <div className="flex items-center space-x-3">
            <div className="bg-primary p-2 rounded-lg">
              <span className="text-2xl">💬</span>
            </div>
            <h1 className="text-xl font-bold">CircleTalk</h1>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
              activeTab === 'overview'
                ? 'bg-primary text-primary-content shadow-lg'
                : 'hover:bg-base-200'
            }`}
          >
            <span className="text-2xl">🏠</span>
            <span className="font-semibold">Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('friends')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
              activeTab === 'friends'
                ? 'bg-primary text-primary-content shadow-lg'
                : 'hover:bg-base-200'
            }`}
          >
            <span className="text-2xl">👥</span>
            <div className="flex-1 text-left">
              <span className="font-semibold">Friends</span>
              <span className="ml-2 text-sm">({myFriends?.length || 0})</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('discover')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
              activeTab === 'discover'
                ? 'bg-primary text-primary-content shadow-lg'
                : 'hover:bg-base-200'
            }`}
          >
            <span className="text-2xl">🔍</span>
            <span className="font-semibold">Discover</span>
          </button>

          <div className="pt-4 mt-4 border-t border-base-300">
            <button
              onClick={() => navigate('/chat')}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-base-200 transition-all"
            >
              <span className="text-2xl">💬</span>
              <span className="font-semibold">Chat</span>
            </button>

            <button
              onClick={() => navigate('/call')}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-base-200 transition-all"
            >
              <span className="text-2xl">📹</span>
              <span className="font-semibold">Video Call</span>
            </button>

            <button
              onClick={() => navigate('/notification')}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-base-200 transition-all"
            >
              <span className="text-2xl">🔔</span>
              <span className="font-semibold">Notifications</span>
            </button>

            <button
              onClick={() => navigate('/onboarding')}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-base-200 transition-all"
            >
              <span className="text-2xl">⚙️</span>
              <span className="font-semibold">Settings</span>
            </button>
          </div>
        </nav>

        {/* User Profile Section */}
        <div className="p-4 border-t border-base-300">
          <div className="flex items-center space-x-3 mb-3">
            <div className="avatar">
              <div className="w-10 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                <img src={resolveProfilePic(user?.profilePic, user?.fullName || 'profile')} alt="Profile" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{user?.fullName}</p>
              <p className="text-xs truncate opacity-60">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="btn btn-error btn-block"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="bg-base-100 border-b border-base-300 px-4 sm:px-6 md:px-8 py-3 sm:py-4 shadow-sm sticky top-0 z-20 safe-top">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold">
                {activeTab === 'overview' && '🏠 Overview'}
                {activeTab === 'friends' && '👥 Friends'}
                {activeTab === 'discover' && '🔍 Discover People'}
              </h2>
              <p className="text-xs sm:text-sm opacity-60">
                {activeTab === 'overview' && 'Welcome back to your dashboard'}
                {activeTab === 'friends' && 'Manage your connections'}
                {activeTab === 'discover' && 'Find new people to connect with'}
              </p>
            </div>
          </div>

          <div className="mt-3 flex md:hidden gap-2 overflow-x-auto hide-scrollbar pb-1">
            <button onClick={() => setActiveTab('overview')} className={`btn btn-sm whitespace-nowrap ${activeTab === 'overview' ? 'btn-primary' : 'btn-ghost'}`}>Overview</button>
            <button onClick={() => setActiveTab('friends')} className={`btn btn-sm whitespace-nowrap ${activeTab === 'friends' ? 'btn-primary' : 'btn-ghost'}`}>Friends</button>
            <button onClick={() => setActiveTab('discover')} className={`btn btn-sm whitespace-nowrap ${activeTab === 'discover' ? 'btn-primary' : 'btn-ghost'}`}>Discover</button>
            <button onClick={() => navigate('/chat')} className="btn btn-sm btn-ghost whitespace-nowrap">Chat</button>
            <button onClick={() => navigate('/call')} className="btn btn-sm btn-ghost whitespace-nowrap">Call</button>
            <button onClick={() => navigate('/notification')} className="btn btn-sm btn-ghost whitespace-nowrap">Alerts</button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            {/* Welcome Section */}
            <div className="card bg-base-100 shadow-xl mb-8">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">Welcome back, {user?.fullName?.split(' ')[0]}! 👋</h2>
                    <p className="text-sm sm:text-base md:text-lg opacity-70">Ready to connect and communicate?</p>
                  </div>
                  <div className="hidden md:block">
                    <div className="avatar">
                      <div className="w-24 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                        <img src={resolveProfilePic(user?.profilePic, user?.fullName || 'profile')} alt="Profile" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 mb-8">
              {/* Chat Card */}
              <div
                onClick={() => navigate('/chat')}
                className="card bg-primary text-primary-content shadow-xl hover:shadow-2xl hover:scale-[1.02] transform transition-all duration-200 cursor-pointer"
              >
                <div className="card-body items-center text-center">
                  <div className="text-4xl sm:text-5xl mb-4">💬</div>
                  <h3 className="card-title text-xl sm:text-2xl">Chat</h3>
                  <p className="text-sm sm:text-base">Message your friends</p>
                </div>
              </div>

              {/* Video Call Card */}
              <div
                onClick={() => navigate('/call')}
                className="card bg-secondary text-secondary-content shadow-xl hover:shadow-2xl hover:scale-[1.02] transform transition-all duration-200 cursor-pointer"
              >
                <div className="card-body items-center text-center">
                  <div className="text-4xl sm:text-5xl mb-4">📹</div>
                  <h3 className="card-title text-xl sm:text-2xl">Video Call</h3>
                  <p className="text-sm sm:text-base">Face-to-face chat</p>
                </div>
              </div>

              {/* Notifications Card */}
              <div
                onClick={() => navigate('/notification')}
                className="card bg-accent text-accent-content shadow-xl hover:shadow-2xl hover:scale-[1.02] transform transition-all duration-200 cursor-pointer"
              >
                <div className="card-body items-center text-center">
                  <div className="text-4xl sm:text-5xl mb-4">🔔</div>
                  <h3 className="card-title text-xl sm:text-2xl">Notifications</h3>
                  <p className="text-sm sm:text-base">Stay updated</p>
                </div>
              </div>

              {/* Profile Card */}
              <div
                onClick={() => navigate('/onboarding')}
                className="card bg-success text-success-content shadow-xl hover:shadow-2xl hover:scale-[1.02] transform transition-all duration-200 cursor-pointer"
              >
                <div className="card-body items-center text-center">
                  <div className="text-4xl sm:text-5xl mb-4">⚙️</div>
                  <h3 className="card-title text-xl sm:text-2xl">Settings</h3>
                  <p className="text-sm sm:text-base">Manage profile</p>
                </div>
              </div>
            </div>

            {/* Stats Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl sm:text-4xl font-bold">{myFriends?.length || 0}</div>
                      <div className="text-sm sm:text-lg mt-2 opacity-60">Friends</div>
                    </div>
                    <div className="text-4xl sm:text-5xl">👥</div>
                  </div>
                </div>
              </div>
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg sm:text-2xl font-bold">{user?.nativeLanguage || 'English'}</div>
                      <div className="text-sm sm:text-lg mt-2 opacity-60">Language</div>
                    </div>
                    <div className="text-4xl sm:text-5xl">🌍</div>
                  </div>
                </div>
              </div>
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg sm:text-2xl font-bold">{user?.location || 'Earth'}</div>
                      <div className="text-sm sm:text-lg mt-2 opacity-60">Location</div>
                    </div>
                    <div className="text-4xl sm:text-5xl">📍</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Friends Tab */}
        {activeTab === 'friends' && (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-2xl sm:text-3xl mb-6">Your Friends</h2>
              {loadingFriends ? (
                <div className="text-center py-12">
                  <span className="loading loading-spinner loading-lg text-primary"></span>
                  <p className="text-xl opacity-60 mt-4">Loading friends...</p>
                </div>
              ) : myFriends && myFriends.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myFriends.map((friend) => (
                    <div key={friend._id} className="card bg-base-200 shadow-md hover:scale-[1.02] transition-all">
                      <div className="card-body items-center text-center">
                        <div className="avatar">
                          <div className="w-16 sm:w-20 rounded-full ring ring-success ring-offset-base-100 ring-offset-2">
                            <img src={resolveProfilePic(friend.profilePic, friend.fullName || friend._id)} alt={friend.fullName} />
                          </div>
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold mt-3">{friend.fullName}</h3>
                        <p className="text-sm opacity-60">{friend.email}</p>
                        <div className="flex items-center space-x-2 mt-2 text-xs opacity-60">
                          <span>🌍 {friend.location || 'Earth'}</span>
                          <span>•</span>
                          <span>💬 {friend.nativeLanguage || 'English'}</span>
                        </div>
                        <div className="flex space-x-2 mt-4">
                          <button
                            onClick={() => navigate('/chat')}
                            className="btn btn-primary btn-sm"
                          >
                            💬 Chat
                          </button>
                          <button
                            onClick={() => navigate('/call', { state: { friend } })}
                            className="btn btn-secondary btn-sm"
                          >
                            📹 Call
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">😔</div>
                  <p className="text-xl opacity-60">No friends yet. Start connecting!</p>
                  <button
                    onClick={() => setActiveTab('discover')}
                    className="btn btn-primary mt-4"
                  >
                    Discover People
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Discover People Tab */}
        {activeTab === 'discover' && (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-2xl sm:text-3xl mb-6">Discover People</h2>
              
              {loadingUsers ? (
                <div className="text-center py-12">
                  <span className="loading loading-spinner loading-lg text-primary"></span>
                  <p className="text-xl opacity-60 mt-4">Loading users...</p>
                </div>
              ) : discoverUsers.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                  {discoverUsers.map((person) => (
                    <div
                      key={person._id}
                      className="card bg-base-200 shadow-md hover:scale-[1.02] transition-all"
                    >
                      <div className="card-body items-center text-center">
                        <div className="avatar">
                          <div className="w-16 sm:w-20 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                            <img
                              src={resolveProfilePic(person.profilePic, person.fullName || person._id)}
                              alt={person.fullName}
                            />
                          </div>
                        </div>
                        <h3 className="card-title text-lg sm:text-xl mt-4">{person.fullName}</h3>
                        <p className="text-sm opacity-60">{person.email}</p>
                        <p className="text-xs opacity-50 mb-3">{person.bio || 'Hey there! I am using CircleTalk'}</p>
                        <div className="flex items-center space-x-2 mb-3 text-xs opacity-60">
                          <span>🌍 {person.location || 'Earth'}</span>
                          <span>•</span>
                          <span>💬 {person.nativeLanguage || 'English'}</span>
                        </div>
                        <button
                          onClick={() => sendFriendRequest(person._id)}
                          className="btn btn-primary btn-block"
                        >
                          Add Friend
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🔍</div>
                  <p className="text-xl opacity-60">No users available to connect right now</p>
                  <p className="text-sm opacity-40 mt-2">Try again in a moment or ask a friend to sign up</p>
                  <button
                    onClick={() => queryClient.invalidateQueries({ queryKey: ["allUsers"] })}
                    className="btn btn-primary btn-sm mt-4"
                  >
                    Refresh
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        </main>
      </div>
    </div>
  )
}

export default HomePages