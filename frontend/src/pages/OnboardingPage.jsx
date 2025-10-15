import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { axiosInstance } from '../lib/axios'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

const OnboardingPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch current user
  const { data: authData, isLoading } = useQuery({
    queryKey: ["authUser"],
    queryFn: async () => {
      const res = await axiosInstance.get('/auth/me');
      return res.data;
    },
  });

  const user = authData?.user;

  // Form states
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [nativeLanguage, setNativeLanguage] = useState('English');
  const [learningLanguages, setLearningLanguages] = useState([]);
  const [interests, setInterests] = useState([]);
  const [selectedAvatar, setSelectedAvatar] = useState(null);

  // Set initial values when user data loads
  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setBio(user.bio || '');
      setLocation(user.location || '');
      setNativeLanguage(user.nativeLanguage || 'English');
      setLearningLanguages(user.learningLanguages || []);
      setInterests(user.interests || []);
    }
  }, [user]);

  const languages = [
    'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese',
    'Russian', 'Chinese', 'Japanese', 'Korean', 'Arabic', 'Hindi',
    'Bengali', 'Urdu', 'Turkish', 'Dutch', 'Swedish', 'Other'
  ];

  const interestOptions = [
    '🎬 Movies', '🎵 Music', '📚 Reading', '✈️ Travel', '🍳 Cooking',
    '⚽ Sports', '🎮 Gaming', '🎨 Art', '📸 Photography', '💻 Technology',
    '🧘 Yoga', '🏋️ Fitness', '🌱 Nature', '🐾 Pets', '🎭 Theater',
    '🎸 Guitar', '✍️ Writing', '🧩 Puzzles'
  ];

  const avatarOptions = Array.from({ length: 50 }, (_, i) => i + 1);

  // Update profile mutation
  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const res = await axiosInstance.put('/auth/update-profile', data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Profile updated successfully! 🎉');
      queryClient.invalidateQueries(["authUser"]);
      navigate('/');
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Failed to update profile');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!fullName.trim()) {
      toast.error('Please enter your full name');
      return;
    }

    const updateData = {
      fullName: fullName.trim(),
      bio: bio.trim(),
      location: location.trim(),
      nativeLanguage,
      learningLanguages,
      interests,
      isOnboarded: true
    };

    if (selectedAvatar) {
      updateData.profilePic = `https://avatar.iran.liara.run/public/${selectedAvatar}`;
    }

    updateMutation.mutate(updateData);
  };

  const toggleLearningLanguage = (lang) => {
    if (learningLanguages.includes(lang)) {
      setLearningLanguages(learningLanguages.filter(l => l !== lang));
    } else {
      setLearningLanguages([...learningLanguages, lang]);
    }
  };

  const toggleInterest = (interest) => {
    if (interests.includes(interest)) {
      setInterests(interests.filter(i => i !== interest));
    } else {
      setInterests([...interests, interest]);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20">
      {/* Header */}
      <header className="bg-base-100/80 backdrop-blur-lg border-b border-base-300 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
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
                <h1 className="text-3xl font-bold">✨ Complete Your Profile</h1>
                <p className="text-sm opacity-60">Let others know more about you</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Profile Picture Section */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body p-4 sm:p-6">
              <h2 className="card-title text-xl sm:text-2xl mb-4">👤 Profile Picture</h2>
              <div className="flex flex-col sm:flex-row items-center sm:space-x-6 space-y-4 sm:space-y-0 mb-4">
                <div className="avatar">
                  <div className="w-20 sm:w-24 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                    <img
                      src={selectedAvatar 
                        ? `https://avatar.iran.liara.run/public/${selectedAvatar}`
                        : user?.profilePic || 'https://avatar.iran.liara.run/public/1'
                      }
                      alt="Profile"
                    />
                  </div>
                </div>
                <div className="text-center sm:text-left">
                  <p className="font-semibold text-base sm:text-lg">{user?.fullName}</p>
                  <p className="text-xs sm:text-sm opacity-60">{user?.email}</p>
                  <p className="text-xs opacity-50 mt-1">Choose an avatar below</p>
                </div>
              </div>
              
              <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 max-h-48 overflow-y-auto p-2 bg-base-200 rounded-lg">
                {avatarOptions.map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setSelectedAvatar(num)}
                    className={`relative rounded-full border-2 transition-all transform hover:scale-110 ${
                      selectedAvatar === num
                        ? 'border-primary shadow-lg scale-110 ring-2 ring-primary'
                        : 'border-base-300 hover:border-primary'
                    }`}
                  >
                    <img
                      src={`https://avatar.iran.liara.run/public/${num}`}
                      alt={`Avatar ${num}`}
                      className="w-full h-full rounded-full"
                    />
                    {selectedAvatar === num && (
                      <div className="absolute -top-1 -right-1 bg-primary rounded-full p-1">
                        <svg className="w-3 h-3 text-primary-content" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Basic Info Section */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body p-4 sm:p-6">
              <h2 className="card-title text-xl sm:text-2xl mb-4">📝 Basic Information</h2>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Full Name</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input input-bordered"
                  required
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Bio</span>
                </label>
                <textarea
                  placeholder="Tell us about yourself..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="textarea textarea-bordered h-24"
                  maxLength={200}
                />
                <label className="label">
                  <span className="label-text-alt opacity-60">{bio.length}/200 characters</span>
                </label>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Location</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., New York, USA"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="input input-bordered"
                />
              </div>
            </div>
          </div>

          {/* Language Section */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body p-4 sm:p-6">
              <h2 className="card-title text-xl sm:text-2xl mb-4">🌍 Languages</h2>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Native Language</span>
                </label>
                <select
                  value={nativeLanguage}
                  onChange={(e) => setNativeLanguage(e.target.value)}
                  className="select select-bordered"
                >
                  {languages.map((lang) => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>

              <div className="form-control mt-4">
                <label className="label">
                  <span className="label-text font-semibold">Learning Languages (Optional)</span>
                  <span className="label-text-alt opacity-60">{learningLanguages.length} selected</span>
                </label>
                <div className="flex flex-wrap gap-2 p-4 bg-base-200 rounded-lg">
                  {languages.map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => toggleLearningLanguage(lang)}
                      className={`btn btn-sm ${
                        learningLanguages.includes(lang)
                          ? 'btn-primary'
                          : 'btn-ghost'
                      }`}
                    >
                      {lang}
                      {learningLanguages.includes(lang) && ' ✓'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Interests Section */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body p-4 sm:p-6">
              <h2 className="card-title text-xl sm:text-2xl mb-4">❤️ Interests & Hobbies</h2>
              <label className="label">
                <span className="label-text opacity-60">Select your interests (Optional)</span>
                <span className="label-text-alt opacity-60">{interests.length} selected</span>
              </label>
              <div className="flex flex-wrap gap-2 p-4 bg-base-200 rounded-lg">
                {interestOptions.map((interest) => (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    className={`btn btn-sm ${
                      interests.includes(interest)
                        ? 'btn-secondary'
                        : 'btn-ghost'
                    }`}
                  >
                    {interest}
                    {interests.includes(interest) && ' ✓'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="card bg-gradient-to-r from-primary to-secondary shadow-xl">
            <div className="card-body p-4 sm:p-6">
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="btn btn-lg btn-primary w-full text-base sm:text-lg"
              >
                {updateMutation.isPending ? (
                  <>
                    <span className="loading loading-spinner"></span>
                    Saving...
                  </>
                ) : (
                  <>
                    💾 Save Profile & Continue
                  </>
                )}
              </button>
              <p className="text-center text-sm opacity-60 mt-2">
                You can always update your profile later from settings
              </p>
            </div>
          </div>
        </form>
      </main>
    </div>
  )
}

export default OnboardingPage