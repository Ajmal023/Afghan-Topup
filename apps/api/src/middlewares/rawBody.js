// src/middlewares/rawBody.js
export const rawBodyMiddleware = (req, res, next) => {
    if (req.path === '/webhook/stripe') {
        let data = '';
        req.setEncoding('utf8');
        req.on('data', (chunk) => {
            data += chunk;
        });
        req.on('end', () => {
            req.rawBody = data;
            next();
        });
    } else {
        next();
    }
};