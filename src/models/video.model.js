import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema(
  {
    videoFile: {
      type: String, // cloudinary url
      required: true,
    },
    thumbnail: {
      type: String, // cloudinary url
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    duration: {
        type: Number, // get from cloudinary
        required: true
    },
    views: {
        type: Number,
        default: 0
    },
    isPublished: {
        type: Boolean,
        default: true
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true // index on owner for faster searching of the video uploaded by specific user(owner)
    }
  },
  { timestamps: true }
);

videoSchema.plugin(mongooseAggregatePaginate)

videoSchema.index({ title: "text", description: "text" }); // full-text index on title and description for text search // whenever you search for query then it'll search the query in both title and the description

export const Video = mongoose.model("Video", videoSchema);