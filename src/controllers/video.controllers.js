import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

// publish a video
const publishAVideo = asyncHandler( async(req, res) => {
    // get data of video from body
    const { title, description } = req.body;

    if(!title?.trim()) {
        throw new ApiError(400, "Title is required");
    }

    if(!description?.trim()) {
        description = description.trim(); // if description is empty (but only whitespaces are there) then remove those whitespaces to get falsy values. We're not throwing error as description is optional field
    }

    // get path of uploaded video file and thumbnail
    const videoFilePath = req.files?.videoFile[0]?.path;
    const thumbnailFilePath = req.files?.thumbnail[0]?.path;

    if(!videoFilePath) {
        throw new ApiError(400, "Video file is required!");
    }

    // upload video on cloudinary server
    const video = await uploadOnCloudinary(videoFilePath);
    
    let thumbnailUrl;
    if(!thumbnailFilePath) {
        // use thumbnail of video created by cloudinary
        thumbnailUrl = video.thumbnail_url;
    } else {
        const thumbnail = await uploadOnCloudinary(thumbnailFilePath);
        thumbnailUrl = thumbnail.url;
    }

    // save video data in database
    const newVideo = await Video.create({
        videoFile: video.url,
        thumbnail: thumbnailUrl,
        title,
        description,
        duration: video.duration, // userId of the user who is publishing the video
        owner: req.user._id
    });

    if(!newVideo) {
        throw new ApiError(500, "Video not uploaded. Please try again!");
    }

    // send the response
    return res.status(201).json(
        new ApiResponse(201, newVideo, "Video published successfully!")
    )
})

// get a video by id
const getVideoById = asyncHandler( async(req, res) => {
    // get video Id
    const videoId = req.params.videoId;

    // find video by id
    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        {
            $addFields: {
                owner: {
                    $arrayElemAt: ["$owner", 0]
                }
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "owner._id",
                foreignField: "channel",
                as: "owner.subscribers"
            }
        },
        {
            $addFields: {
                "owner.subscribersCount": {
                    $size: "$owner.subscribers"
                },
                "owner.isUserSubscribed": {
                    $in: [new mongoose.Types.ObjectId(req.user._id), "$owner.subscribers.subscriber"]
                }
            }
        },
        {
            $project: {
                title: 1,
                description: 1,
                videoFile: 1,
                thumbnail: 1,
                duration: 1,
                owner: {
                    _id: 1,
                    username: 1,
                    subscribersCount: 1,
                    isUserSubscribed: 1,
                    avatar: 1
                }
            }
        }
    ])

    if(!video) {
        throw new ApiError(404, "Video not found!");
    }

    res.status(200).json(
        new ApiResponse(200, video[0], "Video fetched successfully!")
    )
})

// get all the videos 
// 1. page-based pagination
const getAllVideos = asyncHandler( async(req, res) => {
    const { page = 1, limit = 10, query, sortBy = "createdAt", sortType = "desc", userId } = req.query;

    const pageInt = parseInt(page, 10);
    const limitInt = parseInt(limit, 10); // convert string to number in decimal format
    const skip = (pageInt - 1) * limitInt;

    // build the query object
    const searchQuery = {};

    if(query) {
        searchQuery.$text = { $search: query };
    }

    if(userId) {
        searchQuery.owner = userId;
    }

    const sortCriteria = {};
    if(query) {
        sortCriteria.score = { $meta: "textScore"}
    } else {
        sortCriteria[sortBy] = sortType === "desc" ? -1 : 1;
    }

    try {
        // fetch videos from the database
        const videos = await Video.find(
            searchQuery,
            query? { score: { $meta: "textScore" }} : {}
        )
            .sort(sortCriteria) // createdAt: -1
            .skip(skip)
            .limit(limitInt)
    
        // get total count of videos that match the query regardless of pagination
        const totalVideos = await Video.countDocuments(searchQuery);
    
        res.status(200).json(
            new ApiResponse(200, {
                videos,
                totalVideos,
                totalPages: Math.ceil(totalVideos / limitInt)
            }, "Videos fetched successfully!")
        )
    } catch (error) {
        throw new ApiError(500, "Failed to fetch videos");
    }
})

