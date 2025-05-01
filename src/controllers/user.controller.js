import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"
const generateAccessAndRefreshTokens=async(userId)=>{
  try {
    
   const user =await User.findById(userId)
   const accessToken=user.generateAccessToken()
   const refreshToken=user.generateRefreshToken()
   
   user.refreshToken=refreshToken
   await user.save({validateBeforeSave:false})
   return {accessToken,refreshToken}
  } catch (error) {
    throw new ApiError(500,"Something went wrong while generating access and refresh token")
  }
}

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

const loginUser= asyncHandler(async (req,res)=>{
  const {userName,email , password}=req.body
 
  if(!(userName || email)){
    throw new ApiError(400,"username or email is required")
  }
  const user=await User.findOne({
    $or:[{userName},{email}]
  })
  if(!user){
    throw new ApiError(404,"user does not exist")
  }
  const isPasswordValid =await user.isPasswordCorrect(password)
  if(!isPasswordValid){
    throw new ApiError(401,"Invalid user credentials")
  }

  const {accessToken,refreshToken}=await generateAccessAndRefreshTokens(user._id)
  //here we querying db but you can update user as user does not contain the refreshToken value here (depending upon you can bear this expensive cost)
  const loggedInUser=await User.findById(user._id).select("-password -refreshToken")
 //as cookies can be modified through frontend but after passing the options object , 
 //now it is only moddifiable through server only
  const options ={
    httpOnly:true,
    secure:true
  }
  return res.status(200)
  .cookie("accessToken",accessToken,options)
  .cookie("refreshToken",refreshToken,options)
  .json(
    new ApiResponse(
 200,{
  //here we are explicitely sending the access and refresh token ,considering the case when the user 
  //is trying to save it for the mobile application as cookie option is not available in mobile apps
  //or the user is sending you the custom header through API
    user:loggedInUser,accessToken,refreshToken,
 },
 "user logged in successfully")
  

)
})

const logoutUser=asyncHandler(async (req,res)=>{
   
   await User.findByIdAndUpdate(
    req.user._id,{
     $set:{refreshToken:undefined}
   },{ 
    //it will return the updated user now
    new:true
   })



const options ={
  httpOnly:true,
  secure:true
}

return res.status(200)
.clearCookie("accessToken",options)
.clearCookie("refreshToken",options)
.json(
  new ApiResponse(200,{},"User logged out successfully")
)
})

const refreshAccessToken=asyncHandler(async(req,res)=>{
  const incomingRefreshToken=req.cookies?.refreshToken || req.body?.refreshToken
  if(!incomingRefreshToken){
    throw new ApiError(401,"unauthorized request")
  }
 try {
   const decodedToken=jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
   const user=User.findById(decodedToken?._id)
   if(!user){
     throw new ApiError(401,"Invalid Refresh Token")
   }
   if(incomingRefreshToken !== user.refreshToken){
     throw new ApiError(401," Refresh Token is expired or used")
   }
   const {accessToken,newRefreshToken}=await generateAccessAndRefreshTokens(user._id)
   const options ={
     httpOnly:true,
     secure:true
   }
    return res.status(200).cookie("accessToken",accessToken,options)
    .cookie("refershToken",newRefreshToken,options)
    .json(new ApiResponse(200,{
     accessToken,refreshToken:newRefreshToken
    },
   "access and refresh token are refreshed"))
 } catch (error) {
  throw new ApiError(401,error?.message || "Invalid refresh Token")
 }
})

const changeCurrentPassword=asyncHandler(async (req,res)=>{
  const {oldPassword,newPassword,confirmPassword}=req.body
  if(newPassword !== confirmPassword){
    throw new ApiError(400,"newPassword and confirmPassword must be same")
  }
  const user=User.findById(req.user?._id)
  const isPasswordValid=await user.isPasswordCorrect(oldPassword)
  if(!isPasswordValid){
    throw new ApiError(400,"old Password is not correct")
  }
  
  user.password=newPassword
  await user.save({ValidateBeforeSave:false})
  return res.status(200).json(new ApiResponse(200,{},"Password changed Successfully"))

})

const getCurrentUser=asyncHandler(async (req,res)=>{
  return res.status(200).json(new ApiResponse(200,req.user,"current user fetched successfully"))
}) 

const updateAccountDetails=asyncHandler(async(req,res)=>{
  const {fullName,email}=req.body
  if(!(fullName || email )){
    throw new ApiError(400,"fullname or email is required")
  }
  const user=User.findById(req.user._id)
   if(fullName) user.fullName=fullName
   if(email) user.email=email
   await user.save({ValidateBeforeSave:false})


  return res.status(200).json(
    new ApiResponse(200,user,"update successful")
  )

})

