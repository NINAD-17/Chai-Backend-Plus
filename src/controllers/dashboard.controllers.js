import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { request } from "express";

const getChannelStats = asyncHandler( async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    try {
        const videos = await Video.aggregate([
            {
                $match: {
                    owner: new mongoose.Types.ObjectId(req.user._id)
                }
            },
            {
                $group: {
                    _id: null,
                    totalViews: { $sum: "$views" },
                    totalVideos: { $sum: 1 }
                }
            }
        ])

        const totalViews = videos[0].totalViews;
        const totalVideos = videos[0].totalVideos;

        console.log(totalViews, totalVideos);

        const subscribers = await Subscription.aggregate([
            {
                $match: {
                    channel: new mongoose.Types.ObjectId(req.user._id)
                }
            },
            {
                $group: {
                    _id: null,
                    totalSubscribers: { $sum: 1 }
                }
            }
        ])

        const totalSubscribers = subscribers.length? subscribers[0].totalSubscribers: 0;
        console.log({totalSubscribers})

        const [videoLikes, commentLikes, tweetLikes] = await Promise.all([
          Like.aggregate([
            {
              $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "video",
              },
            },
            {
              $match: {
                "video.owner": new mongoose.Types.ObjectId(req.user._id),
              },
            },
            {
              $group: {
                _id: null,
                totalVideoLikes: { $sum: 1 }
              }
            }
          ]),
          Like.aggregate([
            {
              $lookup: {
                from: "comments",
                localField: "comment",
                foreignField: "_id",
                as: "comment",
              }
            },
            {
              $match: {
                "comment.owner": new mongoose.Types.ObjectId(req.user._id),
              }
            }, 
            {
              $group: {
                _id: null,
                totalCommentLikes: { $sum: 1 }
              }
            }
          ]),
          Like.aggregate([
            {
              $lookup: {
                from: "tweets",
                localField: "tweet",
                foreignField: "_id",
                as: "tweet",
              }
            }, 
            {
              $match: {
                "tweet.owner": new mongoose.Types.ObjectId(req.user._id),
              }
            },
            {
              $group: {
                _id: null,
                totalTweetLikes: { $sum: 1 }
              }
            }
          ])
        ]);

        const totalVideoLikes = videoLikes.length? videoLikes[0].totalVideoLikes : 0;
        const totalCommentLikes = commentLikes.length? commentLikes[0].totalCommentLikes : 0;
        const totalTweetLikes = tweetLikes.length? tweetLikes[0].totalTweetLikes : 0;

        const totalLikes = totalVideoLikes + totalCommentLikes + totalTweetLikes;

        res.status(200).json(
          new ApiResponse(
            200,
            {
              totalViews,
              totalVideos,
              totalSubscribers,
              totalLikes
            },
            "Channel stats fetched successfully"
          )
        )
    } catch (error) {
        throw new ApiError(500, "Failed to fetch channel stats");
    }
});

const getChannelVideos = asyncHandler(async (req, res, next) => {
  const { sortBy = "createdAt", sortType = "desc", lastItemId, limit = 10 } = req.query;

  const limitInt = parseInt(limit, 10);
  const sortOrder = sortType === "desc" ? -1 : 1;
  let matchCondition = { owner: new mongoose.Types.ObjectId(req.user._id) };

  if (lastItemId) {
    // Add condition to match documents after the lastItemId
    matchCondition._id = { [sortOrder === 1 ? '$gt' : '$lt']: new mongoose.Types.ObjectId(lastItemId) };
  }

  try {
    const videos = await Video.aggregate([
      {
        $match: matchCondition
      },
      {
        $sort: { [sortBy]: sortOrder }
      },
      {
        $limit: limitInt
      }
    ]);

    if (!videos.length) {
      return res.status(200).json(new ApiResponse(200, [], "No more videos found"));
    }

    res.status(200).json(new ApiResponse(200, videos, "Videos fetched successfully"));

  } catch (error) {
    throw new ApiError(500, "Failed to fetch videos!");
  }
});

export { getChannelStats, getChannelVideos };