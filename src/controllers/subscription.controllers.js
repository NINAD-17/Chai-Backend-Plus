import mongoose from "mongoose";
import { Subscription } from "../models/subscription.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscribtion = asyncHandler( async(req, res) => {
    const { channelId } = req.params;

    if(channelId.toString() === req.user._id.toString()) {
        throw new ApiError(400, "You cannot subscribe to your own channel!");
    }

    // check if channel is valid
    const channel = await User.findById(channelId);
    if(!channel) {
        throw new ApiError(404, "Channel not found!");
    }

    // toggle subscription
    const subscribedDocument = await Subscription.findOne({
        channel: channelId,
        subscriber: req.user._id
    })

    let subscribeResult;
    if(!subscribedDocument) {
        const subscribe = await new Subscription({
            channel: channelId,
            subscriber: req.user._id
        }).save();
        
        if(!subscribe) {
            throw new ApiError(500, "Subscription toggle failed. Please try again!");
        }

        subscribeResult = "Subscribed!"
    } else {
        const unsubscribe = await Subscription.findByIdAndDelete(subscribedDocument._id);
        
        if(!unsubscribe) {
            throw new ApiError(500, "Subscription toggle failed. Please try again!");
        }
        subscribeResult = "Unsubscribed!"
    }

    res.status(200).json(
        new ApiResponse(200, null, `${subscribeResult} Subscription toggled successfully!`)
    )
});

const getUserchannelSubscribers = asyncHandler( async(req, res) => {
    const { channelId } = req.params;

    // check if channel is valid
    const channel = await User.findById(channelId);
    if(!channel) {
        throw new ApiError(404, "Channel not found!");
    }

    // get subscribers
    let allSubscribers;
    
    try {
        allSubscribers = await Subscription.aggregate([
            {
                $match: {
                    channel: new mongoose.Types.ObjectId(channelId)
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "subscriber",
                    foreignField: "_id",
                    as: "subscriberDetails"
                }
            },
            {
                $unwind: "$subscriberDetails"
            },
            {
                $project: {
                    "subscriberDetails._id": 1,
                    "subscriberDetails.username": 1,
                    "subscriberDetails.avatar": 1,
                }
            }
        ])

        if (!allSubscribers.length) {
          res
            .status(200)
            .json(
              new ApiResponse(200, [], "No subscribers found for this channel!")
            );
        }

        res
          .status(200)
          .json(
            new ApiResponse(
              200,
              {allSubscribers, totalSubscribers: allSubscribers.length},
              "Subscribers fetched successfully!"
            )
          );

    } catch (error) {
        throw new ApiError(500, "Failed to fetch subscribers. Please try again!");
    }
})

const getSubscribedChannels = asyncHandler( async(req, res) => {
    // get subscribers

    let allSubscribedChannels;

    try {
        allSubscribedChannels = await Subscription.aggregate([
            {
                $match: {
                    subscriber: new mongoose.Types.ObjectId(req.user._id)
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "channel",
                    foreignField: "_id",
                    as: "channelDetails",
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
                                totalSubscribers: {
                                    $size: "$subscribers"
                                }
                            }
                        },
                        {
                            $project: {
                                _id: 1,
                                username: 1,
                                avatar: 1,
                                totalSubscribers: 1
                            }
                        }
                    ]
                }
            },
            {
                $unwind: "$channelDetails"
            },
            {
                $group: {
                    _id: null,
                    channels: { $push: "$channelDetails" },
                    totalSubscribedChannels: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    channels: 1,
                    totalSubscribedChannels: 1
                }
            }
        ])

        res.status(200).json(
            new ApiResponse(200, allSubscribedChannels[0], "Subscribed channels fetched successfully!")
        )
    } catch(error) {
        throw new ApiError(500, "Failed to fetch subscribed channels. Please try again!");
    }
})

export { toggleSubscribtion, getUserchannelSubscribers, getSubscribedChannels };
