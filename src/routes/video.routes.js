import { Router } from "express";
import { publishAVideo, getVideoById, getAllVideos, getAllVideosInfiniteScroll, deleteVideo, updateVideo, togglePublishStatus } from "../controllers/video.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/").get(getAllVideos);
router.route("/infinite-scroll").get(getAllVideosInfiniteScroll);

router.route("/upload-video").post(upload.fields([
    { name: "videoFile", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 }
]), publishAVideo);

router.route("/:videoId")
    .get(getVideoById)
    .delete(deleteVideo)

router.route("/:videoId").patch(
    upload.single("thumbnail"),
    updateVideo
);

router.route("/:videoId/toggle/publish").patch(togglePublishStatus);

export default router;