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

   
    const existedUser=await User.findOne({
        $or : [{userName},{email}]
    })
    
    if(existedUser){
        throw new ApiError(409,"User with email or username  already exists")
    } 
    
    const avatarLocalPath=req.files?.avatar[0]?.path
   
    //const coverImageLocalPath=req.files?.coverImage[0]?.path
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0 ){
        coverImageLocalPath=req.files.coverImage[0].path
    }
    if(!avatarLocalPath){
        throw new ApiError(400,"avatar file is required")
    }
   
    
    const avatar= await uploadOnCloudinary(avatarLocalPath)
    
    const coverImage=await uploadOnCloudinary(coverImageLocalPath)
    if(!avatar){
        throw new ApiError(400,"avatar file is required")   
    }
    
   

   const user=await User.create({
    fullName:fullName,
    email:email,
    avatar:avatar.url,
    coverImage:coverImage?.url || "",
    userName:userName.toLowerCase(),
    password:password,
   })
   const createdUser=await User.findById(user._id).select(
    "-password -refreshToken"
   )
   
   
   if(!createdUser){
    throw new ApiError(500,"something went wrong while registering the user")
   }

   res.status(201).json(
    new ApiResponse(201, createdUser ,"User Registered Successfully")
   )

})

export {registerUser}