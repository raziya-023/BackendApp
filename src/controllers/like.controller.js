import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {Video} from "../models/video.model.js"
import {Comment} from "../models/comment.model.js"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    //: toggle like on video
    
    // Validate videoId
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }
    
    // Verify authenticated user exists
    const currentUser = await User.findById(req.user?._id)
    if (!currentUser) {
        throw new ApiError(404, "User not found")
    }
    
    // Check if video exists
    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "Video not found")
    }
    
    // Check if like already exists
    const existingLike = await Like.findOne({
        video: videoId,
        likedBy: req.user?._id
    })
    
    let message
    let isLiked
    
    if (existingLike) {
        // Unlike - remove like
        await Like.findByIdAndDelete(existingLike._id)
        message = "Video unliked successfully"
        isLiked = false
    } else {
        // Like - create new like
        await Like.create({
            video: videoId,
            likedBy: req.user?._id
        })
        message = "Video liked successfully"
        isLiked = true
    }
    
    return res.status(200).json(
        new ApiResponse(200, { isLiked }, message)
    )
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //: toggle like on comment
    
    // Validate commentId
    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID")
    }
    
    // Verify authenticated user exists
    const currentUser = await User.findById(req.user?._id)
    if (!currentUser) {
        throw new ApiError(404, "User not found")
    }
    
    // Check if comment exists
    const comment = await Comment.findById(commentId)
    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }
    
    // Check if like already exists
    const existingLike = await Like.findOne({
        comment: commentId,
        likedBy: req.user?._id
    })
    
    let message
    let isLiked
    
    if (existingLike) {
        // Unlike - remove like
        await Like.findByIdAndDelete(existingLike._id)
        message = "Comment unliked successfully"
        isLiked = false
    } else {
        // Like - create new like
        await Like.create({
            comment: commentId,
            likedBy: req.user?._id
        })
        message = "Comment liked successfully"
        isLiked = true
    }
    
    return res.status(200).json(
        new ApiResponse(200, { isLiked }, message)
    )
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //: toggle like on tweet
    
    // Validate tweetId
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID")
    }
    
    // Verify authenticated user exists
    const currentUser = await User.findById(req.user?._id)
    if (!currentUser) {
        throw new ApiError(404, "User not found")
    }
    
    // Check if tweet exists
    const tweet = await Tweet.findById(tweetId)
    if (!tweet) {
        throw new ApiError(404, "Tweet not found")
    }
    
    // Check if like already exists
    const existingLike = await Like.findOne({
        tweet: tweetId,
        likedBy: req.user?._id
    })
    
    let message
    let isLiked
    
    if (existingLike) {
        // Unlike - remove like
        await Like.findByIdAndDelete(existingLike._id)
        message = "Tweet unliked successfully"
        isLiked = false
    } else {
        // Like - create new like
        await Like.create({
            tweet: tweetId,
            likedBy: req.user?._id
        })
        message = "Tweet liked successfully"
        isLiked = true
    }
    
    return res.status(200).json(
        new ApiResponse(200, { isLiked }, message)
    )
})

const getLikedVideos = asyncHandler(async (req, res) => {
    //: get all liked videos
    // Verify authenticated user exists
    const currentUser = await User.findById(req.user?._id)
    if (!currentUser) {
        throw new ApiError(404, "User not found")
    }
    
    // Get pagination parameters
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit
    
    // Aggregation pipeline to get liked videos with details
    const likedVideos = await Like.aggregate([
        {
            $match: { 
                likedBy: new mongoose.Types.ObjectId(req.user?._id),
                video: { $exists: true }
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "videoDetails",
                pipeline: [
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
                        $project: {
                            title: 1,
                            description: 1,
                            thumbnail: 1,
                            duration: 1,
                            views: 1,
                            createdAt: 1,
                            owner: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                video: { $first: "$videoDetails" }
            }
        },
        {
            $match: {
                video: { $ne: null }
            }
        },
        {
            $project: {
                videoDetails: 0,
                likedBy: 0
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
    const totalLikedVideos = await Like.countDocuments({
        likedBy: req.user?._id,
        video: { $exists: true }
    })
    
    return res.status(200).json(
        new ApiResponse(200, {
            likedVideos,
            user: {
                _id: currentUser._id,
                username: currentUser.username,
                fullName: currentUser.fullName,
                avatar: currentUser.avatar
            },
            pagination: {
                page,
                limit,
                total: totalLikedVideos,
                pages: Math.ceil(totalLikedVideos / limit)
            }
        }, "Liked videos retrieved successfully")
    )
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}