// Backend/src/middlewares/auth.optional.middleware.js

import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

// This middleware is almost identical to verifyJWT, but it NEVER throws an error.
export const verifyJWTOptional = async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            return next(); // No token? No problem. Just proceed.
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");

        if (user) {
            req.user = user; // User found? Attach them to the request.
        }
    } catch (error) {
        // If the token is invalid/expired, just ignore it and proceed.
    }
    
    return next(); // Always proceed to the next step.
};