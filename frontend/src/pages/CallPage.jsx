import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '../lib/axios';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { resolveProfilePic, makeAvatarUrl } from '../lib/avatar';

const FALLBACK_AVATAR = makeAvatarUrl('fallback-user');
const SOCKET_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5001').replace(/\/api\/?$/, '').replace(/\/$/, '');

const CallPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedFriend, setSelectedFriend] = useState(location.state?.friend || null);
  const [callType, setCallType] = useState(location.state?.callType || null);
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callStatus, setCallStatus] = useState('idle'); // idle, calling, ringing, connected
  const [incomingCall, setIncomingCall] = useState(location.state?.incomingCall || null);
  const [hasRemoteStream, setHasRemoteStream] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const socketRef = useRef(null);
  const friendsRef = useRef([]);
  const pendingIceCandidatesRef = useRef([]);
  const hasRemoteDescriptionRef = useRef(false);

  const getProfilePic = (pic, seed = 'call-user') => resolveProfilePic(pic, seed);

  // ICE servers configuration (STUN server)
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  // Fetch current user
  const { data: authData } = useQuery({
    queryKey: ['authUser'],
    queryFn: async () => {
      const res = await axiosInstance.get('/auth/me');
      return res.data;
    },
  });

  // Fetch friends list
  const { data: friendsData, isLoading: loadingFriends } = useQuery({
    queryKey: ['myFriends'],
    queryFn: async () => {
      const res = await axiosInstance.get('/users/friends');
      return res.data;
    },
  });

  const user = authData?.user;
  const friends = friendsData || [];

  useEffect(() => {
    friendsRef.current = friends;
  }, [friends]);

  useEffect(() => {
    if (location.state?.incomingCall) {
      setIncomingCall(location.state.incomingCall);
    }
  }, [location.state]);

  // End call
  const flushPendingIceCandidates = async () => {
    if (!peerConnectionRef.current || !hasRemoteDescriptionRef.current) return;

    while (pendingIceCandidatesRef.current.length > 0) {
      const candidate = pendingIceCandidatesRef.current.shift();
      if (!candidate) continue;

      try {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('Error adding pending ICE candidate:', error);
      }
    }
  };

  const endCall = ({ notifyPeer = true } = {}) => {
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    // Stop remote stream
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    // Notify other user
    if (notifyPeer && socketRef.current && selectedFriend && isInCall) {
      socketRef.current.emit('end-call', {
        to: selectedFriend._id,
      });
    }

    // Reset state
    setIsInCall(false);
    setCallStatus('idle');
    setSelectedFriend(null);
    setCallType(null);
    setIsMuted(false);
    setIsVideoOff(false);
    setHasRemoteStream(false);
    hasRemoteDescriptionRef.current = false;
    pendingIceCandidatesRef.current = [];

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    localStreamRef.current = null;
    remoteStreamRef.current = null;
    peerConnectionRef.current = null;
  };

  // Initialize socket connection
  useEffect(() => {
    if (!user?._id) return;

    if (!socketRef.current) {
      socketRef.current = io(SOCKET_BASE_URL, {
        withCredentials: true,
        transports: ['websocket', 'polling'],
        reconnection: true,
      });
    }

    const activeSocket = socketRef.current;

    const handleConnect = () => {
      activeSocket.emit('user-online', user._id);
    };

    const handleIncomingCall = ({ from, offer, callType: incomingCallType }) => {
      const caller = friendsRef.current.find((f) => f._id === from) || {
        _id: from,
        fullName: 'Friend',
        profilePic: makeAvatarUrl(from || 'friend'),
      };

      setIncomingCall({ caller, offer, callType: incomingCallType });
      toast('Incoming call from ' + caller.fullName, {
        icon: '📞',
        duration: 10000,
      });
    };

    const handleCallAnswered = async ({ answer }) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        hasRemoteDescriptionRef.current = true;
        await flushPendingIceCandidates();
        setCallStatus('connected');
      }
    };

    const handleIceCandidate = async ({ candidate }) => {
      if (!candidate || !peerConnectionRef.current) return;

      if (!hasRemoteDescriptionRef.current) {
        pendingIceCandidatesRef.current.push(candidate);
        return;
      }

      try {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    };

    const handleCallRejected = () => {
      toast.error('Call was rejected');
      endCall({ notifyPeer: false });
    };

    const handleCallEnded = () => {
      toast('Call ended');
      endCall({ notifyPeer: false });
    };

    const handleUserOffline = ({ userId }) => {
      const activeFriendId = selectedFriend?._id;
      if (!activeFriendId || String(activeFriendId) !== String(userId)) {
        return;
      }

      toast.error('User is offline');
      endCall({ notifyPeer: false });
    };

    activeSocket.on('connect', handleConnect);
    activeSocket.on('incoming-call', handleIncomingCall);
    activeSocket.on('call-answered', handleCallAnswered);
    activeSocket.on('ice-candidate', handleIceCandidate);
    activeSocket.on('call-rejected', handleCallRejected);
    activeSocket.on('call-ended', handleCallEnded);
    activeSocket.on('user-offline', handleUserOffline);

    return () => {
      activeSocket.off('connect', handleConnect);
      activeSocket.off('incoming-call', handleIncomingCall);
      activeSocket.off('call-answered', handleCallAnswered);
      activeSocket.off('ice-candidate', handleIceCandidate);
      activeSocket.off('call-rejected', handleCallRejected);
      activeSocket.off('call-ended', handleCallEnded);
      activeSocket.off('user-offline', handleUserOffline);
    };
  }, [user?._id]);

  // Auto-start call if coming from another page
  useEffect(() => {
    if (selectedFriend && callType && !isInCall) {
      startCall(selectedFriend, callType);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Create peer connection
  const createPeerConnection = (peerId) => {
    const pc = new RTCPeerConnection(iceServers);

    hasRemoteDescriptionRef.current = false;
    pendingIceCandidatesRef.current = [];

    // Add local stream tracks to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      remoteStreamRef.current = event.streams[0];
      setHasRemoteStream(true);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
        remoteVideoRef.current.play?.().catch(() => {});
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current && peerId) {
        socketRef.current.emit('ice-candidate', {
          to: peerId,
          candidate: event.candidate,
        });
      }
    };

    // Connection state change
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setCallStatus('connected');
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        endCall();
      }
    };

    return pc;
  };

  // Start call
  const startCall = async (friend, type) => {
    try {
      setSelectedFriend(friend);
      setCallType(type);
      setCallStatus('calling');

      const constraints = {
        audio: true,
        video: type === 'video',
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play?.().catch(() => {});
      }

      if (!socketRef.current?.connected) {
        stream.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
        setCallStatus('idle');
        toast.error('Connection not ready. Please try again.');
        return;
      }

      // Create peer connection
      peerConnectionRef.current = createPeerConnection(friend._id);

      // Create offer
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);

      // Send offer to recipient
      if (socketRef.current) {
        socketRef.current.emit('call-user', {
          to: friend._id,
          from: user._id,
          offer,
          callType: type,
        });
      }

      setIsInCall(true);
      toast.success(`Calling ${friend.fullName}...`);
    } catch (error) {
      console.error('Error starting call:', error);
      toast.error('Failed to access camera/microphone');
      setCallStatus('idle');
    }
  };

  // Reject incoming call
  const rejectCall = () => {
    if (incomingCall && socketRef.current) {
      socketRef.current.emit('reject-call', {
        to: incomingCall.caller._id,
      });
    }
    setIncomingCall(null);
    toast('Call rejected');
  };

  // Answer incoming call
  const answerCall = async () => {
    try {
      if (!incomingCall) return;

      setSelectedFriend(incomingCall.caller);
      setCallType(incomingCall.callType);
      setCallStatus('connecting');

      const constraints = {
        audio: true,
        video: incomingCall.callType === 'video',
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play?.().catch(() => {});
      }

      // Create peer connection
      peerConnectionRef.current = createPeerConnection(incomingCall.caller._id);

      // Set remote description
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
      hasRemoteDescriptionRef.current = true;
      await flushPendingIceCandidates();

      // Create answer
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);

      // Send answer
      if (socketRef.current) {
        socketRef.current.emit('answer-call', {
          to: incomingCall.caller._id,
          answer,
        });
      }

      setIsInCall(true);
      setIncomingCall(null);
      setCallStatus('connected');
      toast.success('Call connected');
    } catch (error) {
      console.error('Error answering call:', error);
      toast.error('Failed to answer call');
      rejectCall();
    }
  };

  // Toggle mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStreamRef.current && callType === 'video') {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCall({ notifyPeer: false });
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-base-200">
      {/* Incoming Call Modal */}
      {incomingCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm p-4">
          <div className="card w-full max-w-sm sm:max-w-md bg-base-100 shadow-2xl animate-bounce-slow">
            <div className="card-body items-center text-center p-4 sm:p-6">
              <div className="text-5xl sm:text-6xl mb-3 sm:mb-4 animate-pulse">📞</div>
              <h2 className="card-title text-xl sm:text-2xl">Incoming Call</h2>
              <div className="avatar my-3 sm:my-4">
                <div className="w-20 sm:w-24 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2 sm:ring-offset-4">
                  <img
                    src={getProfilePic(incomingCall.caller.profilePic, incomingCall.caller.fullName || incomingCall.caller._id)}
                    alt={incomingCall.caller.fullName}
                    onError={(e) => {
                      e.currentTarget.src = FALLBACK_AVATAR;
                    }}
                  />
                </div>
              </div>
              <p className="text-lg sm:text-xl font-bold">{incomingCall.caller.fullName}</p>
              <p className="text-xs sm:text-sm opacity-60">
                {incomingCall.callType === 'video' ? '📹 Video Call' : '📞 Voice Call'}
              </p>
              <div className="card-actions justify-center mt-4 sm:mt-6 w-full gap-2 sm:gap-4 flex-col sm:flex-row">
                <button onClick={answerCall} className="btn btn-success btn-md sm:btn-lg flex-1 w-full sm:w-auto">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  Accept
                </button>
                <button onClick={rejectCall} className="btn btn-error btn-md sm:btn-lg flex-1 w-full sm:w-auto">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-base-100 border-b border-base-300 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <button onClick={() => navigate('/')} className="btn btn-ghost btn-circle btn-sm sm:btn-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">📹 Video &amp; Voice Call</h1>
                <p className="text-xs sm:text-sm opacity-60 hidden sm:block">Connect with your friends</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {!isInCall ? (
          <div>
            <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Select a friend to call</h2>

            {loadingFriends ? (
              <div className="text-center py-12">
                <span className="loading loading-spinner loading-lg text-primary"></span>
              </div>
            ) : friends.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {friends.map((friend) => (
                  <div key={friend._id} className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all">
                    <div className="card-body items-center text-center">
                      <div className="avatar online">
                        <div className="w-24 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                          <img
                            src={getProfilePic(friend.profilePic, friend.fullName || friend._id)}
                            alt={friend.fullName}
                            onError={(e) => {
                              e.currentTarget.src = FALLBACK_AVATAR;
                            }}
                          />
                        </div>
                      </div>
                      <h3 className="card-title text-xl mt-3">{friend.fullName}</h3>
                      <p className="text-sm opacity-60">{friend.email}</p>
                      <div className="flex items-center space-x-2 mt-2 text-xs opacity-60">
                        <span>🌍 {friend.location || 'Earth'}</span>
                        <span>•</span>
                        <span>💬 {friend.nativeLanguage || 'English'}</span>
                      </div>

                      <div className="card-actions justify-center mt-4 w-full space-y-2">
                        <button onClick={() => startCall(friend, 'video')} className="btn btn-primary btn-block">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                          Video Call
                        </button>
                        <button onClick={() => startCall(friend, 'audio')} className="btn btn-secondary btn-block">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                            />
                          </svg>
                          Voice Call
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 card bg-base-100 shadow-xl">
                <div className="card-body">
                  <div className="text-6xl mb-4">😔</div>
                  <p className="text-xl font-semibold opacity-60">No friends yet</p>
                  <p className="text-sm opacity-40">Add friends to start calling</p>
                  <button onClick={() => navigate('/')} className="btn btn-primary mt-4">
                    Find Friends
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="relative">
            {/* Call Status */}
            <div className="text-center mb-4">
              <div className="inline-flex items-center space-x-2 bg-base-100 px-6 py-3 rounded-full shadow-lg">
                <div className="w-3 h-3 bg-success rounded-full animate-pulse"></div>
                <span className="font-semibold">{callStatus === 'calling' ? 'Calling...' : 'Connected'}</span>
                {selectedFriend && <span className="opacity-60">• {selectedFriend.fullName}</span>}
              </div>
            </div>

            {/* Video Container */}
            <div className="relative bg-base-300 rounded-2xl overflow-hidden" style={{ height: '70vh' }}>
              {/* Remote Video */}
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />

              {/* Placeholder */}
              {!hasRemoteStream && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary to-secondary">
                  <div className="text-center text-primary-content">
                    <div className="avatar mb-4">
                      <div className="w-32 rounded-full ring ring-primary-content ring-offset-base-100 ring-offset-4">
                        <img
                          src={getProfilePic(selectedFriend?.profilePic, selectedFriend?.fullName || selectedFriend?._id)}
                          alt={selectedFriend?.fullName}
                          onError={(e) => {
                            e.currentTarget.src = FALLBACK_AVATAR;
                          }}
                        />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold">{selectedFriend?.fullName}</h3>
                    <p className="text-sm opacity-80 mt-2">Waiting to connect...</p>
                  </div>
                </div>
              )}

              {/* Local Video */}
              {callType === 'video' && (
                <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 w-24 h-32 sm:w-32 sm:h-24 md:w-48 md:h-36 bg-base-100 rounded-lg overflow-hidden shadow-2xl border-2 border-base-300">
                  <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
                  {isVideoOff && (
                    <div className="absolute inset-0 flex items-center justify-center bg-base-300">
                      <div className="text-center">
                        <div className="avatar mb-2">
                          <div className="w-16 rounded-full">
                            <img
                              src={getProfilePic(user?.profilePic, user?.fullName || 'you')}
                              alt="You"
                              onError={(e) => {
                                e.currentTarget.src = FALLBACK_AVATAR;
                              }}
                            />
                          </div>
                        </div>
                        <p className="text-xs opacity-60">Camera Off</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Audio Call Avatar */}
              {callType === 'audio' && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-secondary to-accent">
                  <div className="text-center text-secondary-content">
                    <div className="avatar mb-6">
                      <div className="w-40 rounded-full ring ring-secondary-content ring-offset-base-100 ring-offset-8 animate-pulse">
                        <img
                          src={getProfilePic(selectedFriend?.profilePic, selectedFriend?.fullName || selectedFriend?._id)}
                          alt={selectedFriend?.fullName}
                          onError={(e) => {
                            e.currentTarget.src = FALLBACK_AVATAR;
                          }}
                        />
                      </div>
                    </div>
                    <h3 className="text-3xl font-bold mb-2">{selectedFriend?.fullName}</h3>
                    <p className="text-lg opacity-80">Voice Call</p>
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex justify-center items-center space-x-2 sm:space-x-4 mt-4 sm:mt-6">
              <button onClick={toggleMute} className={`btn btn-circle btn-md sm:btn-lg ${isMuted ? 'btn-error' : 'btn-ghost'}`} title={isMuted ? 'Unmute' : 'Mute'}>
                {isMuted ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                )}
              </button>

              <button onClick={endCall} className="btn btn-error btn-circle btn-md sm:btn-lg shadow-lg" title="End Call">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-7 sm:w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
                </svg>
              </button>

              {callType === 'video' && (
                <button
                  onClick={toggleVideo}
                  className={`btn btn-circle btn-md sm:btn-lg ${isVideoOff ? 'btn-error' : 'btn-ghost'}`}
                  title={isVideoOff ? 'Turn On Camera' : 'Turn Off Camera'}
                >
                  {isVideoOff ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              )}

              <button onClick={() => navigate('/chat')} className="btn btn-circle btn-md sm:btn-lg btn-ghost" title="Open Chat">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default CallPage;