import mongoose, { Schema } from "mongoose";

const likeSchema = new Schema({
    video: {
        type: Schema.Types.ObjectId,
        ref: "Video",
    },
    comments: {
        type: Schema.Types.ObjectId,
        ref: "Comment"
    },
    tweet: {
        type: Schema.Types.ObjectId,
        ref: "Tweet"
    },
    likedBy: {
        type: Schema.Types.ObjectId,
        ref: "User"
    }
}, { timestamps: true });


likeSchema.index({ video: 1 });
likeSchema.index({ comment: 1 });
likeSchema.index({ tweet: 1 });
likeSchema.index({ likedBy: 1 });

// Before saving likes make sure that in each document there should be only one of video, comment, or tweet
likeSchema.pre("save", function(next) {
    if((this.video && this.comment) || (this.video && this.tweet) || (this.comment && this.tweet)) {
        return next(new ApiError(400, "Only one of Video, Comment, or Tweet is should be"))
    }
    next();
})

export const Like = mongoose.model("Like", likeSchema);