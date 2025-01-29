const router = require("express").Router();
const { Items, Channels } = require("./schema").getInstance();
const getViewProps = (req, title) => {
	let page = req.page ?? req.path.substr(1);
	if (!page) {
		page = req.user ? "account" : "intro";
		title = title ?? (req.user ? "Ahey" : "Ahey - A simple pub-sub over web push");
	}

	return {
		page,
		title,
		user: req.user,
		csrfToken: req.csrfToken,
	};
};

router.get("/", async (req, res) => {
	if (req.user) res.render("account", getViewProps(req));
	else res.render("intro", getViewProps(req));
});

router.get("/signup", async (req, res) => {
	if (req.user) res.redirect("/");
	res.render("signup", getViewProps(req, "Create an account - Ahey"));
});

router.get("/login", async (req, res) => {
	if (req.user) res.redirect("/");
	res.render("login", getViewProps(req, "Log in - Ahey"));
});

router.get("/channels", async (req, res) => {
	if (!req.user) res.redirect(`/login?state=${req.path}`);
	res.render("channels", getViewProps(req, "Channels - Ahey"));
});

router.get("/terms", async (req, res) => {
	res.render("terms", getViewProps(req, "Terms of service - Ahey"));
});

router.get("/about", async (req, res) => {
	res.render("about", getViewProps(req, "About - Ahey"));
});

router.get("/faq", async (req, res) => {
	res.render("faq", getViewProps(req, "Frequently asked questions - Ahey"));
});

router.get("/privacy", async (req, res) => {
	res.render("privacy", getViewProps(req, "Privacy policy - Ahey"));
});

router.get("/pricing", async (req, res) => {
	res.render("pricing", getViewProps(req, "Pricing - Ahey"));
});

router.get("/:channel", async (req, res) => {
	res.render("channel", { ...getViewProps(req, `${req.params.channel} - Ahey`), channel: req.params.channel });
});

router.get("/*", async (req, res) => {
	res.render("404", getViewProps(req, "Page not found - Ahey"));
});

module.exports = router;
