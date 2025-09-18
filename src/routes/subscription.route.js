import { Router } from 'express';
import {
    getSubscribedChannels,
    getUserChannelSubscribers,
    toggleSubscription,
} from "../controllers/subscription.controller.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"

const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

// This route GETS channels a specific user is subscribed to
router.route("/c/:subscriberId").get(getSubscribedChannels)

// This route TOGGLES a subscription to a specific channel
router.route("/c/:channelId").post(toggleSubscription);

// This route GETS subscribers of a specific channel
router.route("/u/:channelId").get(getUserChannelSubscribers);

export default router