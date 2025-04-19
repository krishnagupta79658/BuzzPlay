import mongoose from "mongoose"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
const userSchema=new mongoose.Schema({
  watchHistory:[
    {
        type:mongoose.Schema.Types.ObjectId,
        ref:Video
    }
  ],
  username:{
    type:String,
    required:true,
    unique:true,
    lowercase:true,
    trim:true,
    index:true,
  },
  email:{
    type:String,
    required:true,
    unique:true,
    lowercase:true,
    trim:true,
  },
  fullName:{
   type:String,
   required:true,
   trim:true,
   index:true,
  },
  avatar:{
    type:String,
    required:true,
  },
  coverImage:{
    type:String,
    
  },
  password:{
    type:String,
    required:[true,"Password is required"],
  },
  refreshToken:{
 type:String,
  },

},{timestamps:true})

//encrypting the password
userSchema.pre("save",async function (next){
    if(!this.isModified("password")) return next()
   this.password= await bcrypt.hash(this.password,10)
   next()
})
//verifying  the password // custom hooks
userSchema.methods.isPasswordCorrect=async function(password){
   return await bcrypt.compare(password,this.password)
}
userSchema.methods.generateAccessToken=function(){
   return jwt.sign({
    _id:this._id,
    email:this.emial,
    username:this.username,
    fullName:this.fullName,
  },process.env.ACCESS_TOKEN_SECRET,
{
  expiresIn:process.env.ACCESS_TOKEN_EXPIRY
})
}
userSchema.methods.generateRefreshToken=functon(){
  return jwt.sign({
    _id:this._id,
  },process.env.REFRESH_TOKEN_SECRET,
{
  expiresIn:process.env.REFRESF_TOKEN_EXPIRY
})
}
export const  User=mongoose.model("User",userSchema)