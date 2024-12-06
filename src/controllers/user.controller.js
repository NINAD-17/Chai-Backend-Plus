import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/asyncHandlers.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const registerUser = asyncHandler( async (req, res) => {
    // step 1: get user details from frontend
    const { username, fullname, email, password } = req.body;
    console.log({email});

    // step 2: validation - not empty
    if (
      [fullname, email, username, password].some((field) => {
        return field?.trim() === ""; // here, we're checking if the field has some value or not, if it has then remove the whitespaces. After removing whitespaces, if there's no value then false. "    " => ""
      })
    ) {
        throw new ApiError(400, "All fields are required!");
    }

    // step 3: Check if user already exists: username, email
    const existedUser = User.findOne({
        $or: [{ username }, { email }]
    });

    if(existedUser) {
        throw new ApiError(409, "User with email or username already exist")
    }

    // step 4: check for images, avatars
    console.log("req.files from multer: ", req.files);
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath) throw new ApiError(400, "Avatar file is required!");
    // cover image isn't necessary - according to schema

    // step 5: upload files to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar) throw new ApiError(400, "Avatar file is required!");

    // step 6: create user object - create entry in db
    const user = await User.create({
        fullname, 
        avatar: avatar.url,
        coverImage: coverImage?.url || "", // if there's no coverImage then store ""
        username: username.toLowerCase(),
        email,
        password
    });

    // step 7: remove password and refresh token field from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if(!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user");
    }

    // step 8: return res
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully!")
    )
})

export { registerUser };