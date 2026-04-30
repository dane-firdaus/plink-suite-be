const models = require('../../models');
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {
    resolveWorkspaceAccess,
    resolveDefaultWorkspace,
} = require("../../utils/workspace-access");

const login = async (req, res) => {
    try {
        const {email, password} = req.body;
        const userChecking = await models.getUserByEmail(email);
        if(!userChecking){
            return res.status(400).json({
                message : "email not found",
                status : 400
            });
        }
        const passwordChecking = bcrypt.compareSync(password, userChecking.password);
        if(!passwordChecking){
            return res.status(400).json({
                message : "password not match",
                status : 400
            });
        }
        const workspaceAccess = resolveWorkspaceAccess(userChecking);
        const defaultWorkspace = resolveDefaultWorkspace(userChecking, workspaceAccess);
        const authPayload = {
            email: userChecking.email,
            uid : userChecking.uid,
            role_id : userChecking.role_id,
            workspace_access: workspaceAccess,
            default_workspace: defaultWorkspace,
        };
        const generateToken = jwt.sign(authPayload, process.env.JWT_SECRET, {expiresIn: "4h"});
        const generateRefreshToken = jwt.sign(authPayload, process.env.JWT_SECRET, {expiresIn: "30d"});
        res.status(200).json({
            message : "login successfully",
            status : 200,
            user : {
                email : userChecking.email,
                fullname : userChecking.fullname,
                role_id : userChecking.role_id,
                role_name : userChecking.role_name,
                division_id : userChecking.division_id,
                workspace_access: workspaceAccess,
                default_workspace: defaultWorkspace,
                workspaces: Array.isArray(userChecking.workspaces) ? userChecking.workspaces : [],
            },
            token : generateToken,
            refreshToken : generateRefreshToken
        });
    } catch (error) {
        console.log(error.stack);
        res.status(500).json({
            message : "internal server error !",
            status : 500
        });
    }
}

module.exports = login
