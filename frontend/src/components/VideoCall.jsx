import { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff } from 'lucide-react';
import Peer from 'simple-peer';
import { useAuthStore } from '../store/useAuthStore';

const VideoCall = ({ onClose, stream, callData, setCallData }) => {
  const { socket, authUser, callAccepted, incomingCall, callerSignal, callerId, resetCallState, setCallAccepted } = useAuthStore();
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [isAnswering, setIsAnswering] = useState(false);

  // Set local stream to video element
  useEffect(() => {
    if (stream && localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Handle incoming call and answer
  useEffect(() => {
    if (incomingCall && !callAccepted && stream && callerSignal && isAnswering) {
      console.log("Handling incoming call from:", incomingCall.callerName);
      handleAnswerCall();
    }
  }, [incomingCall, callAccepted, stream, callerSignal, isAnswering]);

  // Set up peer connection listeners when call is accepted
  useEffect(() => {
    if (!callAccepted || !callData?.peer) return;

    callData.peer.on('stream', (remoteStream) => {
      console.log("Received remote stream");
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    });

    callData.peer.on('error', (err) => {
      console.error("Peer connection error:", err);
      handleEndCall();
    });
  }, [callAccepted, callData]);

  // Listen for endCall event
  useEffect(() => {
    if (socket) {
      socket.on('endCall', () => {
        console.log("Received endCall event");
        handleEndCall();
      });
    }

    return () => {
      if (socket) {
        socket.off('endCall');
      }
    };
  }, [socket]);

  const handleAnswerCall = () => {
    if (!stream || !socket || !callerSignal) {
      console.error("Cannot answer call: Missing stream, socket, or callerSignal", { stream, socket, callerSignal });
      return;
    }

    console.log("Answering call with callerSignal:", callerSignal);
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream,
    });

    peer.on('signal', (data) => {
      console.log("Sending answer signal:", data);
      socket.emit('answerCall', { to: callerId, signal: data });
    });

    peer.on('stream', (remoteStream) => {
      console.log("Received remote stream in answerer");
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    });

    peer.on('error', (err) => {
      console.error("Peer error in answerer:", err);
      handleEndCall();
    });

    try {
      peer.signal(callerSignal);
      setCallData({ peer, userId: callerId });
      setCallAccepted(true); // Update callAccepted state
    } catch (err) {
      console.error("Error signaling peer:", err);
      handleEndCall();
    }
  };

  const handleEndCall = () => {
    if (callData?.peer) {
      callData.peer.destroy();
    }
    if (socket && callData?.userId) {
      socket.emit('endCall', { to: callData.userId });
    }
    setCallData(null);
    setIsAnswering(false);
    resetCallState();
    onClose();
  };

  // Expose a function to trigger answering
  const triggerAnswerCall = () => {
    setIsAnswering(true);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="card bg-base-100 shadow-xl w-full max-w-4xl p-6">
        <h2 className="text-xl font-bold text-center mb-6">
          Video Call with {incomingCall?.callerName || 'User'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col items-center">
            <h3 className="text-base font-medium mb-2">Your Camera</h3>
            <video
              ref={localVideoRef}
              autoPlay
              muted
              className="w-full max-w-md aspect-video rounded-lg border border-base-300 object-cover"
            />
          </div>
          <div className="flex flex-col items-center">
            <h3 className="text-base font-medium mb-2">Remote Camera</h3>
            {callAccepted ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                id="remote-video"
                className="w-full max-w-md aspect-video rounded-lg border border-base-300 object-cover"
              />
            ) : (
              <div className="w-full max-w-md aspect-video bg-base-200 rounded-lg flex items-center justify-center">
                <p className="text-base-content/70">{incomingCall ? 'Waiting for answer...' : 'Connecting...'}</p>
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-center mt-6">
          <button
            onClick={handleEndCall}
            className="btn btn-error flex items-center gap-2"
          >
            <PhoneOff size={20} />
            End Call
          </button>
          {incomingCall && !callAccepted && (
            <button
              onClick={triggerAnswerCall}
              className="btn btn-success flex items-center gap-2 ml-4"
            >
              <Phone size={20} />
              Answer
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoCall;