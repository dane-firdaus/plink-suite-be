const models = require('../../models');
const {v4 : uuid} = require('uuid');

const createDivision = async (req, res) => {
    console.log(req.body);
    const {name, description} = req.body;
    try {
        const division = await models.createDivisions({
            name,
            description,
            division_id : uuid(),
            created_at : new Date(),
            updated_at : new Date()
        });
        res.status(200).json({
            message : "division created successfully",
            status : 200,
            division
        });
    } catch (error) {
        console.log(error.stack);
        res.status(500).json({
            message : "internal server error !",
            status : 500
                });
    }
}

module.exports = createDivision;