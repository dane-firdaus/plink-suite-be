const models = require("../../models");


const listDivisionsController = async (req, res) => {
    try {
        const {name, limit, page} = req.body;
        
    } catch (error) {
        console.error("Error on list division :", error.stack);
        res.status(500).json({
            message : "Internal server error !",
            status : 500
        })
    }
}