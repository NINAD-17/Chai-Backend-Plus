import mongoose from "mongoose"
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler( async(req, res) => {
    const { videoId } = req.params;

    const isVideoLikeDeleted = await Like.findOneAndDelete({
        video: videoId,
        likedBy: req.user._id
    })

    if(isVideoLikeDeleted) {
        return res.status(200).json(new ApiResponse(200, null, "Like removed successfully!"));
    } else {
        const newLike = await Like.create({
            video: videoId,
            likedBy: req.user._id
        });

        if(!newLike) {
            throw new ApiError(500, "Like toggle failed. Please try again!");
        }

        return res.status(200).json(new ApiResponse(200, null, "Like added successfully!"));
    }
})

const toggleCommentLike = asyncHandler( async(req, res) => {
    const { commentId } = req.params;

    const isCommentLikeDeleted = await Like.findOneAndDelete({
      comment: commentId,
      likedBy: req.user._id,
    });

    console.log({isCommentLikeDeleted})
    if(isCommentLikeDeleted) {
        return res.status(200).json(new ApiResponse(200, null, "Like removed successfully!"));
    } else {
        const newLike = await Like.create({
            comment: commentId,
            likedBy: req.user._id
        });

        if(!newLike) {
            throw new ApiError(500, "Like toggle failed. Please try again!");
        }

        return res.status(200).json(new ApiResponse(200, null, "Like added successfully!"));
    }
})

const toggleTweetLike = asyncHandler( async(req, res) => {
    const { tweetId } = req.params;

    const isTweetLikeDeleted = await Like.findOneAndDelete({
        tweet: tweetId,
        likedBy: req.user._id
    });

    if(isTweetLikeDeleted) {
        return res.status(200).json(new ApiResponse(200, null, "Like removed successfully!"));
    } else {
        const newLike = await Like.create({
            tweet: tweetId,
            likedBy: req.user._id
        });

        if(!newLike) {
            throw new ApiError(500, "Like toggle failed. Please try again!");
        }

        return res.status(200).json(new ApiResponse(200, null, "Like added successfully!"));
    }
})

const getLikedVideos = asyncHandler( async(req, res) => {
    const likedVideos = await Like.aggregate([
        {
            $match: {
                video: { $exists: true },
                likedBy: new mongoose.Types.ObjectId(req.user._id)
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
                            as: "owner"
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            videoFile: 1,
                            thumbnail: 1,
                            title: 1,
                            duration: 1,
                            views: 1,
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$videoDetails"
        },
        {
            $project: {
                _id: 1,
                likedBy: 1,
                createdAt: 1,
                videoDetails: 1
            }
        }
    ])

    if(!likedVideos) {
        throw new ApiError(404, "No liked videos found!");
    }

    return res.status(200).json(new ApiResponse(200, likedVideos, "Liked videos fetched successfully!"));
})

export { toggleVideoLike, toggleCommentLike, toggleTweetLike, getLikedVideos };