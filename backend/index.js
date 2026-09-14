require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initFirebase } = require('./firebase-admin-init');

initFirebase();
const app = express();
app.use(cors());
app.use(express.json());

const finesRouter = require('./routes/fines');
const paymentsRouter = require('./routes/payments');
const usersRouter = require('./routes/users');
const seasonsRouter = require('./routes/seasons');

//app.use('/api/fines', finesRouter);
//app.use('/api/payments', paymentsRouter);
app.use('/api/users', usersRouter);
app.use('/api/seasons', seasonsRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
