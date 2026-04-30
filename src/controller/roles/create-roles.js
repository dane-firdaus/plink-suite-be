const models = require('../../models');
const {v4 : uuid} = require('uuid');

const createRoles = async (req, res) => {
    const {name} = req.body;
    try {
        const role = await models.createRoles({
            name,
            role_id : uuid()
        });
        res.status(200).json({
            message : "role created successfully",
            status : 200,
            role
        });
    } catch (error) {
        console.log(error.stack);
        res.status(500).json({
            message : "internal server error !",
            status : 500
        });
    }
}

module.exports = createRoles;