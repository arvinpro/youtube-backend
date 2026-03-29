import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ErrorApi.js";
import { User } from "../models/users.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";
import { Mongoose } from "mongoose";

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

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const {oldPassword, newPassword} = req.body

   // 1. Validate input
  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "Old password and new password are required");
  }

  //get loged-in user
  const user = await User.findById(req.user?._id)
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

  if(!isPasswordCorrect) throw new ApiError(401, "invalid password")

    user.password = newPassword

    await user.save({validateBeforeSave: false})

    return res.status(200).json(new ApiResponse(200, {}, "password changed successfully"))

})

const getCurrentUser = asyncHandler(async(req,res)=>{
  return res.status(201)
  .json(new ApiResponse(201, req.user, "current user fetch successfully"))
})

const updateAccountDetail = asyncHandler(async (res, req) =>{
  const {fullname, email} = req.body

  if(!fullname && !email) throw new ApiError(402, "email and username are required")

  const user = User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname,
        email
      } //set operator helps to set new value not change any other fields
    },
    {new: true} //return new value 
  ).select("-password")

  return res.status(200).json(new ApiResponse(2001, user, "Account details update"))
})


const updateAvatar = asyncHandler(async (res, req)=> {
  const avatarLocalPath = req.files?.path
  if(!avatarLocalPath) throw new ApiError(404, "avatar file is missing")

  const avatar = await uploadOnCloudinary(avatarLocalPath)

  if(!avatar.utl) throw new ApiError(401,"Error while uploading avatar")

   const user =  await User.findByIdAndUpdate(
      res.user?._id,
      {
        $set: {
          avatar: avatar.url
        }
      },
      {new: true}
    ).select("-password")

    return new ApiResponse(202, user, "update avatar successfully")
})


const updateCoverImage = asyncHandler(async (res, req)=> {
  const coverImagePath = req.files?.path
  if(!coverImage) throw new ApiError(404, "cover image file is missing")

  const coverImage = await uploadOnCloudinary(coverImagePath)

  if(!coverImage.utl) throw new ApiError(401,"Error while uploading cover image")

    const user = await User.findByIdAndUpdate(
      res.user?._id,
      {
        $set: {
          coverImage: coverImage.url
        }
      },
      {new: true}
    ).select("-password")

    return new ApiResponse(201, user, "cover image updated") 
})


const getUserChannelProfile = asyncHandler(async (req, res)=> {
  const {username} = req.params

  if(!username?.trim()) throw new ApiError(404, "username not found")

 const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase()
      }
    },
    {
      $lookup: {
        from: "subscription",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers"
      },
      $lookup: {
        from: "subscription",
        localField: "_id",
        foreignField: "subscribers",
        as: "subscribersTo"
      },
      $addFields: {
        subscribersCount: {
          $size: "$subscribers"
        },
        channelsSubscribedToCount: {
          $size: "$subscribersTo"
        },
        isSubscribed: {
          $cond: {
            if: {$in: [req.user?._id, "$subscribers.subscriber"]},
            then: true,
            else: false
          }
        }
      },
      $project: {
        fullname: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1
      }
    }
  ])

  if(!channel?.length) throw new ApiError(401,"channel doesnot exist")
    
  return res
  .status(200)
  .json(200,channel[0], "User channel feteched successfully")

})

const getWatchHistory = asyncHandler(async (req, res)=> {
    const user = await User.aggregate([
      {
        $match: {
          _id: new Mongoose.Types.ObjectId(req.user._id)
        }
      },
      {
        $lookup: {
          from: "Video",
          localField: "watchHistory",
          foreignField: "_id",
          as: "watchHistory",
          pipeline: [
            {
              $lookup: {
                from: "User",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                  {
                    $project: {
                      fullname: 1,
                      username: 1,
                      avatar: 1
                    }
                  }
                ]
              }
            },
            {
              $addFields: {
                owner: {
                  $first: "owner"
                }
              }
            }
          ]
        }
      }
    ])
    return res.
    status(200),
    new ApiResponse(200, user[0].watchHistory,"watch history fetched")
})

export { 
  registerUser, 
  loginUser,
  logOutUser,
  changeCurrentPassword,
  getCurrentUser ,
  updateAccountDetail,
  updateAvatar,
  updateCoverImage,
  getUserChannelProfile,
  getWatchHistory
};
