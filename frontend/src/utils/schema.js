// Firestore Database Schema

const schema = {
  // Existing collections
  channels: {
    id: 'string',
    name: 'string',
    createdAt: 'timestamp',
    messages: [{
      id: 'string',
      text: 'string',
      user: {
        uid: 'string',
        name: 'string',
        photoURL: 'string'
      },
      timestamp: 'timestamp'
    }]
  },

  // New collections
  directMessages: {
    id: 'string',
    participants: ['string'], // array of user IDs
    lastMessage: 'timestamp',
    createdAt: 'timestamp'
  },

  threads: {
    id: 'string',
    parentMessageId: 'string',
    messages: [{
      id: 'string',
      text: 'string',
      user: {
        uid: 'string',
        name: 'string',
        photoURL: 'string'
      },
      timestamp: 'timestamp'
    }]
  },

  reactions: {
    messageId: 'string',
    emoji: 'string',
    users: ['string'] // array of user IDs who reacted
  },

  files: {
    id: 'string',
    url: 'string',
    name: 'string',
    type: 'string',
    size: 'number',
    uploadedBy: 'string', // user ID
    messageId: 'string'
  }
};

export default schema;
