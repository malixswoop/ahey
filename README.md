# Ahey.io

Ahey.io is a simple pub-sub system over web push. It allows users to subscribe to channels and receive messages directly to their browser without the need for an account. Publishers can send messages to regular channels after logging in, while user channels are personal and only the user who created the channel can publish to them.

## Features

- Subscribe to channels without an account.
- Publish to regular channels if authenticated.
- Personal user channels (in the `@username` format).
- Messages stored for 24 hours.
- Open-source and free to use.

### Channel Types

Ahey.io supports two types of channels:

1. **Regular Channels**: Any authenticated user can publish messages to these channels.
2. **User Channels**: These are personal channels in the format `@username`. Only the user who created the channel can publish to it, but anyone can subscribe.

## API Documentation

### Authentication

To interact with the API and publish to a channel, you must log in and obtain an API key. The API key will be used for authentication in subsequent requests.

### API Endpoints

#### 1. `/me` - Get current user's details

- **Method:** `GET`
- **Description:** Returns details of the currently authenticated user.
- **Authentication**: Requires an API key passed in the X-API-KEY header.
- **Response Example:**

  ```json
  {
  	"username": "john_doe",
  	"email": "john@example.com",
  	"joinedOn": "2025-01-01T12:00:00Z",
  	"savedChannels": ["channel-1", "channel-2"]
  }
  ```

  ```bash
  curl -X GET "https://ahey.io/api/me" \
      -H "X-API-KEY: your-api-key"
  ```

#### 2. `/push/:channel` - Send a push notification to a channel

- **Method:** `POST`
- **Description:** Sends a push notification to a specific channel.
- **Authentication**: Requires an API key passed in the X-API-KEY header.
- **URL Format:** `/push/:channel` where `:channel` is the channel name.
- **Body Example:**

  ```json
  {
  	"body": "Your push content"
  }
  ```

- **Response Example:**

  ```json
  {
  	"message": "Pushed successfully"
  }
  ```

  ```bash
  curl -X POST "https://ahey.io/api/push/channel-name" \
      -H "X-API-KEY: your-api-key" \
      -H "Content-Type: application/json" \
      -d '{"body": "Your push content"}'
  ```

#### 3. `/pull/:channel` - Retrieve the latest pushes from a channel

- **Method:** `GET`
- **Description:** Retrieves the latest 50 messages from a specific channel.
- **Authentication**: Requires an API key passed in the X-API-KEY header.
- **Query Parameter:**
  - `skip` (optional) - Skips the first `n` messages in the channel (useful for pagination).
- **URL Format:** `/pull/:channel` where `:channel` is the channel name.
- **Response Example:**

  ```json
  {
  	"pushes": [
  		{
  			"from": { "username": "john" },
  			"body": "Hello, world!",
  			"channel": "test-channel",
  			"date": "2025-01-28T19:07:40.011Z"
  		}
  	],
  	"subscribers": 10
  }
  ```

  ```bash
  curl -X GET "https://ahey.io/api/pull/channel-name?skip=0" \
      -H "X-API-KEY: your-api-key"
  ```

  Sure! Here's the updated local development section in markdown format:

## Local Development

To get started with Ahey locally, follow these steps:

### 1. Clone the repository

Start by cloning the Ahey repository to your local machine:

```bash
git clone https://github.com/vasanthv/ahey.git
cd ahey
```

### 2. Install dependencies

Install the necessary dependencies for the project, including the MongoDB package:

```bash
npm install
```

Make sure you have MongoDB running locally or use a MongoDB cloud service like [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).

### 3. Generate VAPID credentials

Run the following command to generate your VAPID credentials, which are required for push notifications:

```bash
npm run gen:vapid
```

Make sure to store the generated credentials safely, as you'll need them for production.

### 4. Configure

Update the `server/config.js` file with your MongoDB connection string & vapid details.

- Open `server/config.js` in the root directory.
- Update the `MONGODB_URI` variable with your local MongoDB URI or connection string from MongoDB Atlas.
- Update your vapid details.

### 5. Start the development server

Launch the development server with:

```bash
npm start
```

By default, the server will run on [http://localhost:3000](http://localhost:3000). You can now access your local instance of Ahey!

## Contributing

Please read [CONTRIBUTIONS.md](CONTRIBUTIONS.md)

## License

Ahey.io is open-source and released under the [MIT License](LICENSE).

## Contact

For any inquiries or issues, please contact us at [hello@ahey.io](mailto:hello@ahey.io).
