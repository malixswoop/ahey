const router = require("express").Router();
const bodyParser = require("body-parser");
const morgan = require("morgan");

const model = require("./model");
const utils = require("./utils");
const config = require("./config");

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));
router.use(morgan("dev")); // for dev logging

router.get("/verify/:code", model.verifyEmail);
router.get("/meta", (req, res) => res.json({ vapidKey: config.PUSH_OPTIONS.vapidDetails.publicKey }));

// Logging UI errors
router.post("/error", (req, res) => {
	console.error({ browserError: req.body });
	res.send();
});

router.use(utils.csrfValidator);

router.post("/signup", utils.rateLimit({ windowMs: 30, max: 2, skipFailedRequests: true }), model.signUp);
router.post("/login", utils.rateLimit({ max: 5 }), model.logIn);
router.post("/reset", utils.rateLimit({ max: 5 }), model.resetPassword);
router.post("/resend", utils.rateLimit({ max: 1 }), model.resendEmailVerification);

router.use(["/me", "/push/*"], utils.attachUsertoRequestFromAPIKey);

router.post("/channels/subscribe", utils.rateLimit({ max: 25 }), model.subscribeChannel);
router.post("/channels/unsubscribe", model.unsubscribeChannel);
router.post("/device", model.updateDevice);
router.get("/device", model.getDeviceDetails);
router.get("/pull/:channel", model.pull);

router.use(utils.isUserAuthed);

router.get("/me", model.me);
router.put("/account", model.updateAccount);
router.post("/channels/save", model.saveChannel);
router.post("/channels/unsave", model.unsaveChannel);

router.post("/key", model.newApiKey);
router.delete("/key/:key", model.deleteApiKey);

router.post("/push/:channel", utils.rateLimit({ max: 25, keyGenerator: (req) => req.user._id }), model.push);

router.post("/logout", model.logOut);

/**
 * API endpoints common error handling middleware
 */
router.use(["/:404", "/"], (req, res) => {
	res.status(404).json({ message: "ROUTE_NOT_FOUND" });
});

// Handle the known errors
router.use((err, req, res, next) => {
	if (err.httpErrorCode) {
		res.status(err.httpErrorCode).json({ message: err.message || "Something went wrong" });
	} else {
		next(err);
	}
});

// Handle the unknown errors
router.use((err, req, res) => {
	console.error(err);
	res.status(500).json({ message: "Something went wrong" });
});

module.exports = router;
