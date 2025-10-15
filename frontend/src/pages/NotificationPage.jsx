import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { axiosInstance } from '../lib/axios'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

const NotificationPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('incoming'); // incoming or outgoing

  // Fetch current user
  const { data: authData } = useQuery({
    queryKey: ["authUser"],
    queryFn: async () => {
      const res = await axiosInstance.get('/auth/me');
      return res.data;
    },
  });

  const user = authData?.user;

  // Fetch incoming friend requests
  const { data: requestsData, isLoading } = useQuery({
    queryKey: ["friendRequests"],
    queryFn: async () => {
      const res = await axiosInstance.get('/users/friend-request');
      return res.data;
    },
  });

  // Fetch outgoing friend requests
  const { data: outgoingRequests, isLoading: loadingOutgoing } = useQuery({
    queryKey: ["outgoingRequests"],
    queryFn: async () => {
      const res = await axiosInstance.get('/users/outgoing-friend-requests');
      return res.data;
    },
  });

  // Accept friend request mutation
  const acceptMutation = useMutation({
    mutationFn: async (requestId) => {
      const res = await axiosInstance.put(`/users/friend-request/${requestId}/accept`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Friend request accepted! 🎉');
      queryClient.invalidateQueries(["friendRequests"]);
      queryClient.invalidateQueries(["authUser"]);
      queryClient.invalidateQueries(["allUsers"]);
      queryClient.invalidateQueries(["myFriends"]);
      queryClient.invalidateQueries(["outgoingRequests"]);
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Failed to accept request');
    },
  });

  // Reject friend request mutation
  const rejectMutation = useMutation({
    mutationFn: async (requestId) => {
      const res = await axiosInstance.put(`/users/friend-request/${requestId}/reject`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Friend request rejected');
      queryClient.invalidateQueries(["friendRequests"]);
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Failed to reject request');
    },
  });

  const incomingRequests = requestsData?.incomingRequests || [];
  const acceptedRequests = requestsData?.acceptedRequests || [];
  const pendingOutgoing = outgoingRequests || [];

  return (
    <div className="min-h-screen bg-base-200">
      {/* Header */}
      <header className="bg-base-100 border-b border-base-300 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/')}
                className="btn btn-ghost btn-circle"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-3xl font-bold">🔔 Notifications</h1>
                <p className="text-sm opacity-60">Manage your friend requests</p>
              </div>
            </div>
            <div className="badge badge-primary badge-lg">
              {incomingRequests.length} New
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="tabs tabs-boxed mb-8 bg-base-100 p-2">
          <button
            onClick={() => setActiveTab('incoming')}
            className={`tab tab-lg ${activeTab === 'incoming' ? 'tab-active' : ''}`}
          >
            <span className="mr-2">📥</span>
            Incoming ({incomingRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('outgoing')}
            className={`tab tab-lg ${activeTab === 'outgoing' ? 'tab-active' : ''}`}
          >
            <span className="mr-2">📤</span>
            Sent ({pendingOutgoing.length})
          </button>
          <button
            onClick={() => setActiveTab('accepted')}
            className={`tab tab-lg ${activeTab === 'accepted' ? 'tab-active' : ''}`}
          >
            <span className="mr-2">✅</span>
            Accepted ({acceptedRequests.length})
          </button>
        </div>

        {/* Incoming Requests Tab */}
        {activeTab === 'incoming' && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12">
                <span className="loading loading-spinner loading-lg text-primary"></span>
              </div>
            ) : incomingRequests.length > 0 ? (
              incomingRequests.map((request) => (
                <div
                  key={request._id}
                  className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all"
                >
                  <div className="card-body">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="avatar">
                          <div className="w-16 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                            <img
                              src={request.sender.profilePic || 'https://avatar.iran.liara.run/public/1'}
                              alt={request.sender.fullName}
                            />
                          </div>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold">{request.sender.fullName}</h3>
                          <p className="text-sm opacity-60">{request.sender.email}</p>
                          <div className="flex items-center space-x-3 mt-2 text-sm opacity-70">
                            <span>🌍 {request.sender.location || 'Earth'}</span>
                            <span>•</span>
                            <span>💬 {request.sender.nativeLanguage || 'English'}</span>
                          </div>
                          <p className="text-xs opacity-50 mt-2">
                            {new Date(request.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col space-y-2">
                        <button
                          onClick={() => acceptMutation.mutate(request._id)}
                          disabled={acceptMutation.isPending}
                          className="btn btn-success btn-sm"
                        >
                          {acceptMutation.isPending ? (
                            <span className="loading loading-spinner loading-xs"></span>
                          ) : (
                            <>✓ Accept</>
                          )}
                        </button>
                        <button
                          onClick={() => rejectMutation.mutate(request._id)}
                          disabled={rejectMutation.isPending}
                          className="btn btn-error btn-sm"
                        >
                          {rejectMutation.isPending ? (
                            <span className="loading loading-spinner loading-xs"></span>
                          ) : (
                            <>✕ Reject</>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 card bg-base-100 shadow-xl">
                <div className="card-body">
                  <div className="text-6xl mb-4">📭</div>
                  <p className="text-xl font-semibold opacity-60">No incoming friend requests</p>
                  <p className="text-sm opacity-40">When someone sends you a friend request, it will appear here</p>
                  <button
                    onClick={() => navigate('/')}
                    className="btn btn-primary mt-4"
                  >
                    Discover People
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Outgoing Requests Tab */}
        {activeTab === 'outgoing' && (
          <div className="space-y-4">
            {loadingOutgoing ? (
              <div className="text-center py-12">
                <span className="loading loading-spinner loading-lg text-primary"></span>
              </div>
            ) : pendingOutgoing.length > 0 ? (
              pendingOutgoing.map((request) => (
                <div
                  key={request._id}
                  className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all"
                >
                  <div className="card-body">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="avatar">
                          <div className="w-16 rounded-full ring ring-warning ring-offset-base-100 ring-offset-2">
                            <img
                              src={request.recipient.profilePic || 'https://avatar.iran.liara.run/public/1'}
                              alt={request.recipient.fullName}
                            />
                          </div>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold">{request.recipient.fullName}</h3>
                          <p className="text-sm opacity-60">{request.recipient.email}</p>
                          <div className="flex items-center space-x-3 mt-2 text-sm opacity-70">
                            <span>🌍 {request.recipient.location || 'Earth'}</span>
                            <span>•</span>
                            <span>💬 {request.recipient.nativeLanguage || 'English'}</span>
                          </div>
                          <p className="text-xs opacity-50 mt-2">
                            Sent on {new Date(request.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="badge badge-warning badge-lg">Pending</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 card bg-base-100 shadow-xl">
                <div className="card-body">
                  <div className="text-6xl mb-4">📤</div>
                  <p className="text-xl font-semibold opacity-60">No pending sent requests</p>
                  <p className="text-sm opacity-40">Friend requests you send will appear here</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Accepted Requests Tab */}
        {activeTab === 'accepted' && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12">
                <span className="loading loading-spinner loading-lg text-primary"></span>
              </div>
            ) : acceptedRequests.length > 0 ? (
              acceptedRequests.map((request) => {
                // Determine who the friend is (the other person in the request)
                const friend = request.sender._id === user?._id ? request.recipient : request.sender;
                
                return (
                  <div
                    key={request._id}
                    className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all"
                  >
                    <div className="card-body">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="avatar">
                            <div className="w-16 rounded-full ring ring-success ring-offset-base-100 ring-offset-2">
                              <img
                                src={friend.profilePic || 'https://avatar.iran.liara.run/public/1'}
                                alt={friend.fullName}
                              />
                            </div>
                          </div>
                          <div>
                            <h3 className="text-xl font-bold">{friend.fullName}</h3>
                            <p className="text-sm opacity-60">{friend.email}</p>
                            <div className="flex items-center space-x-3 mt-2 text-sm opacity-70">
                              <span>🌍 {friend.location || 'Earth'}</span>
                              <span>•</span>
                              <span>💬 {friend.nativeLanguage || 'English'}</span>
                            </div>
                            <p className="text-xs opacity-50 mt-2">
                              Became friends on {new Date(request.updatedAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="badge badge-success badge-lg">✓ Friends</div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 card bg-base-100 shadow-xl">
                <div className="card-body">
                  <div className="text-6xl mb-4">✅</div>
                  <p className="text-xl font-semibold opacity-60">No accepted requests yet</p>
                  <p className="text-sm opacity-40">Accepted friend requests will appear here</p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default NotificationPage