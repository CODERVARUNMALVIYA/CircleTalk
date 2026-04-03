const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace(/\/api\/?$/, '');

export const makeAvatarUrl = (seed = 'circlertalk-user') => {
  return `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(seed)}`;
};

export const avatarOptionUrl = (num) => makeAvatarUrl(`avatar-${num}`);

export const resolveProfilePic = (profilePic, fallbackSeed = 'circlertalk-user') => {
  if (!profilePic) {
    return makeAvatarUrl(fallbackSeed);
  }

  if (profilePic.startsWith('http://') || profilePic.startsWith('https://')) {
    return profilePic;
  }

  return `${API_BASE}${profilePic.startsWith('/') ? '' : '/'}${profilePic}`;
};