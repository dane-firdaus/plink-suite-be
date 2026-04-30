const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const models = require('../../models');
const {v4 : uuid} = require('uuid');

const register = async (req, res) => {
    const {username, email, password, role_id, division_id, fullname, uid} = req.body;
    try {
        const userChecking = await models.getUserByEmail(email);
        if(userChecking){
            return res.status(400).json({
                message : "email already exists",
                status : 400
            });
        } else {
            const hashedPassword = bcrypt.hashSync(password, 10);
            const user = await models.register({
                username,
                email,
                fullname,
                password : hashedPassword,
                role_id,
                division_id,
                uid : uuid(),
                created_at : new Date(),
                updated_at : new Date()
            });
            const generateToken = jwt.sign({email: user.email, uid : user.uid}, process.env.JWT_SECRET, {expiresIn: "1h"});
            const generateRefreshToken = jwt.sign({email: user.email, uid : user.uid}, process.env.JWT_SECRET, {expiresIn: "30d"});
            res.status(200).json({
                message : "user created successfully",
                status : 200,
                user : user,
                token : generateToken,
                refreshToken : generateRefreshToken
            });
        }
    } catch (error) {
        console.log(error.stack);
        res.status(500).json({
            message : "internal server error !",
            status : 500
        });
    }
}

module.exports = register