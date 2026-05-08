const models = require("../../models");

const voaTransactionListReport = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const startDate = req.query.start_date || null;
    const endDate = req.query.end_date || null;
    const filters = {
      transaction_date: req.query.transaction_date || "",
      cutoffdate: req.query.cutoffdate || "",
      payment_method: req.query.payment_method || "",
      terminal: req.query.terminal || "",
      ecomm_ref_no: req.query.ecomm_ref_no || "",
      bank_ref_no: req.query.bank_ref_no || "",
      merc_ref_no: req.query.merc_ref_no || "",
      billing_id: req.query.billing_id || "",
      ntb: req.query.ntb || "",
      ntpn: req.query.ntpn || "",
      card_type: req.query.card_type || "",
      card_no: req.query.card_no || "",
      amount: req.query.amount || "",
      net_amount: req.query.net_amount || "",
      payment_status: req.query.payment_status || "",
      status_indikator: req.query.status_indikator || "",
    };

    const result = await models.voaTransactionListReport({
      page,
      limit,
      startDate,
      endDate,
      filters,
    });

    res.status(200).json({
      ...result,
      status: 200,
    });
  } catch (error) {
    console.log(error.stack);
    res.status(500).json({
      message: "Internal server error !",
      status: 500,
    });
  }
};

module.exports = voaTransactionListReport;
