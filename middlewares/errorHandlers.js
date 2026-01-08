// route not found error handler
const notFoundHandler = (req, res) => {
    res.status(404).json({
        message: "Content Not Found"
    })
}

// default error handler
const defaultErrorHandler = (err, req, res, next) => {
    res.locals.error = { message: err.message };

    res.status(err.status || 500).json(res.locals.error);

}

module.exports = { notFoundHandler, defaultErrorHandler };