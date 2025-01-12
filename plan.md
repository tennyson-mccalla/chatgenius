# plan.md

Below is a **step-by-step outline** of how a junior developer might build a Slack-like MVP with all the features discussed. The instructions are broken into **phases** and **atomic tasks** that can be tackled one at a time. **No code** is shown; where needed, brief **pseudocode** is used to illustrate logic without providing actual code syntax.

---

## Phase 1: Project Setup & Basic Structure

1. **Initialize the Project**
   - Create a new folder for your project.
   - Initialize version control (e.g., Git).
   - Initialize a package manager configuration (e.g., `package.json` if using Node).
   - Decide on a simple folder structure:
     ```
     project-root/
       |- client/    (React or Next.js front end)
       |- server/    (Node.js/Express back end)
       |- scripts/   (optional utilities, e.g., database migrations)
     ```

2. **Install Core Dependencies**
   - Install necessary libraries for the server (e.g., Express, a real-time library, and database connectors).
   - Install necessary libraries for the client (e.g., React, a UI framework or Next.js).

3. **Set Up Environment Variables**
   - Create a `.env` (or similar) file for credentials (e.g., database URL, AWS keys).
   - Make sure this file is **ignored** by version control (for security).

4. **Plan Your Database**
   - Choose a database type (PostgreSQL or MongoDB).
   - Decide if you will do a local install or a cloud-based service (e.g., AWS RDS, MongoDB Atlas).
   - Sketch out tables/collections for **Users**, **Channels**, **Messages**, **Threads (optional if separate)**, **Reactions**, etc.

---

## Phase 2: Authentication & User Management

1. **Decide on the Auth Method**
   - You want **email/password** + **OAuth** (Google, GitHub, Apple) + **guest login**.
   - Plan how to store user records (e.g., in a `users` table or collection).

2. **Email/Password Flow**
   - Create a registration flow that:
     - Takes `email`, `password`, and (optionally) `username`.
     - Hashes the password (e.g., using bcrypt).
     - Stores a new user record in the database.
   - Create a login flow that:
     - Checks the hashed password.
     - Issues a session token or JWT.
   - **Pseudocode** (not real code, just logic):
     ```
     onRegister(email, password, username):
       hashedPW = hash(password)
       createUserRecord(email, hashedPW, username)
       return success

     onLogin(email, password):
       user = findUserByEmail(email)
       if compareHash(password, user.hashedPW):
         token = generateToken(user.id)
         return token
       else:
         return error
     ```

3. **OAuth Flow**
   - Use a library or a built-in method for handling Google, GitHub, and Apple sign-in.
   - Store the user’s OAuth ID to avoid duplicate accounts.
   - On successful OAuth login, create or update the user record with the provider’s unique ID.

4. **Guest Login**
   - For guest users, prompt for a simple `username`.
   - Mark them as “guest” in the DB.
   - Generate a temporary user record with minimal fields (e.g., no password, a “guest” flag set to `true`).

5. **Middleware to Protect Routes**
   - Write a small function that checks if a user is authenticated via session token or JWT.
   - This ensures only logged-in users can access certain routes.

---

## Phase 3: Channels, DMs & Basic Real-Time Messaging

1. **Channel Creation & Listing**
   - Create a route or function for **creating a channel** (e.g., `name`, `is_private`).
   - Create a route or function for **listing channels**.
   - For private channels, store the user IDs who are members.

2. **DM (Direct Messages) Setup**
   - Decide on how you represent a DM conversation (e.g., a “dm_conversation” table or a “channel” with a special “DM” flag).
   - Create or retrieve a DM conversation when two users first interact.

3. **Real-Time Library Integration**
   - Integrate a library (e.g., Socket.IO) in the server and the client.
   - Configure the server to accept a connection and authenticate the user (using the token from the handshake).
   - Have the client connect to the server on page load or on login.

4. **Basic Messaging Flow**
   - **Server side**: Listen for an incoming message event, save the message to the DB, then broadcast it to the right channel or DM room.
   - **Client side**: On success, display the new message in the chat window.
   - **Pseudocode** for the server logic:
     ```
     onNewMessage(data):
       // data might include { channelId, userId, text }
       newMessage = createMessageRecord(data)
       emitToRoom(channelId, "newMessage", newMessage)
     ```

5. **Join Rooms**
   - When a user opens a channel/DM, have the client tell the server to “join” that channel/DM room.
   - The server then adds the user’s socket to a room (identified by the channel or DM ID).

---

## Phase 4: Presence & Status (Online/Offline/Away)

1. **Tracking Connections**
   - On server start, maintain a dictionary or map of `userId -> connectionCount` (how many sockets the user has open).
   - When the user connects, increment the count; when they disconnect, decrement.
   - If count > 0, user is “online”; if count = 0, user is “offline.”

2. **Broadcast Presence**
   - When a user goes from `offline` to `online` or vice versa, broadcast an event to relevant channels or DMs.
   - The client then updates the user’s status in the UI.

3. **Away Status** (Optional)
   - If you want away status, track idle time on the client (or a “last activity” timestamp) and send an update after a certain interval of inactivity.

---

