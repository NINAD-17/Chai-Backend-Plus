import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getSubscribedChannels, getUserchannelSubscribers, toggleSubscribtion } from "../controllers/subscription.controllers.js";

const router = Router();
router.use(verifyJWT);

router.route("/c/:channelId")
    .post(toggleSubscribtion);

router.route("/c/:channelId/subscriptions")
    .get(getSubscribedChannels);

router.route("/c/:channelId/subscribers")
    .get(getUserchannelSubscribers);

export default router;