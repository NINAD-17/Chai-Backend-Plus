// require("dotenv").config({ path: "./env" }); // commented because this syntax is inconsitent means it's not following 'import'
import dotenv from "dotenv";
import connectDB from "./db/index.js";

dotenv.config({
    path: "./env"
})

connectDB();



/* // METHOD 1: CONTAIN ALL THE CODE IN INDEX FILE ONLY 
import express from "express"
const app = express();

;( async() => {
    try {
        mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error", (error) => {
            console.log("Error: Application isn't able to talk with DB\n", error);
            throw error
        })

        app.listen(process.env.PORT, () => {
            console.log(`App is listening on port ${process.env.PORT}`)
        })
    } catch(error) {
        console.log("ERROR: ", error);
        throw error
    }
} )()
*/