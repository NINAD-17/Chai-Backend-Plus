import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler( async(req, res) => {
    const { videoId } = req.params;
    const { page = 1, limit = 10, sortBy = "createdAt", sortType = "desc" } = req.query;

    const pageInt = parseInt(page, 10);
    const limitInt = parseInt(limit, 10);
    const skip = (pageInt - 1) * limitInt;

    try {
        const comments = await Comment.aggregate([
            {
                $match: {
                    video: new mongoose.Types.ObjectId(videoId),
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "owner",
                }
            },
            {
                $unwind: "$owner"
            },
            {
                $lookup: {
                    from: "likes",
                    localField: "_id",
                    foreignField: "comment",
                    as: "likes",
                    pipeline: [
                        {
                            $count: "likesCount"
                        }
                    ]
                }
            },
            {
                $unwind: {
                    path: "$likes",
                    preserveNullAndEmptyArrays: true // Ensures comments with zero likes are also included
                }
            },
            {
                $project: {
                    _id: 1, 
                    content: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    owner: {
                        _id: "$owner._id",
                        username: "$owner.username",
                        avatar: "$owner.avatar"
                    },
                    likesCount:{ $ifNull: ["$likes.likesCount", 0] }
                }
            },
            {
                $sort: {
                    [sortBy]: sortType === "desc"? -1 : 1
                }
            },
            {
                $skip: skip
            },
            {
                $limit: limit
            }
        ]);

        // TODO - add code to find total comments. we can call it with an extra db call but see if there any efficient solution or not - maybe atomic?
    
        if(!comments) {
            return next(new ApiError(404, "No comments found for this video"));
        }

        res.status(200).json(
            new ApiResponse(200, comments, "Comments fetched successfully!")
        )
    } catch (error) {
        throw new ApiError(500, "Failed to fetch comments. Please try again!");
    }
})

const addComment = asyncHandler( async(req, res) => {
    const { videoId } = req.params;
    const { content } = req.body;

    // check if video exists
    const video = await Video.findById(videoId);
    if(!video) {
        throw new ApiError(404, "Video not found!");
    }

    // create a new comment for the video
    const newComment = await Comment.create({
        content,
        video: videoId,
        owner: req.user._id
    });

    if(!newComment) {
        throw new ApiError(500, "Failed to create comment. Please try again!");
    }

    res.status(201).json(
        new ApiResponse(201, newComment, "Comment created successfully!")
    )
})

const updateComment = asyncHandler( async(req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;

    const comment = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set: {
                content
            }
        },
        { new: true }
    )

    if(!comment) {
        throw new ApiError(404, "Comment not found!");
    }

    res.status(200).json(
        new ApiResponse(200, comment, "Comment updated successfully!")
    )
});

const deleteComment = asyncHandler( async(req, res) => {
    const { commentId } = req.params;

    try {
        const deleteComment = await Comment.findByIdAndDelete(commentId);
    
        if(!deleteComment) {
            throw new ApiError(500, "Comment not found!");
        }
    
        res.status(200).json(
            new ApiResponse(200, null, "Comment deleted successfully!")
        )
    } catch (error) {
        throw new ApiError(500, "An error occurred while deleting the comment!");
    }
});

export { getVideoComments, addComment, updateComment, deleteComment };