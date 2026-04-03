import React, { useEffect, useRef } from 'react'
import { Route, Routes,Navigate, useLocation } from 'react-router'
import HomePage from './pages/HomePages.jsx'
import SignUpPage from './pages/SignUpPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import OnboardingPage from './pages/OnboardingPage.jsx'
import NotificationPage from './pages/NotificationPage.jsx'
import ChatPage from './pages/ChatPage.jsx'
import CallPage from './pages/CallPage.jsx'
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';

import {axiosInstance} from './lib/axios.js';

import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast';

const SOCKET_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5001').replace(/\/api\/?$/, '').replace(/\/$/, '');

const App = () => {
  const location = useLocation();
  const queryClient = useQueryClient();
  const socketRef = useRef(null);

  // Set theme on app load
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const { data:authData, isLoading, error } = useQuery({
    queryKey: ["authUser"],
    queryFn: async () =>{
    
      const res = await axiosInstance.get('/auth/me');
      return res.data;
    },
    retry:false,
  });
  const authUser = authData?.user;

  useEffect(() => {
    if (!authUser?._id) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'default') return;

    Notification.requestPermission().catch(() => {});
  }, [authUser?._id]);

  useEffect(() => {
    if (!authUser?._id) return;

    if (!socketRef.current) {
      socketRef.current = io(SOCKET_BASE_URL, {
        withCredentials: true,
        transports: ['websocket', 'polling'],
        reconnection: true,
      });
    }

    const activeSocket = socketRef.current;

    const handleConnect = () => {
      activeSocket.emit('user-online', authUser._id);
    };

    const handleNewMessage = (incomingMessage) => {
      const senderName = incomingMessage?.sender?.fullName || 'New message';
      const text = incomingMessage?.text || 'You have a new message';

      queryClient.invalidateQueries({ queryKey: ['unreadSummary'] });

      if (location.pathname !== '/chat') {
        toast(`${senderName}: ${text}`, { icon: '💬' });
      }

      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted' &&
        document.visibilityState !== 'visible'
      ) {
        const browserNotification = new Notification(`Message from ${senderName}`, {
          body: text,
          tag: `message-${incomingMessage?.sender?._id || 'chat'}`,
        });

        browserNotification.onclick = () => {
          window.focus();
          window.location.href = '/chat';
          browserNotification.close();
        };
      }
    };

    activeSocket.on('connect', handleConnect);
    activeSocket.on('new-message', handleNewMessage);

    return () => {
      activeSocket.off('connect', handleConnect);
      activeSocket.off('new-message', handleNewMessage);
    };
  }, [authUser?._id, location.pathname, queryClient]);

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className='h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800'>
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-white mx-auto mb-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  
        
  return (
    <div className='min-h-screen'>
     
      <Routes>
      <Route path='/' element={authUser?<HomePage />: <Navigate to="/login"/>} />
      <Route path='/signup' element={!authUser?<SignUpPage/>: <Navigate to="/"/>} />
      <Route path='/login' element={!authUser?<LoginPage />: <Navigate to="/"/>} />
      <Route path='/onboarding' element={authUser?<OnboardingPage />: <Navigate to="/login"/>} />
      <Route path='/notification' element={authUser?<NotificationPage />: <Navigate to="/login"/>} />
      <Route path='/chat' element={authUser?<ChatPage />: <Navigate to="/login"/>} />
      <Route path='/call' element={authUser?<CallPage />: <Navigate to="/login"/>} />
      
      </Routes>
      <Toaster /> 
    </div>
  )
}

export default App