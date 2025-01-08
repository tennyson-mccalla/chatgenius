import React from 'react';

function ChannelList({ channels, selectedChannel, onSelectChannel }) {
  return (
    <div className="mt-2 space-y-1">
      {channels.map(channel => (
        <button
          key={channel.id}
          onClick={() => onSelectChannel(channel.id)}
          className="w-full text-[#C4B4C5] hover:bg-[#522653] px-2 py-1 rounded text-left flex items-center"
        >
          <span className="mr-2">#</span>
          <span>{channel.name}</span>
        </button>
      ))}
    </div>
  );
}

export default ChannelList;
