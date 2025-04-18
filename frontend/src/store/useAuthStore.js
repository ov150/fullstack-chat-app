import { create } from 'zustand';
import { axiosInstance } from '../lib/axios.js';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';

const BASE_URL = import.meta.env.MODE === 'development' ? 'http://localhost:5001' : '/';

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,
  activeUsers: [],
  incomingCall: null,
  callAccepted: false,
  callerSignal: null,
  callerId: null,

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get('/auth/check');
      set({ authUser: res.data });
      get().connectSocket();
    } catch (error) {
      console.log('Error in checkAuth:', error);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post('/auth/signup', data);
      set({ authUser: res.data });
      toast.success('Account created successfully');
      get().connectSocket();
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post('/auth/login', data);
      set({ authUser: res.data });
      toast.success('Logged in successfully');
      get().connectSocket();
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post('/auth/logout');
      set({ authUser: null, activeUsers: [], incomingCall: null, callAccepted: false });
      toast.success('Logged out successfully');
      get().disconnectSocket();
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put('/auth/update-profile', data);
      set({ authUser: res.data });
      toast.success('Profile updated successfully');
    } catch (error) {
      console.log('error in update profile:', error);
      toast.error(error.response.data.message);
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  connectSocket: () => {
    const { authUser } = get();
    if (!authUser || get().socket?.connected) return;

    const socket = io(BASE_URL, {
      query: {
        userId: authUser._id,
      },
    });
    socket.connect();

    set({ socket });

    socket.emit('register', authUser.fullName);

    socket.on('getOnlineUsers', (userIds) => {
      console.log('Received online users:', userIds);
      set({ onlineUsers: userIds });
    });

    socket.on('activeUsers', (users) => {
      console.log('Received active users:', users);
      set({ activeUsers: users });
    });

    socket.on('incomingCall', ({ from, signal, callerName }) => {
      console.log('Incoming call received:', { from, signal, callerName });
      set({ incomingCall: { from, callerName }, callerSignal: signal, callerId: from });
    });

    socket.on('callAccepted', ({ signal }) => {
      console.log('Call accepted signal received:', signal);
      set({ callAccepted: true });
    });
  },

  disconnectSocket: () => {
    if (get().socket?.connected) get().socket.disconnect();
    set({ socket: null, activeUsers: [], incomingCall: null, callAccepted: false });
  },

  resetCallState: () => {
    set({ incomingCall: null, callAccepted: false, callerSignal: null, callerId: null });
  },

  answerCall: () => {
    console.log('Answer call triggered');
    // No state update here; handled in VideoCall
  },

  setCallAccepted: (value) => {
    set({ callAccepted: value });
  },
}));