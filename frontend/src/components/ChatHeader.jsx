import { X, Video } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';

const ChatHeader = ({ onStartCall }) => {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { onlineUsers } = useAuthStore();

  return (
    <div className="p-2.5 border-b border-base-300 bg-base-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="avatar">
            <div className="w-10 h-10 rounded-full relative">
              <img src={selectedUser.profilePic || '/avatar.png'} alt={selectedUser.fullName} />
            </div>
          </div>
          <div>
            <h3 className="font-medium text-base-content">{selectedUser.fullName}</h3>
            <p className="text-sm text-base-content/70">
              {onlineUsers.includes(selectedUser._id) ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onStartCall(selectedUser._id)}
            className="btn btn-primary btn-sm flex items-center gap-1"
          >
            <Video size={16} />
            Call
          </button>
          <button
            onClick={() => setSelectedUser(null)}
            className="btn btn-error btn-sm"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;