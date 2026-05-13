const { getPrivilegeCatalogByWorkspace } = require("../../constants/access-control");

const listPrivilegeCatalog = async () => getPrivilegeCatalogByWorkspace();

module.exports = listPrivilegeCatalog;
