import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ErrorApi.js";
import { User } from "../models/users.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";

const GenerateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    //save in db
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      402,
      "Something went wrong while generating access and refresh token"
    );
  }
};
const registerUser = asyncHandler(async (req, res) => {
  const { username, email, fullname, password } = req.body || {};

  //validation
  if (
    [username, email, fullname, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  //check user is already available or not
  const existedUser = await User.findOne({
    $or: [{ email }, { username }], //match any conditions
  });

  if (existedUser) {
    throw new ApiError(409, "Already Registered");
  }

  //get local path of images
  const avatarLocationPath = req.files?.avatar[0].path;
  const coverIamgeLocationPath = req.files?.coverImage?.[0]?.path;

  if (!avatarLocationPath) throw new ApiError(400, "Avatar file is required");

  //upload to cloudinary
  const avatar = await uploadOnCloudinary(avatarLocationPath);
  const cover = await uploadOnCloudinary(coverIamgeLocationPath);

  if (!avatar) throw new ApiError(400, "Avatar is required");

  //upload to db
  const user = await User.create({
    avatar: avatar.url,
    coverImage: cover?.url || "",
    email,
    fullname,
    password,
    username: username.toLowerCase(),
  });

  //fetching user again to find user is created or not || even user is created we again done extract query to exclude passoword and refreshToken
  const createUser = await User.findById(user._id).select(
    "-password -refreshToken"
  ); //select exclude to send pass or refreshToken to frontend

  if (!createUser)
    throw new ApiError(500, "Something went wrong while registering the user");

  return res
    .status(200)
    .json(new ApiResponse(200, createUser, "user registered"));
});

const loginUser = asyncHandler(async (req, res) => {
  // req.body bata data lyaune
  // username and email xa ki nai
  // find the user
  //check password
  //access and refresh token access
  //send in cookies
  //send response
  const { username, email, password } = req.body;

  console.log("body ", req.body);

  if (!username && !email)
    throw new ApiError(400, "username and password is required");

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) throw new ApiError(404, "user not registered");

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) throw new ApiError(401, "invalid credentials");

  const { accessToken, refreshToken } = await GenerateAccessAndRefreshToken(
    user._id
  );
  console.log("accessToken:", accessToken);
  console.log("refreshToken:", refreshToken);

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  //send to cookies
  const options = {
    httpOnly: true, //cookie only modified from server
    secure: false,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "user logged in successfully"
      )
    );
});

const logOutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(201, {}, "User LogOut");
});

export { registerUser, loginUser, logOutUser };
