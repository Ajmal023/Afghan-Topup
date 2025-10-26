export const errorHandler = (err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
    code: err.code || "SERVER_ERROR",
    details: err.details || null,
  });
};
