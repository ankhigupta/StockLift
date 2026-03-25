const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message || "Internal server error",
    code: err.code || "INTERNAL_ERROR",
  });
};

const notFound = (req, res) => {
  res.status(404).json({
    error: `Route ${req.originalUrl} not found`,
    code: "NOT_FOUND",
  });
};

module.exports = { errorHandler, notFound };