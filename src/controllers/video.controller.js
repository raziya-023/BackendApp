import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary, deleteFromCloudinary} from "../utils/cloudinary.js"

const getAllVideos = asyncHandler(async (req, res) => {

    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    
    // Build aggregation pipeline
    const pipeline = []
    
    // Match stage for filtering
    const matchStage = {}
    
    // If userId is provided, filter by owner
    if (userId) {
        if (!isValidObjectId(userId)) {
            throw new ApiError(400, "Invalid userId")
        }
        matchStage.owner = new mongoose.Types.ObjectId(userId)
    }
    
    // If query is provided, search in title and description
    if (query) {
        matchStage.$or = [
            { title: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } }
        ]
    }
    
    // Only show published videos
    matchStage.isPublished = true
    
    pipeline.push({ $match: matchStage })
    
    // Lookup stage to populate owner details
    pipeline.push({
        $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "ownerDetails",
            pipeline: [
                {
                    $project: {
                        username: 1,
                        "avatar.url": 1
                    }
                }
            ]
        }
    })
    
    pipeline.push({
        $addFields: {
            owner: {
                $first: "$ownerDetails"
            }
        }
    })
    
    // Sort stage
    const sortStage = {}
    if (sortBy && sortType) {
        sortStage[sortBy] = sortType === "desc" ? -1 : 1
    } else {
        sortStage.createdAt = -1 // Default sort by creation date
    }
    
    pipeline.push({ $sort: sortStage })
    
    // Remove ownerDetails field
    pipeline.push({
        $project: {
            ownerDetails: 0
        }
    })
    
    // Pagination
    const pageNumber = parseInt(page, 10)
    const limitNumber = parseInt(limit, 10)
    
    const videos = await Video.aggregatePaginate(
        Video.aggregate(pipeline),
        {
            page: pageNumber,
            limit: limitNumber
        }
    )
    
    return res
        .status(200)
        .json(new ApiResponse(200, videos, "Videos fetched successfully"))
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;

    if (!title || !description) {
        throw new ApiError(400, "Title and description are required");
    }

    const videoFileLocalPath = req.files?.videoFile?.[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

    if (!videoFileLocalPath) {
        throw new ApiError(400, "Video file is required");
    }
    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail is required");
    }

    const videoFile = await uploadOnCloudinary(videoFileLocalPath);
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!videoFile) {
        throw new ApiError(500, "Video file upload failed");
    }
    if (!thumbnail) {
        throw new ApiError(500, "Thumbnail upload failed");
    }

    // Always use secure_url for both video and thumbnail
    const video = await Video.create({
        title,
        description,
        duration: videoFile.duration,
        videoFile: videoFile.secure_url,
        thumbnail: thumbnail.secure_url,
        views: 0,
        owner: req.user?._id,
        isPublished: true // default to published for simplicity
    });

    if (!video) {
        throw new ApiError(500, "Video upload failed please try again");
    }

    return res
        .status(201)
        .json(new ApiResponse(201, video, "Video uploaded successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    
    // Validate videoId
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId")
    }
    
    // Find video with owner details
    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers"
                        }
                    },
                    {
                        $addFields: {
                            subscribersCount: {
                                $size: "$subscribers"
                            },
                            isSubscribed: {
                                $cond: {
                                    if: {
                                        $in: [
                                            req.user?._id,
                                            "$subscribers.subscriber"
                                        ]
                                    },
                                    then: true,
                                    else: false
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            username: 1,
                            "avatar.url": 1,
                            subscribersCount: 1,
                            isSubscribed: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes"
                },
                owner: {
                    $first: "$owner"
                },
                isLiked: {
                    $cond: {
                        if: {$in: [req.user?._id, "$likes.likedBy"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                "videoFile": 1, // Ensure we are fetching the videoFile field
                "thumbnail": 1,
                title: 1,
                description: 1,
                views: 1,
                createdAt: 1,
                duration: 1,
                owner: 1,
                likesCount: 1,
                isLiked: 1
            }
        }
    ])
    
    if (!video?.length) {
        throw new ApiError(404, "Video does not exist")
    }
    
    // Increment views if user is authenticated and is not the owner
    const videoDoc = await Video.findById(videoId);
    if (req.user && videoDoc.owner.toString() !== req.user._id.toString()) {
        videoDoc.views += 1;
        await videoDoc.save({ validateBeforeSave: false });
    }
    
    return res
        .status(200)
        .json(new ApiResponse(200, video[0], "Video details fetched successfully"))
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { title, description } = req.body;
    const thumbnailLocalPath = req.file?.path;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "No video found");
    }

    if (video.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You can't edit this video as you are not the owner");
    }

    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;

    if (thumbnailLocalPath) {
        const oldThumbnailUrl = video.thumbnail;
        const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
        if (!thumbnail.secure_url) {
            throw new ApiError(400, "Error while uploading thumbnail");
        }
        // --- CRITICAL FIX ---
        updateData.thumbnail = thumbnail.secure_url;
        
        // Delete old thumbnail after updating the document
        if (oldThumbnailUrl) {
            try {
                await deleteFromCloudinary(oldThumbnailUrl);
            } catch (error) {
                console.error("Failed to delete old thumbnail:", error);
            }
        }
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        { $set: updateData },
        { new: true }
    );

    if (!updatedVideo) {
        throw new ApiError(500, "Failed to update video details");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, updatedVideo, "Video details updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    
    // Validate videoId
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId")
    }
    
    // Find the video first
    const video = await Video.findById(videoId)
    
    if (!video) {
        throw new ApiError(404, "No video found")
    }
    
    // Check if user is owner of the video
    if (video?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "You can't delete this video as you are not the owner")
    }

    // Delete video file from Cloudinary using URL
    if (video.videoFile) {
        try {
            await deleteFromCloudinary(video.videoFile)
            console.log("Video file deleted from Cloudinary")
        } catch (error) {
            console.error("Failed to delete video file from Cloudinary:", error)
            // Don't throw error here - continue with database deletion
        }
    }
    
    // Delete thumbnail from Cloudinary using URL
    if (video.thumbnail) {
        try {
            await deleteFromCloudinary(video.thumbnail)
            console.log("Thumbnail deleted from Cloudinary")
        } catch (error) {
            console.error("Failed to delete thumbnail from Cloudinary:", error)
            // Don't throw error here - continue with database deletion
        }
    }
    
    // Delete video
    const videoDeleted = await Video.findByIdAndDelete(video?._id)
    
    if (!videoDeleted) {
        throw new ApiError(400, "Failed to delete the video please try again")
    }
    
    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Video deleted successfully"))
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    
    // Validate videoId
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId")
    }
    
    // Find the video first
    const video = await Video.findById(videoId)
    
    if (!video) {
        throw new ApiError(404, "Video not found")
    }
    
    // Check if user is owner of the video
    if (video?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "You can't toggle publish status of this video as you are not the owner")
    }
    
    // Toggle publish status
    video.isPublished = !video.isPublished;
    await video.save({ validateBeforeSave: false });
    
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { isPublished: video.isPublished },
                "Video publish toggled successfully"
            )
        )
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}