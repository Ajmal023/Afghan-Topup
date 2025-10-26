// src/middlewares/apiKeyAuth.js
export const requireApiKey = (req, res, next) => {
    const apiKey = req.headers['api-key'] || req.headers['API-KEY'];
    const apiSecret = req.headers['api-secret'] || req.headers['API-SECRET'];
    
    // ✅ Use the same keys as your Laravel backend
    const validApiKey = "fpJmvbAdGgDbUedcb7ITojCn8USPwn5g";
    const validApiSecret = "qHFbJregunBUefLWzr0uIDqDP1UCaSjf";
    
    if (apiKey === validApiKey && apiSecret === validApiSecret) {
        next();
    } else {
        return res.status(401).json({ data: "Unauthorized" });
    }
};