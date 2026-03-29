import { Router } from "express";
import { loginUser, logOutUser, registerUser, changeCurrentPassword, getCurrentUser, updateAccountDetail, updateAvatar, updateCoverImage, getUserChannelProfile, getWatchHistory } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()
//
router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
)
router.route("/login").post(loginUser)

router.route("/logout").post(verifyJWT,logOutUser)

router.route("/change-password").post(verifyJWT, changeCurrentPassword)

router.route("/current-user").get(verifyJWT, getCurrentUser)

router.route("/update-account").patch(verifyJWT, updateAccountDetail)

router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateAvatar)

router.route("/cover-image").patch(verifyJWT, upload.single("coverImage"), updateCoverImage)

router.route("/c/:username").get(verifyJWT, getUserChannelProfile)

router.route("/history").get(verifyJWT, getWatchHistory)

export {router}