require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initFirebase } = require('./firebase-admin-init');

initFirebase();
const app = express();
app.use(cors());
app.use(express.json());

app.get('/test', (req, res) => {
	res.send("L'api est OK");
});

const seasonsRouter = require('./routes/seasons');

app.use('/api/seasons', seasonsRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
