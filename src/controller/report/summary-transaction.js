const models = require("../../models");
const summaryTransactions = async (req, res) => {
    try {
        const page = Math.max(Number(req.query.page) || 1, 1);
        const limit = Math.max(Number(req.query.limit) || 50, 1);
        const search = req.query.search || "";
        const startDate = req.query.start_date || null;
        const endDate = req.query.end_date || null;
        const sortField = req.query.sort_field || "volume_trx";
        const sortOrder = req.query.sort_order || "desc";
        const sortDate = req.query.sort_date || null;
        const paymentType = req.query.payment_type || null;

        const result = await models.summaryTransactions({
            page,
            limit,
            search,
            startDate,
            endDate,
            sortField,
            sortOrder,
            sortDate,
            paymentType,
        });

        res.status(200).json({
            ...result,
            status : 200
        })
    } catch (error) {
        console.log(error.stack);
        res.status(500).json({
            message : "Internal server error !",
            status : 500
        })
    }
}

module.exports = summaryTransactions
