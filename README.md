# Ahey.io

Ahey.io is a simple pub-sub system over web push. It allows users to subscribe to channels and receive messages directly to their browser without the need for an account. Publishers can send messages to regular channels after logging in, while user channels are personal and only the user who created the channel can publish to them.

## Features

- Subscribe to channels without an account.
- Publish to regular channels if authenticated.
- Personal user channels (in the `@username` format).
- Messages stored for 24 hours.
- Open-source and free to use.

## Installation

Clone the repository:

```bash
git clone https://github.com/vasanthv/ahey.git
cd ahey
```

Install dependencies (if applicable):

```bash
npm install
```

Run the service (you may need to adjust for your environment):

```bash
npm start
```

## API Documentation

### Authentication

To interact with the API and publish to a channel, you must log in and obtain an API key. The API key will be used for authentication in subsequent requests.

### API Endpoints

#### 1. `/me` - Get current user's details

- **Method:** `GET`
- **Description:** Returns details of the currently authenticated user.
- **Response Example:**

  ```json
  {
  	"username": "john_doe",
  	"email": "john@example.com",
  	"joinedOn": "2025-01-01T12:00:00Z",
  	"savedChannels": ["channel-1", "channel-2"]
  }
  ```

#### 2. `/push/:channel` - Send a push notification to a channel

- **Method:** `POST`
- **Description:** Sends a push notification to a specific channel.
- **Authentication:** Requires an API key.
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

#### 3. `/pull/:channel` - Retrieve the latest pushes from a channel

- **Method:** `GET`
- **Description:** Retrieves the latest 50 messages from a specific channel.
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

## Channel Types

Ahey.io supports two types of channels:

1. **Regular Channels**: Any authenticated user can publish messages to these channels.
2. **User Channels**: These are personal channels in the format `@username`. Only the user who created the channel can publish to it, but anyone can subscribe.

## Contributing

Please read [CONTRIBUTIONS.md](CONTRIBUTIONS.md)

## License

Ahey.io is open-source and released under the [MIT License](LICENSE).

## Contact

For any inquiries or issues, please contact us at [hello@ahey.io](mailto:hello@ahey.io).
