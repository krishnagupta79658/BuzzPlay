import multer from "multer";

const storage =multer.diskStorage({
    destination:function (req,file,cb){
        cb(null,"./public/temp")
    },
    filename:function (req,file,cb){
        cb(null,file.originalname)//implement (in future): save images or anything with the unique name otherwise it will overwrite
    }
})

export const upload=multer({
    storage:storage,
})

