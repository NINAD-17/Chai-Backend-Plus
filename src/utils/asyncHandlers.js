// -> METHOD 2:
const asyncHandler = (requestHandler) => {
    (req, res, next) => {
        Promise
            .resolve(requestHandler(req, res, next))
            .catch((error) => next(error))
    }
};

export { asyncHandler };


/*
// -> METHOD 1
// Above code in try catch block
// Here, fn is function (higher order function)
// We're passing incomming function fn to another function as a parameter
// const asyncHandler = (fn) => { () => {} } // Below function is doing this.
// In below code we extracted (req, res, next) from fn
const asyncHandler = (fn) => async (req, res, next) => {
    try {
        await fn(req, res, next)
    } catch (error) {
        res.status(error.code || 500).json({ // error.code if user is passing otherwise 500
            success: false, 
            message: error.message
        })
    }
};
*/