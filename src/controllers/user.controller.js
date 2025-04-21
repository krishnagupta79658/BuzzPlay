import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

const registerUser= asyncHandler( async (req, res)=>{
    const {userName ,fullName ,email ,password}=req.body

    if(
        [userName ,fullName ,email ,password].some((field)=>field?.trim()==="")
    ){
       throw new ApiError(400,"All * fields are required")
    }

    const existedUser=User.findOne({
        $or : [{userName},{email}]
    })

    if(existedUser){
        throw new ApiError(409,"User with email or username  already exists")
    }

    const avatarLocalPath=req.files?.avatar[0]?.path
    const coverImageLocalPath=req.files?.coverImage[0]?.path
    if(!avatarLocalPath){
        throw new ApiError(400,"avatar file is required")
    }

   const avatar= await uploadOnCloudinary(avatarLocalPath)
   const coverImage=await uploadOnCloudinary(coverImageLocalPath)
   if(!avatar){
    throw new ApiError(400,"avatar file is required")

   }

   const user=await User.create({
    fullName,
    email,
    avatar:avatar.url,
    coverImage:coverImage?.url || "",
    userName:userName.toLowerCase(),
    password,
   })
   const createdUser=User.findById(user._id).select(
    "-password -refreshToken"
   )
   if(!createdUser){
    throw new ApiError(500,"something went wrong while registering the user")
   }

   res.status(200).json(
    new ApiResponse(200,createdUser,"User registered successfully")
   )

})

export {registerUser}