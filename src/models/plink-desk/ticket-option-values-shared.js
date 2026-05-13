const normalizeOptionValue = (value) => String(value || "").trim();

const normalizeOptionLookupValue = (value) => normalizeOptionValue(value).toLowerCase();

module.exports = {
  normalizeOptionValue,
  normalizeOptionLookupValue,
};
