import dotenv from "dotenv"
import { DB_NAME } from "./constants.js"
import connectDB from "./db/db.js"
dotenv.config({path : "./env"})
import app from "./app.js"





connectDB()
.then(()=>{
    app.on("error",(error)=>{
        console.error("Error:",error)
        throw error
    })
    app.listen(process.env.PORT || 8000,console.log(`Serve ris running at port :${process.env.PORT}`))
})
.catch((error)=>{
    console.log("mongo_db connection is failed:",error)
throw error
})





























/*
const app=express()
(async ()=>{
    try{
        await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
        //at this point DB is connected but express may not be able to talk to DB due to some reason  
        app.on("error",(error)=>{
            console.error("Error:",error)
            throw error
        })
        app.listen(process.env.PORT,()=>{console.log(`Server is listenning on port:${process.env.PORT}`)})

    }

    catch(error){
        console.error("Error:",error)
        throw error
    }
})()
*/