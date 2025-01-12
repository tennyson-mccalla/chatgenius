import { ChatLayout } from '../components/Layout/ChatLayout';
import { Sidebar } from '../components/Sidebar/Sidebar';
import { ChatArea } from '../components/Chat/ChatArea';

export const ChatPage = () => {
  return (
    <ChatLayout
      sidebar={<Sidebar />}
      content={<ChatArea />}
    />
  );
};