## Phase 5: Threading (One-Level Replies) & Inline Display

1. **Data Model**
   - In the `messages` table/collection, add a `parent_message_id` field.
   - If `parent_message_id` is `null`, it’s a top-level message; otherwise, it’s a reply.

2. **Save a Reply**
   - When the user replies to a specific message, the client sends `channelId`, `text`, and the `parent_message_id` of the message being replied to.
   - The server stores this new message with the `parent_message_id` set.

3. **Inline Display**
   - On the client, for each top-level message, fetch or filter its replies.
   - Show them indented, collapsed, or however you prefer.
   - **Pseudocode** for client logic:
     ```
     for each message in messages:
       if message.parent_message_id is null:
         display message
         replies = messages.filter(m => m.parent_message_id === message.id)
         display replies inline
     ```

---

## Phase 6: Emoji Reactions (3 Reactions per User)

1. **Reaction Table**
   - A table or collection named `reactions` with fields:
     - `id`
     - `message_id`
     - `user_id`
     - `emoji_type` (could be a string for the Unicode, e.g., “:smile:”)

2. **Limit to 3 Reactions per User/Message**
   - Before creating a new reaction record, count how many reactions that user has on that message.
   - If it’s >= 3, reject. Otherwise, create the new reaction record.

3. **UI for Reacting**
   - When the user clicks an emoji icon, send an event (e.g., “addReaction”) with `messageId`, `userId`, `emoji`.
   - Update the reaction count in real time for that message.

4. **Remove Reaction (Optional)**
   - If you want users to remove a reaction, you can have a route or function that deletes the `reactions` record.

---

## Phase 7: File Sharing & Basic Search

1. **File Upload**
   - **Server**: Configure an endpoint that accepts a multipart upload.
   - **Upload to AWS S3**:
     - Get the file from the request.
     - Send it to S3.
     - Store the resulting file URL in a “files” table or as part of the message.
   - Return the URL to the client so it can show a preview or link.

2. **Search**
   - Create a basic search endpoint:
     - Accept query params like `channelId`, `userId`, `text`.
     - Query messages by these parameters (using partial matching on `text`).
   - Return a list of matching messages.
   - Enhance if needed with advanced full-text search or indexing, but start with the simplest approach.

---

## Phase 8: Deployment & Admin Options

1. **Set Up a Cloud Service**
   - Pick a hosting solution (e.g., AWS, Heroku, Render, Supabase).
   - Create a new project on that platform.

2. **Provision the Database**
   - If using RDS (Postgres) on AWS, create a DB instance.
   - Or use a managed DB like Heroku Postgres, Supabase, etc.

3. **Connect the App to the Database**
   - Update your `.env` with the DB connection info.
   - Run any necessary schema migrations or create tables/collections.

4. **Set Up S3 for File Storage**
   - Create an S3 bucket.
   - Configure access keys or IAM roles so your server can upload.
   - In your `.env`, store AWS credentials (or use roles if on AWS EC2/ECS).

5. **Build & Deploy**
   - For the front end, build the React/Next.js app.
   - Deploy the front end to a service like Vercel, Netlify, or as a static site on AWS.
   - Deploy the back end (Node server) to your chosen platform.
   - Configure environment variables in your hosting environment (e.g., AWS environment variables, Heroku config vars).

---

## Phase 9: Testing & Iteration

1. **Manual Testing**
   - Create test channels and DMs.
   - Send messages, replies, emojis, and files to ensure everything flows correctly.

2. **Add Basic Automated Tests**
   - If you have time, write a few integration tests to confirm critical routes work.
   - Test with a local or staging database.

3. **Gather Feedback & Improve**
   - Share your MVP with a small group.
   - Collect feedback on UI, performance, and features.
   - Decide which future features to implement next (e.g., AI chatbots, voice/video).

---

## Future Considerations

1. **AI Chatbot / Auto-responder**
   - Plan how a “bot” user account can post messages on behalf of an AI service.
   - Integrate with an API (like OpenAI) to generate responses.

2. **Advanced Notifications**
   - Add push notifications or email notifications when a user is mentioned.
   - Introduce a user preference panel for notification settings.

3. **Video/Audio Calls**
   - Investigate WebRTC-based solutions or a third-party service like Twilio for real-time communications.
   - Add a “call” button in each channel/DM.

4. **Security Enhancements**
   - Add rate limiting to prevent spam.
   - Ensure robust validation on file uploads to prevent malicious files.

5. **Scaling**
   - Keep an eye on resource usage and scale up if user demand grows beyond your initial 200 concurrency estimate.
   - Potentially split services (e.g., separate real-time server from your REST API) if load increases significantly.

---

### Final Reminder

- **Focus on One Step at a Time**: Each phase and step can be handled in isolation.
- **Avoid Over-Engineering**: Start with the simplest versions of each feature.
- **Refine and Expand** as you get comfortable and as requirements evolve.

By following these atomic steps, you’ll have a **Slack-like MVP** with real-time messaging, channel/DM organization, basic file sharing, user presence, simple threads, emoji reactions (with a 3-reaction-per-user limit), and flexible authentication (including guest login).
