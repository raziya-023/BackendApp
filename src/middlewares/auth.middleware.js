import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import {User} from "../models/user.model.js";
export const verifyJWT = asyncHandler(async(req, _, next) => {
    // We are wrapping the entire logic in a try/catch block
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
        
        // If there's no token, we immediately throw an error.
        // This is the correct approach for protected routes.
        if (!token) {
            throw new ApiError(401, "Unauthorized request");
        }
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");

        // If the token is valid but the user doesn't exist (e.g., deleted account)
        if (!user) {
            throw new ApiError(401, "Invalid Access Token");
        }

        // If everything is successful, attach the user to the request and proceed.
        req.user = user;
        next();
        
    } catch (error) {
        // This catch block will handle invalid/expired tokens or missing tokens.
        // It's a clear failure point.
        throw new ApiError(401, error?.message || "Invalid Access Token");
    }
});