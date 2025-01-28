module.exports = {
	NODE_ENV: process.env.NODE_ENV,
	PORT: process.env.PORT || 3000,
	PAGE_LIMIT: 50,
	URL: process.env.NODE_ENV === "production" ? "https://ahey.io/" : "http://localhost:3000/",
	MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017/ahey-dev",
	DISABLE_CSRF: process.env.DISABLE_CSRF,
	CSRF_TOKEN_EXPIRY: 60 * 15, // 15 mins
	SECRET: process.env.SECRET ?? "some-secret",
	AWS_ACCESS_KEY: process.env.AWS_ACCESS_KEY_ID,
	AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
	POSTMARK_API_TOKEN: process.env.POSTMARK_API_TOKEN,
	NO_REPLY_EMAIL: process.env.NO_REPLY_EMAIL ?? "Ahey <noreply@email.ahey.io>",
	INVALID_HANDLES: ["administrator", "admin", "bot", "ahey"],
	CONTACT_EMAIL: process.env.CONTACT_EMAIL ?? "hello@ahey.io",
	TEST_PUSH_PAYLOAD: "test-push",
	PUSH_OPTIONS: {
		vapidDetails: {
			subject: `mailto:${process.env.CONTACT_EMAIL ?? "hello@ahey.io"}`,
			publicKey: process.env.VAPID_PUBLIC_KEY,
			privateKey: process.env.VAPID_PRIVATE_KEY,
		},
	},
};
