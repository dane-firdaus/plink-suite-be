const jwt = require('jsonwebtoken');


const verifyToken = (req, res, next) => {
let Token = req.body.token || req.query.token || req.headers['authorization'];
if(!Token){
    return res.status(403).json({message : "a token required for authentication !"});
}
try {
    Token = Token.replace(/^Bearer\s+/,"");
    const decoded = jwt.verify(Token, process.env.JWT_SECRET);
    req.user = decoded;
} catch (error) {
    console.log(error.stack)
    return res.status(401).send('Invalid Token !');
}
return next();  
}

module.exports = verifyToken;