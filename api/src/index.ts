import express from 'express';
import cors from 'cors';
import angajatiRouter from './routes/angajati';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/angajati', angajatiRouter);

app.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
});

export default app;