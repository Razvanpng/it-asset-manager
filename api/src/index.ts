import express from 'express';
import cors from 'cors';
import angajatiRouter from './routes/angajati';
import echipamenteRouter from './routes/echipamente';
import componenteRouter from './routes/componente';
import operatiuniRouter from './routes/operatiuni';
import qrRouter from './routes/qr';
import casareRouter from './routes/casare';
import rapoarteRouter from './routes/rapoarte';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/angajati', angajatiRouter);
app.use('/api/echipamente', echipamenteRouter);
app.use('/api/componente', componenteRouter);
app.use('/api/operatiuni', operatiuniRouter);
app.use('/api/qr', qrRouter);
app.use('/api/casare', casareRouter);
app.use('/api/rapoarte', rapoarteRouter);

app.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
});

export default app;