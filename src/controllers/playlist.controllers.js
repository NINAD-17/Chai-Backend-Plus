import mongoose from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createPlaylist = asyncHandler( async(req, res) => {
    const { name, description, videos, isPublic = false } = req.body;

    if(!Array.isArray(videos)) {
        throw new ApiError(400, "Videos should be an array!");
    }

    if(videos.length < 1) {
        throw new ApiError(400, "At least one video is required!");
    }
    
    const trimmedName = name?.trim();
    const trimmedDescription = description?.trim() || "";

    if(!trimmedName) {
        throw new ApiError(400, "Name is required!");
    }

    // create a new playlist
    const playlist = await Playlist.create({
        name: trimmedName,
        description: trimmedDescription,
        videos,
        owner: req.user._id,
        isPublic
    });

    if(!playlist) {
        throw new ApiError(500, "Failed to create playlist!");
    }

    res.status(201).json(
        new ApiResponse(201, playlist, "Playlist created successfully!")
    );
})

const getUserPlaylists = asyncHandler( async(req, res) => {
    const { userId } = req.params;

    const matchWith = {};
    if(userId.toString() === req.user._id.toString()) {
        matchWith.owner = new mongoose.Types.ObjectId(userId);
    } else {
        matchWith.owner = new mongoose.Types.ObjectId(userId),
        matchWith.isPublic = true  
    }

    try {
        const userPlaylists = await Playlist.aggregate([
            {
                $match: matchWith
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
                $unwind: "$owner"
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    description: 1,
                    isPublic: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    owner: {
                        _id: "$owner._id",
                        username: "$owner.username",
                        avatar: "$owner.avatar"
                    },
                    totalVideos: { $size: "$videos" }
                }
            }
        ])
    
        if(!userPlaylists.length) {
            return res.status(200).json(
                new ApiResponse(200, "User don't have any playlists!")
            )
        }

        return res.status(200).json(
            new ApiResponse(200, {userPlaylists, totalPlaylists: userPlaylists.length}, "User playlists fetched successfully!")
        )
    } catch (error) {
        throw new ApiError(500, "Failed to fetch playlists!");
    }
})

const getPlaylistById = asyncHandler( async(req, res) => {
    const { playlistId } = req.params;

    try {
        const playlist = await Playlist.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(playlistId)
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
                $unwind: "$owner"
            },
            {
                $lookup: {
                    from: "videos",
                    localField: "videos",
                    foreignField: "_id",
                    as: "videos",
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
                            $unwind: "$owner"
                        }
                    ]
                }
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    description: 1,
                    isPublic: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    playlistOwner: {
                        _id: "$owner._id",
                        username: "$owner.username",
                        avatar: "$owner.avatar"
                    },
                    videos: {
                        _id: 1,
                        title: 1,
                        description: 1,
                        createdAt: 1,
                        owner: {
                            _id: "$owner._id",
                            username: "$owner.username",
                            avatar: "$owner.avatar"
                        }
                    },
                    totalVideos: { $size: "$videos" }
                }
            }
        ]);
    
        if(!playlist) {
            throw new ApiError(404, "Playlist not found!");
        }

        res.status(200).json(
            new ApiResponse(200, playlist, "Playlist fetched successfully!")
        )
    } catch (error) {
        throw new ApiError(500, "Failed to fetch playlist!");
    }
});

const addVideoToPlaylist = asyncHandler( async(req, res) => {
    const { playlistId, videoId } = req.params;

    try {
        const addVideo = await Playlist.findByIdAndUpdate(
            playlistId,
            {
                $push: {
                    videos: new mongoose.Types.ObjectId(videoId)
                }
            },
            { 
                new: true
            }
        )

        if(!addVideo) {
            throw new ApiError(404, "Playlist or video not found!");
        }

        res.status(200).json(
            new ApiResponse(200, addVideo, "Video added to playlist successfully!")
        )
    } catch (error) {
        throw new ApiError(500, "Failed to add video to playlist!");
    }
})

const removeVideoFromPlaylist = asyncHandler( async(req, res) => {
    const { playlistId, videoId } = req.params;

    try {
        const updatedPlaylist = await Playlist.findByIdAndUpdate(
            playlistId,
            {
                $pull: {
                    videos: new mongoose.Types.ObjectId(videoId)
                }
            },
            {
                new: true
            }
        )

        if(!updatedPlaylist) {
            throw new ApiError(404, "Playlist or video not found!");
        }

        res.status(200).json(
            new ApiResponse(200, updatedPlaylist, "Video removed from playlist successfully!")
        )
    } catch (error) {
        throw new ApiError(500, "Failed to remove video from playlist!");
    }
});

const deletePlaylist = asyncHandler( async(req, res) => {
    const { playlistId } = req.params;

    try {
        const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId);

        if(!deletedPlaylist) {
            throw new ApiError(404, "Playlist not found!");
        }

        res.status(200).json(
            new ApiResponse(200, "Playlist deleted successfully")
        )
    } catch (error) {
        throw new ApiError(500, "Failed to delete playlist!");
    }
})

const updatePlaylist = asyncHandler( async(req, res) => {
    const { playlistId } = req.params;
    const { name, description, isPublic } = req.body;

    const updateFields = {};

    if (name !== undefined && name.trim() !== "") updateFields.name = name.trim(); 
    if (description !== undefined) updateFields.description = description.trim(); 
    if (isPublic !== undefined) updateFields.isPublic = isPublic;
    
    try {
        const updatedPlaylist = await Playlist.findByIdAndUpdate(
            playlistId,
            { $set: updateFields },
            { new: true}
        )

        if(!updatedPlaylist) {
            throw new ApiError(404, "Playlist not found!");
        }

        res.status(200).json(
            new ApiResponse(200, updatedPlaylist, "Playlist updated successfully!")
        )
    } catch (error) {
        throw new ApiError(error, "Error while updating playlist!");
    }
})

export { createPlaylist, getUserPlaylists, getPlaylistById, addVideoToPlaylist, removeVideoFromPlaylist, deletePlaylist, updatePlaylist };