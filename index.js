const express = require('express');
const http = require('http');
const cors = require('cors');
require('dotenv').config();
const app = express();
const package = require('./package.json');

const divisionRouter = require('./src/routes/division');
const roleRouter = require('./src/routes/roles');
const userRouter = require('./src/routes/users');
const reportRouter = require('./src/routes/report');
const plinkDeskRouter = require('./src/routes/plink-desk');
const crmRouter = require('./src/routes/crm');
const { startOnboardingSyncPolling } = require('./src/utils/onboarding-sync-poller');

const port = process.env.PORT || 3099;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/v1/division', divisionRouter)
app.use('/api/v1/roles', roleRouter)
app.use('/api/v1/users', userRouter)
app.use('/api/v1/report', reportRouter)
app.use('/api/v1/plink-desk', plinkDeskRouter)
app.use('/api/v1/crm', crmRouter)


app.get('/', (req, res) => {
    res.json({
        author: package.author,
        version: package.version,
        description: package.description
    });
})

app.use(cors());
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
})

http.createServer(app).listen(port, () => {
    console.log(`Server is running on port ${port}`);
    startOnboardingSyncPolling();
})
