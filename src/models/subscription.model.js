import mongoose from "mongoose"
const subscriptionSchema=new mongoose.Schema({
  subscribers:{
    type:mongoose.Schema.Types.ObjectId,//one who is subscriing
    ref:"User",
  },
  channel:{
    type:mongoose.Schema.Types.ObjectId,//user to whom subscribers are subscribing
    ref:"User"
  }
},{timestamps:true})

export const Subscription=mongoose.model("Subscription",subscriptionSchema)