import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler( async(req, res) => {
    const { content } = req.body;

    if(!content.trim()) {
        throw new ApiError(400, "Content is required");
    }

    const newTweet = await Tweet.create({
        content,
        owner: req.user._id
    });

    if(!newTweet) {
        throw new ApiError(500, "Tweet not created. Please try again!");
    }

    res.status(201).json(new ApiResponse(201, newTweet, "Tweet created successfully"));
});

const getUserTweets = asyncHandler( async(req, res) => {
    const { userId } = req.params;

    if(!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user id");
    }

    const tweets = await Tweet.find({ owner: userId });

    res.status(200).json(new ApiResponse(200, tweets, "User tweets fetched successfully"));
});

const updateTweet = asyncHandler(async(req, res) => {
    const { tweetId } = req.params;
    const { content } = req.body;

    if(!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet id");
    }

    if(!content.trim()) {
        throw new ApiError(400, "Content is required");
    }

    const updatedTweet = await Tweet.findByIdAndUpdate(tweetId, { content }, { new: true });

    if(!updatedTweet) {
        throw new ApiError(500, "Tweet not updated. Please try again!");
    }

    res.status(200).json(new ApiResponse(200, updatedTweet, "Tweet updated successfully"));
})

const deleteTweet = asyncHandler(async(req, res) => {
    const { tweetId } = req.params;

    if(!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet id");
    }

    const deletedTweet = await Tweet.findByIdAndDelete(tweetId);

    if(!deletedTweet) {
        throw new ApiError(500, "Tweet not deleted. Please try again!");
    }

    res.status(200).json(new ApiResponse(200, null, "Tweet deleted successfully"));
})

export { createTweet, getUserTweets, updateTweet, deleteTweet };