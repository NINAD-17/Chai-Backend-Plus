// require("dotenv").config({ path: "./env" }); // commented because this syntax is inconsitent means it's not following 'import'
import dotenv from "dotenv";
import connectDB from "./db/index.js";
import app from "./app.js";

dotenv.config({
    path: "./env"
})

connectDB()
    .then(() => {
        app.listen(process.env.PORT || 8000, () => {
            console.log(`Server is running at port: ${process.env.PORT}`)
        })

        // listening for the event of error
        app.on("error", (error) => {
            console.log("Error: ", error);
            throw error;
        })
    })
    .catch((error) => {
        console.log("MONGODB connection failed !!! ", error)
    })



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