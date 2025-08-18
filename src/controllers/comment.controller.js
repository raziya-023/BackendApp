import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //:get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query
    
    // Validate videoId
    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }
    
    // Check if video exists
    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "Video not found")
    }
    
    // Aggregation pipeline to get comments with pagination
    const commentsAggregate = Comment.aggregate([
        {
            $match: { video: new mongoose.Types.ObjectId(videoId) }
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
            $sort: { createdAt: 1 }
        }
    ])
    
    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    }
    
    const comments = await Comment.aggregatePaginate(commentsAggregate, options)
    
    return res.status(200).json(
        new ApiResponse(200, comments, "Comments retrieved successfully")
    )

})

const addComment = asyncHandler(async (req, res) => {
    //: add a comment to a video
    const { videoId } = req.params
    const { content } = req.body
    
    // Validate content
    if (!content || content.trim().length === 0) {
        throw new ApiError(400, "Comment content is required")
    }
    
    // Validate videoId
    if (!mongoose.isValidObjectId(videoId)) {
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
    
    // Create comment
    const comment = await Comment.create({
        content: content.trim(),
        video: videoId,
        owner: req.user?._id
    })
    
    if (!comment) {
        throw new ApiError(500, "Failed to create comment")
    }
    
    // Populate owner details for response
    const createdComment = await Comment.findById(comment._id).populate("owner", "username fullName avatar")
    
    return res.status(201).json(
        new ApiResponse(201, createdComment, "Comment added successfully")
    )
})

const updateComment = asyncHandler(async (req, res) => {
    //: update a comment
    const { commentId } = req.params
    const { content } = req.body
    
    // Validate commentId
    if (!mongoose.isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID")
    }
    
    // Validate content
    if (!content || content.trim().length === 0) {
        throw new ApiError(400, "Comment content is required")
    }
    
    // Verify authenticated user exists
    const currentUser = await User.findById(req.user?._id)
    if (!currentUser) {
        throw new ApiError(404, "User not found")
    }
    
    // Find comment
    const comment = await Comment.findById(commentId)
    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }
    
    // Check if comment belongs to authenticated user
    if (comment.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this comment")
    }
    
    // Update comment
    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        { content: content.trim() },
        { new: true }
    ).populate("owner", "username fullName avatar")
    
    return res.status(200).json(
        new ApiResponse(200, updatedComment, "Comment updated successfully")
    )
})

const deleteComment = asyncHandler(async (req, res) => {
    //: delete a comment
    const { commentId } = req.params
    
    // Validate commentId
    if (!mongoose.isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID")
    }
    
    // Verify authenticated user exists
    const currentUser = await User.findById(req.user?._id)
    if (!currentUser) {
        throw new ApiError(404, "User not found")
    }
    
    // Find comment
    const comment = await Comment.findById(commentId)
    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }
    
    // Check if comment belongs to authenticated user
    if (comment.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this comment")
    }
    
    // Delete comment
    await Comment.findByIdAndDelete(commentId)
    
    return res.status(200).json(
        new ApiResponse(200, {}, "Comment deleted successfully")
    )
})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}