import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import { useThemeStore } from './store/useThemeStore';
import { Loader } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import Peer from 'simple-peer';

import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import SignUpPage from './pages/SignUpPage';
import LoginPage from './pages/LoginPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import VideoCall from './components/VideoCall';

const App = () => {
  const { authUser, checkAuth, isCheckingAuth, socket, incomingCall } = useAuthStore();
  const { theme } = useThemeStore();
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [callData, setCallData] = useState(null);
  const [stream, setStream] = useState(null);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const startCall = async (userId) => {
    try {
      // Initialize stream if not already available
      let localStream = stream;
      if (!localStream) {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setStream(localStream);
      }

      const peer = new Peer({
        initiator: true,
        trickle: false,
        stream: localStream,
      });

      peer.on('signal', (data) => {
        if (socket) {
          console.log("Sending call signal to:", userId);
          socket.emit('callUser', {
            to: userId,
            from: socket.id,
            signal: data,
          });
        }
      });

      peer.on('stream', (remoteStream) => {
        console.log("Received remote stream in caller");
        const remoteVideo = document.querySelector('video#remote-video');
        if (remoteVideo) {
          remoteVideo.srcObject = remoteStream;
        }
      });

      peer.on('error', (err) => {
        console.error("Peer error in caller:", err);
        handleCloseVideoCall();
      });

      socket.on('callAccepted', ({ signal }) => {
        console.log("Call accepted, signaling peer with:", signal);
        peer.signal(signal);
      });

      setCallData({ peer, userId });
      setShowVideoCall(true);
    } catch (err) {
      console.error('Error starting call:', err);
      alert('Failed to start the call. Please ensure camera and microphone permissions are granted.');
    }
  };

  // Initialize stream for incoming calls
  useEffect(() => {
    if (incomingCall && !stream) {
      const startStream = async () => {
        try {
          const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          setStream(mediaStream);
        } catch (err) {
          console.error('Error accessing media devices:', err.name, err.message);
          alert('Please grant camera and microphone permissions to proceed with the call.');
        }
      };
      startStream();
    }
  }, [incomingCall]);

  const handleCloseVideoCall = () => {
    setShowVideoCall(false);
    if (callData?.peer) {
      callData.peer.destroy();
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCallData(null);
  };

  if (isCheckingAuth && !authUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div data-theme={theme} className="min-h-screen bg-base-200">
      <Navbar />
      <Routes>
        <Route
          path="/"
          element={
            authUser ? <HomePage onStartCall={startCall} /> : <Navigate to="/login" />
          }
        />
        <Route
          path="/signup"
          element={!authUser ? <SignUpPage /> : <Navigate to="/" />}
        />
        <Route
          path="/login"
          element={!authUser ? <LoginPage /> : <Navigate to="/" />}
        />
        <Route path="/settings" element={<SettingsPage />} />
        <Route
          path="/profile"
          element={authUser ? <ProfilePage /> : <Navigate to="/login" />}
        />
      </Routes>
      {(showVideoCall || incomingCall) && (
        <VideoCall
          onClose={handleCloseVideoCall}
          stream={stream}
          callData={callData}
          setCallData={setCallData}
        />
      )}
      <Toaster />
    </div>
  );
};

export default App;