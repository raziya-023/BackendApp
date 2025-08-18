import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    const { content } = req.body
    
    // Validate content
    if (!content || content.trim().length === 0) {
        throw new ApiError(400, "Tweet content is required")
    }
    
    // Verify user exists and is active
    const user = await User.findById(req.user?._id)
    if (!user) {
        throw new ApiError(404, "User not found")
    }
    
    // Create tweet with authenticated user as owner
    const tweet = await Tweet.create({
        content: content.trim(),
        owner: req.user?._id
    })
    
    if (!tweet) {
        throw new ApiError(500, "Failed to create tweet")
    }
    
    // Populate owner details for response
    const createdTweet = await Tweet.findById(tweet._id).populate("owner", "username fullName avatar")
    
    return res.status(201).json(
        new ApiResponse(201, createdTweet, "Tweet created successfully")
    )
})

const getUserTweets = asyncHandler(async (req, res) => {
    const { userId } = req.params
    
    // Validate userId
    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user ID")
    }
    
    // Check if user exists
    const user = await User.findById(userId)
    if (!user) {
        throw new ApiError(404, "User not found")
    }
    
    // Get pagination parameters
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit
    
    // Aggregation pipeline to get tweets with pagination
    const tweets = await Tweet.aggregate([
        {
            $match: { owner: new mongoose.Types.ObjectId(userId) }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                owner: { $first: "$owner" }
            }
        },
        {
            $sort: { createdAt: -1 }
        },
        {
            $skip: skip
        },
        {
            $limit: limit
        }
    ])
    
    // Get total count for pagination
    const totalTweets = await Tweet.countDocuments({ owner: userId })
    
    return res.status(200).json(
        new ApiResponse(200, {
            tweets,
            user: {
                _id: user._id,
                username: user.username,
                fullName: user.fullName,
                avatar: user.avatar
            },
            pagination: {
                page,
                limit,
                total: totalTweets,
                pages: Math.ceil(totalTweets / limit)
            }
        }, "User tweets retrieved successfully")
    )
})

const updateTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    const { content } = req.body
    
    // Validate tweetId
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID")
    }
    
    // Validate content
    if (!content || content.trim().length === 0) {
        throw new ApiError(400, "Tweet content is required")
    }
    
    // Verify authenticated user exists
    const currentUser = await User.findById(req.user?._id)
    if (!currentUser) {
        throw new ApiError(404, "User not found")
    }
    
    // Find tweet
    const tweet = await Tweet.findById(tweetId)
    if (!tweet) {
        throw new ApiError(404, "Tweet not found")
    }
    
    // Check if tweet belongs to authenticated user
    if (tweet.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this tweet")
    }
    
    // Update tweet
    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        { content: content.trim() },
        { new: true }
    ).populate("owner", "username fullName avatar")
    
    return res.status(200).json(
        new ApiResponse(200, updatedTweet, "Tweet updated successfully")
    )
})

const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    
    // Validate tweetId
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID")
    }
    
    // Verify authenticated user exists
    const currentUser = await User.findById(req.user?._id)
    if (!currentUser) {
        throw new ApiError(404, "User not found")
    }
    
    // Find tweet
    const tweet = await Tweet.findById(tweetId)
    if (!tweet) {
        throw new ApiError(404, "Tweet not found")
    }
    
    // Check if tweet belongs to authenticated user
    if (tweet.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this tweet")
    }
    
    // Delete tweet
    await Tweet.findByIdAndDelete(tweetId)
    
    return res.status(200).json(
        new ApiResponse(200, {}, "Tweet deleted successfully")
    )
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}