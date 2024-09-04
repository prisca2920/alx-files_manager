import express from 'express';
import { env } from 'process';
import mainRoute from './routes/index.js';

const app = express();
const port = env.PORT || 5000;

app.use(express.json());
app.use(mainRoute);

app.listen(port, () => {
  console.log(`Server running at http://127.0.0.1:${port}/`);
});

export default app;