// 2. infinite scrolling
const getAllVideosInfiniteScroll = asyncHandler( async(req, res) => {
    const { lastItemId = "", fetchCount = 1, limit = 10, query, sortBy = "createdAt", sortType = "desc", userId } = req.query;
    console.log({lastItemId}, typeof lastItemId);

    const limitInt = parseInt(limit, 10);

    let searchQuery = {};

    if(query) {
        searchQuery.$title = { $search: query }
    } 

    if(userId) {
        searchQuery.owner = userId; // mongoose takes care of converting string id into objectId but if you convert it explicitly then it's good. to do it use mongoose.Types.ObjectId(userId)
    }

    const sortCriteria = {};

    if(query) {
        sortCriteria.score = { $meta: "textScore" }
    } else {
        sortCriteria[sortBy] = sortType === "desc" ? -1 : 1;
    }

    if(lastItemId && !mongoose.Types.ObjectId.isValid(lastItemId)) {
        throw new ApiError(400, "Invalid lastItemId");
    }

    // condition to fetch items after the last loaded item
    if (lastItemId && lastItemId !== "" && mongoose.Types.ObjectId.isValid(lastItemId)) {
      searchQuery._id = { $gt: new mongoose.Types.ObjectId(lastItemId) };
    }

   try {
     const videos = await Video.find(
         searchQuery,
         query? { score: { $meta: "textScore" }} : {}
     )
         .sort(sortCriteria)
         .limit(limitInt)

     const totalVideos = await Video.countDocuments(searchQuery);
 
     res.status(200).json(
         new ApiResponse(200, {
            videos,
            totalVideosFound: totalVideos,
         }, "Videos fetched successfully!")
     )
   } catch (error) {
        throw new ApiError(500, "Videos fetch failed")
   }
})

// update a video
const updateVideo = asyncHandler( async(req, res) => {
    const { videoId } = req.params;
    const { title, description } = req.body;
    
    let updateFields = {};

    if(title && title?.trim()) {
        updateFields.title = title.trim();
    }

    if(description && description?.trim()) {
        updateFields.description = description.trim();
    }

    const thumbnailLocalPath = req.file?.path;

    let thumbnailUrl;
    if(thumbnailLocalPath) {
        const thumbnailResponse = await uploadOnCloudinary(thumbnailLocalPath);
        updateFields.thumbnail = thumbnailResponse.url;
    }

    const video = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: updateFields
        },
        {
            new: true // to get updated document
        }
    )

    if(!video) {
        throw new ApiError(500, "Video not updated. Please try again!");
    }

    res.status(200).json(
        new ApiResponse(200, video, "Video updated successfully!")
    )
})

// delete a video
const deleteVideo = asyncHandler( async(req, res) => {
    const { videoId } = req.params;

    const video = await Video.findById(videoId);

    if(video.owner.toString() !== req.user._id.toString()) { // Direct comparison (!==) between ObjectIds may not work as expected unless they are converted to strings.
        throw new ApiError(403, "You are not authorized to delete this video!");
    }

    const deleteVideo = await Video.findByIdAndDelete(videoId);
    
    if(!deleteVideo) {
        throw new ApiError(500, "Video not deleted. Please try again!");
    }

    res.status(200).json(
        new ApiResponse(200, null, "Video deleted successfully!")
    )
})

const togglePublishStatus = asyncHandler( async(req, res) => {
    const { videoId } = req.params;

    const video = await Video.findById(videoId);

    if(!video) {
        throw new ApiError(404, "Video not found!");
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished: !video.isPublished
            }
        },
        {
            new: true
        }
    )

    if(!updatedVideo) {
        throw new ApiError(500, "Video not updated. Please try again!");
    }

    res.status(200).json(
        new ApiResponse(200, updateVideo, `Now your video is ${updatedVideo.isPublished ? "Public. Means anyone can view it.": "Private. Means only you can view it."}. Video updated successfully!`)
    )
})

export { publishAVideo, getVideoById, getAllVideos, getAllVideosInfiniteScroll, updateVideo, deleteVideo, togglePublishStatus }