const updateUserAvatar =asyncHandler(async (req,res)=>{
  const avatarLocalPath=req.file?.path
  if(!avatarLocalPath){
    throw new ApiError(400,"avatar is required")

  }
  const avatar=await uploadOnCloudinary(avatarLocalPath)
  if(!avatar.url){
    throw new ApiError(400,"Error while uploading avatar on cloudinary")
  }
  const user=await User.findByIdAndUpdate(req.user._id,
    {
      $set:{
        avatar:avatar.url
      }
    },
    {
      new:true
    }
  ).select("-password")
  return res.status(200).json(new ApiResponse(200,user,"Avatar updated successfully"))
})

const updateUsercoverImage =asyncHandler(async (req,res)=>{
  const coverImageLocalPath=req.file?.path
  if(!coverImageLocalPath){
    throw new ApiError(400,"avatar is required")

  }
  const coverImage=await uploadOnCloudinary(coverImageLocalPath)
  if(!coverImage.url){
    throw new ApiError(400,"Error while uploading coverImage on cloudinary")
  }
  const user=await User.findByIdAndUpdate(req.user._id,
    {
      $set:{
        coverImage:coverImage.url
      }
    },
    {
      new:true
    }
  ).select("-password")
  return res.status(200).json(new ApiResponse(200,user,"Avatar updated successfully"))
})


const getUserChannelProfile=asyncHandler(async (req,res)=>{
  const {userName}=req.params
  if(!userName?.trim()){
    throw new ApiError(400,"User does not found")
  }
  const channel =await User.aggregate([
    {
      $match:{
        userName:userName?.toLowerCase()
      }
    },
    {
      $lookup:{
        from:"subscriptions",
        localField:"_id",
        foreignField:"channel",
        as:"subscribers"
      }
    },
    {//lookup is used to perfrom the join operation on the tables(documents)
      $lookup:{
        from:"subscriptions",
        localField:"_id",
        foreignField:"subscriber",
        as:"subscribedTo"

      }
    },
    {
      //addFields is used to add new fields to the existing object but these are not present into the database
      $addFields:{
        subscribersCount:{
          //size is used to count the number in the field , here $ is used before subscribers because it is a field here
          $size:"$subscribers"
        },

        channelsSubscribedToCount:{
            $size:"$subscribedTo"
        },
        isSubscribed:{
          $cond:{
            //$in : can checks in both object and array,here object
            if:{$in: [req.user?._id,"$subscribers.subscriber"]},
            then:true,
            else:false
          }
        }
      }
    },
    {//project is used to list out the specific/allowed information(fields) 
      $project:{
        fullName:1,
        userName:1,
        avatar:1,
        coverImage:1,
        subscribersCount:1,
        channelsSubscribedToCount:1,
        isSubscribed:1,
      }
    }
  ])
  if(!channel?.length){
    throw new ApiError(404,"Channel does not exists")
  }
  return res.status(200).json(new ApiResponse(
    200,channel[0],"Channel fetched successfully"
  ))
})

const getWatchHistory=asyncHandler(async (req,res)=>{
  const user=await User.aggregate([{
    //important for interview
    //in aggreate pipelines code is directly intereact with the mongodb without mongoose
    //generally req.user._id will return you a "string" but with the help of mongoose, it internally convert it into mongodb id as ObjectId("string")
    $match:{
      _id:new mongoose.Types.ObjectId(req.user._id)
  }
},
    {
       $lookup:{
        from:"videos",
        localField:"watchHistory",
        foreignField:"_id",
        as:"watchHistory",
        pipeline:[
          {
            $lookup:{
              from:"users",
              localField:"owner",
              foreignField:"_id",
              as:"owner",
              pipeline:[
                {
                  $project:{
                    usernameatar:1,
                    fullName:1,
                    avatar:1
                  }
                }
              ]
            }
          },
          {
            $addFields:{
              owner:{
                //used to pick the first element from the array or $Arrayelementat
                $first:"$owner"
              }
            }
          }
        ]

       }
     }
    ])
    return res.status(200).json(new ApiResponse(200,user[0].getWatchHistory,"watch history fetched successfully"))
}) 


export {registerUser,
  updateUserAvatar,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword
  ,getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUsercoverImage,
  getUserChannelProfile,getWatchHistory}
