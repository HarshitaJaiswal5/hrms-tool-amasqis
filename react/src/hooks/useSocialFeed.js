import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useSocket } from '../SocketContext';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const useSocialFeed = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, isLoaded } = useUser();
  const socket = useSocket();

  const getAuthToken = () => {
    if (typeof window !== 'undefined' && window.Clerk) {
      return window.Clerk.session?.getToken();
    }
    return null;
  };

  const fetchTotalPostsCount = async () => {
    try {
      console.log('[fetchTotalPostsCount] Starting fetch...');
      const token = await getAuthToken();
      console.log('[fetchTotalPostsCount] Token obtained, making request...');

      const response = await fetch(`${API_BASE_URL}/api/socialfeed/total-posts-count`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('[fetchTotalPostsCount] Response status:', response.status);
      const data = await response.json();
      console.log('[fetchTotalPostsCount] Response data:', data);

      if (data.done) {
        console.log('[fetchTotalPostsCount] Setting totalPostsCount to:', data.data.totalPosts || 0);
        setTotalPostsCount(data.data.totalPosts || 0);
      } else {
        console.error('Failed to fetch total posts count:', data.error);
      }
    } catch (err) {
      console.error('Error fetching total posts count:', err);
      console.error('Error details:', err.message);
    }
  };

  const fetchTotalBookmarksCount = async () => {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/socialfeed/total-bookmarks-count`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.done) {
        setTotalBookmarksCount(data.data.totalBookmarks || 0);
      } else {
        console.error('Failed to fetch total bookmarks count:', data.error);
      }
    } catch (err) {
      console.error('Error fetching total bookmarks count:', err);
    }
  };

  const fetchCompanyEmployees = async (limit = 10) => {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/socialfeed/company-employees?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.done) {
        setCompanyEmployees(data.data || []);
      } else {
        console.error('Failed to fetch company employees:', data.error);
        setCompanyEmployees([]);
      }
    } catch (err) {
      console.error('Error fetching company employees:', err);
      setCompanyEmployees([]);
    }
  };

  const fetchTopPosters = async (limit = 8) => {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/socialfeed/top-posters?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.done) {
        const uniquePosters = data.data ? data.data.filter((poster, index, self) =>
          index === self.findIndex((p) => p.userId === poster.userId)
        ) : [];
        setTopPosters(uniquePosters);
      } else {
        console.error('Failed to fetch top posters:', data.error);
        setTopPosters([]);
      }
    } catch (err) {
      console.error('Error fetching top posters:', err);
      setTopPosters([]);
    }
  };

  const fetchPosts = async (page = 1, limit = 20) => {
    try {
      setLoading(true);
      const token = await getAuthToken();

      const response = await fetch(`${API_BASE_URL}/api/socialfeed/posts?page=${page}&limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.done) {
        setPosts(data.data || []);
        setError(null);
        await fetchTotalPostsCount();
        await fetchTotalBookmarksCount();
        await fetchCompanyEmployees();
        await fetchTopPosters();
      } else {
        setError(data.error || 'Failed to fetch posts');
      }
    } catch (err) {
      setError('Failed to fetch posts');
      console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const createPost = async (postData) => {
    return new Promise((resolve, reject) => {

      if (!socket) {
        console.error('Socket not connected for createPost');
        reject(new Error('Socket not connected'));
        return;
      }

      if (!socket.connected) {
        console.error('Socket not connected to server');
        reject(new Error('Socket not connected to server'));
        return;
      }

      const timeout = setTimeout(() => {
        socket.off('socialfeed:create-post-response', handleResponse);
        reject(new Error('Create post timeout - no response from server'));
      }, 15000);

      const handleResponse = (response) => {
        clearTimeout(timeout);
        socket.off('socialfeed:create-post-response', handleResponse);
        if (response.done) {
          console.log('Post created successfully via socket');
          resolve(response.data);
        } else {
          console.error('Failed to create post via socket:', response.error);
          reject(new Error(response.error || 'Failed to create post'));
        }
      };

      socket.on('socialfeed:create-post-response', handleResponse);
      socket.emit('socialfeed:create-post', postData);

      setTimeout(() => {
        socket.off('socialfeed:create-post-response', handleResponse);
        reject(new Error('Create post timeout'));
      }, 10000);
    });
  };

  const editPost = async (postId, updateData) => {
    try {
      const token = await getAuthToken();

      const response = await fetch(`${API_BASE_URL}/api/socialfeed/posts/${postId}/edit`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      const data = await response.json();

      if (data.done) {
        setPosts(prevPosts =>
          prevPosts.map(post =>
            post._id === postId ? { ...post, ...data.data } : post
          )
        );
        console.log('Post edited successfully');
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to edit post');
      }
    } catch (error) {
      console.error('Error editing post:', error);
      throw error;
    }
  };

  const toggleLike = async (postId) => {
    return new Promise((resolve, reject) => {
      if (!socket) {
        console.error('Socket not connected for toggleLike');
        reject(new Error('Socket not connected'));
        return;
      }

      if (!socket.connected) {
        console.error('Socket not connected to server');
        reject(new Error('Socket not connected to server'));
        return;
      }

      const handleResponse = (response) => {
        socket.off('socialfeed:toggle-like-response', handleResponse);
        if (response.done) {
          console.log('Like toggled successfully via socket');
          resolve(response.data);
        } else {
          console.error('Failed to toggle like via socket:', response.error);
          reject(new Error(response.error || 'Failed to toggle like'));
        }
      };

      socket.on('socialfeed:toggle-like-response', handleResponse);
      socket.emit('socialfeed:toggle-like', { postId });

      setTimeout(() => {
        socket.off('socialfeed:toggle-like-response', handleResponse);
        reject(new Error('Toggle like timeout'));
      }, 10000);
    });
  };

  const addComment = async (postId, content) => {
    return new Promise((resolve, reject) => {
      if (!socket) {
        console.error('Socket not connected for addComment');
        reject(new Error('Socket not connected'));
        return;
      }

      if (!socket.connected) {
        console.error('Socket not connected to server');
        reject(new Error('Socket not connected to server'));
        return;
      }

      const handleResponse = (response) => {
        socket.off('socialfeed:add-comment-response', handleResponse);
        if (response.done) {
          console.log('Comment added successfully via socket');
          resolve(response.data);
        } else {
          console.error('Failed to add comment via socket:', response.error);
          reject(new Error(response.error || 'Failed to add comment'));
        }
      };

      socket.on('socialfeed:add-comment-response', handleResponse);
      socket.emit('socialfeed:add-comment', { postId, content });

      setTimeout(() => {
        socket.off('socialfeed:add-comment-response', handleResponse);
        reject(new Error('Add comment timeout'));
      }, 10000);
    });
  };

  const toggleCommentLike = async (postId, commentId) => {
    return new Promise((resolve, reject) => {
      if (!socket) {
        console.error('Socket not connected for toggleCommentLike');
        reject(new Error('Socket not connected'));
        return;
      }

      if (!socket.connected) {
        console.error('Socket not connected to server');
        reject(new Error('Socket not connected to server'));
        return;
      }

      const handleResponse = (response) => {
        socket.off('socialfeed:toggle-comment-like-response', handleResponse);
        if (response.done) {
          console.log('Comment like toggled successfully via socket');
          resolve(response.data);
        } else {
          console.error('Failed to toggle comment like via socket:', response.error);
          reject(new Error(response.error || 'Failed to toggle comment like'));
        }
      };

      socket.on('socialfeed:toggle-comment-like-response', handleResponse);
      socket.emit('socialfeed:toggle-comment-like', { postId, commentId });

      setTimeout(() => {
        socket.off('socialfeed:toggle-comment-like-response', handleResponse);
        reject(new Error('Toggle comment like timeout'));
      }, 10000);
    });
  };

  const toggleSavePost = async (postId) => {
    return new Promise((resolve, reject) => {
      if (!socket) {
        console.error('Socket not connected for toggleSavePost');
        reject(new Error('Socket not connected'));
        return;
      }

      if (!socket.connected) {
        console.error('Socket not connected to server');
        reject(new Error('Socket not connected to server'));
        return;
      }

      const handleResponse = (response) => {
        socket.off('socialfeed:toggle-save-post-response', handleResponse);
        if (response.done) {
          console.log('Post save status toggled successfully via socket');
          resolve(response.data);
        } else {
          console.error('Failed to toggle save post via socket:', response.error);
          reject(new Error(response.error || 'Failed to toggle save post'));
        }
      };

      socket.on('socialfeed:toggle-save-post-response', handleResponse);
      socket.emit('socialfeed:toggle-save-post', { postId });

      setTimeout(() => {
        socket.off('socialfeed:toggle-save-post-response', handleResponse);
        reject(new Error('Toggle save post timeout'));
      }, 10000);
    });
  };

  const getSavedPosts = async (page = 1, limit = 20) => {
    try {
      setLoading(true);
      const token = await getAuthToken();

      const response = await fetch(`${API_BASE_URL}/api/socialfeed/saved-posts?page=${page}&limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.done) {
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to fetch saved posts');
      }
    } catch (err) {
      console.error('Error fetching saved posts:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getTrendingHashtags = async (limit = 10) => {
    try {
      const token = await getAuthToken();

      const response = await fetch(`${API_BASE_URL}/api/socialfeed/hashtags/trending?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.done) {
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to fetch trending hashtags');
      }
    } catch (err) {
      console.error('Error fetching trending hashtags:', err);
      throw err;
    }
  };

  const getSuggestedUsers = async (limit = 10) => {
    try {
      const token = await getAuthToken();

      const response = await fetch(`${API_BASE_URL}/api/socialfeed/users/suggested?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.done) {
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to fetch suggested users');
      }
    } catch (err) {
      console.error('Error fetching suggested users:', err);
      throw err;
    }
  };


  const deleteComment = async (postId, commentId) => {
    return new Promise((resolve, reject) => {
      if (!socket) {
        console.error('Socket not connected for deleteComment');
        reject(new Error('Socket not connected'));
        return;
      }

      if (!socket.connected) {
        console.error('Socket not connected to server');
        reject(new Error('Socket not connected to server'));
        return;
      }

      const handleResponse = (response) => {
        socket.off('socialfeed:delete-comment-response', handleResponse);
        if (response.done) {
          console.log('Comment deleted successfully via socket');
          resolve(response.data);
        } else {
          console.error('Failed to delete comment via socket:', response.error);
          reject(new Error(response.error || 'Failed to delete comment'));
        }
      };

      socket.on('socialfeed:delete-comment-response', handleResponse);
      socket.emit('socialfeed:delete-comment', { postId, commentId });

      setTimeout(() => {
        socket.off('socialfeed:delete-comment-response', handleResponse);
        reject(new Error('Delete comment timeout'));
      }, 10000);
    });
  };

  const deletePost = async (postId) => {
    return new Promise((resolve, reject) => {
      if (!socket) {
        console.error('Socket not connected for deletePost');
        reject(new Error('Socket not connected'));
        return;
      }

      if (!socket.connected) {
        console.error('Socket not connected to server');
        reject(new Error('Socket not connected to server'));
        return;
      }

      const handleResponse = (response) => {
        socket.off('socialfeed:delete-post-response', handleResponse);
        if (response.done) {
          console.log('Post deleted successfully via socket');
          resolve(response.data);
        } else {
          console.error('Failed to delete post via socket:', response.error);
          reject(new Error(response.error || 'Failed to delete post'));
        }
      };

      socket.on('socialfeed:delete-post-response', handleResponse);
      socket.emit('socialfeed:delete-post', { postId });

      setTimeout(() => {
        socket.off('socialfeed:delete-post-response', handleResponse);
        reject(new Error('Delete post timeout'));
      }, 10000);
    });
  };

  const addReply = async (postId, commentId, content) => {
    console.log('addReply function called with:', { postId, commentId, content });

    return new Promise((resolve, reject) => {
      if (!socket) {
        console.error('Socket not connected for addReply');
        reject(new Error('Socket not connected'));
        return;
      }

      if (!socket.connected) {
        console.error('Socket not connected to server');
        reject(new Error('Socket not connected to server'));
        return;
      }

      const handleResponse = (response) => {
        socket.off('socialfeed:add-reply-response', handleResponse);
        if (response.done) {
          console.log('Reply added successfully via socket');
          resolve(response.data);
        } else {
          console.error('Failed to add reply via socket:', response.error);
          reject(new Error(response.error || 'Failed to add reply'));
        }
      };

      socket.on('socialfeed:add-reply-response', handleResponse);
      console.log('Emitting add-reply with data:', { postId, commentId, content });
      socket.emit('socialfeed:add-reply', { postId, commentId, content });

      setTimeout(() => {
        socket.off('socialfeed:add-reply-response', handleResponse);
        reject(new Error('Add reply timeout'));
      }, 10000);
    });
  };

  const toggleReplyLike = async (postId, commentId, replyId) => {
    return new Promise((resolve, reject) => {
      if (!socket) {
        console.error('Socket not connected for toggleReplyLike');
        reject(new Error('Socket not connected'));
        return;
      }

      if (!socket.connected) {
        console.error('Socket not connected to server');
        reject(new Error('Socket not connected to server'));
        return;
      }

      const handleResponse = (response) => {
        socket.off('socialfeed:toggle-reply-like-response', handleResponse);
        if (response.done) {
          console.log('Reply like toggled successfully via socket');
          resolve(response.data);
        } else {
          console.error('Failed to toggle reply like via socket:', response.error);
          reject(new Error(response.error || 'Failed to toggle reply like'));
        }
      };

      socket.on('socialfeed:toggle-reply-like-response', handleResponse);
      socket.emit('socialfeed:toggle-reply-like', { postId, commentId, replyId });

      setTimeout(() => {
        socket.off('socialfeed:toggle-reply-like-response', handleResponse);
        reject(new Error('Toggle reply like timeout'));
      }, 10000);
    });
  };

  const [userProfile, setUserProfile] = useState({
    name: 'Loading...',
    username: '@user',
    avatar: 'assets/img/users/user-11.jpg',
    avatarIsExternal: false,
    followers: 0,
    following: 0,
    posts: 0
  });

  const [totalPostsCount, setTotalPostsCount] = useState(0);
  const [totalBookmarksCount, setTotalBookmarksCount] = useState(0);
  const [companyEmployees, setCompanyEmployees] = useState([]);
  const [topPosters, setTopPosters] = useState([]);

  const fetchUserProfile = async () => {
    if (!isLoaded || !user) return;

    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/socialfeed/users/profile/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.done) {
        setUserProfile(prev => ({
          ...data.data,
          name: data.data.name || prev.name,
          username: data.data.username || prev.username,
          avatar: data.data.avatar || prev.avatar,
          avatarIsExternal: data.data.avatarIsExternal ?? prev.avatarIsExternal,
          followers: data.data.followers || 0,
          following: data.data.following || 0,
          posts: data.data.posts || 0
        }));
      } else {
        console.error('Failed to fetch user profile:', data.error);
        const userPostsCount = posts.filter(post => post.userId === user.id).length;
        setUserProfile(prev => ({
          ...prev,
          posts: userPostsCount
        }));
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      const userPostsCount = posts.filter(post => post.userId === user.id).length;
      setUserProfile(prev => ({
        ...prev,
        posts: userPostsCount
      }));
    }
  };

  const getCurrentUserProfile = () => {
    return userProfile;
  };

  useEffect(() => {
    if (socket) {
      socket.on('socialfeed:newPost', (data) => {
        if (data.done && data.data) {
          console.log('New post received via socket:', data.data);
          setPosts(prevPosts => [data.data, ...prevPosts]);
          setTotalPostsCount(prev => prev + 1);
        }
      });

      socket.on('socialfeed:postUpdate', (data) => {
        if (data.done && data.data) {
          console.log('Post update received via socket:', data.data);
          setPosts(prevPosts =>
            prevPosts.map(post =>
              post._id === data.data._id ? data.data : post
            )
          );
          fetchTotalBookmarksCount();
        }
      });

      socket.on('socialfeed:postDeleted', (data) => {
        if (data.done && data.data?.postId) {
          console.log('Post deleted via socket:', data.data.postId);
          setPosts(prevPosts =>
            prevPosts.filter(post => post._id !== data.data.postId)
          );
          setTotalPostsCount(prev => prev - 1);
        }
      });

      socket.on('socialfeed:error', (error) => {
        console.error('Social feed error:', error);
        setError(error.error || 'Social feed error occurred');
      });

      return () => {
        socket.off('socialfeed:newPost');
        socket.off('socialfeed:postUpdate');
        socket.off('socialfeed:postDeleted');
        socket.off('socialfeed:error');
      };
    }
  }, [socket]);

  useEffect(() => {
    if (isLoaded) {
      fetchPosts();
      fetchUserProfile();
    }
  }, [isLoaded]);

  useEffect(() => {
    if (isLoaded && user) {
      if (!userProfile.name || userProfile.name === 'Loading...') {
        const userPostsCount = posts.filter(post => post.userId === user.id).length;
        setUserProfile(prev => ({
          ...prev,
          posts: userPostsCount
        }));
      }
    }
  }, [posts.length, user?.id, isLoaded, userProfile.name]);

  return {
    posts,
    loading,
    error,
    totalPostsCount,
    totalBookmarksCount,
    companyEmployees,
    topPosters,
    fetchPosts,
    createPost,
    editPost,
    toggleLike,
    addComment,
    addReply: useCallback(addReply, []),
    toggleReplyLike,
    toggleCommentLike: useCallback(toggleCommentLike, []),
    toggleSavePost: useCallback(toggleSavePost, []),
    getSavedPosts: useCallback(getSavedPosts, []),
    getTrendingHashtags: useCallback(getTrendingHashtags, []),
    getSuggestedUsers: useCallback(getSuggestedUsers, []),
    deleteComment: useCallback(deleteComment, []),
    deletePost: useCallback(deletePost, []),
    getCurrentUserProfile
  };
};
