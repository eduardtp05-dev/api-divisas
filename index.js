import express from 'express';
import divisasRoutes from  './src/routes/divisas.js';
import cors from 'cors';
import 'dotenv/config';



const app = express();


app.use(cors());
app.use(express.json());

app.use('/api', divisasRoutes);




const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () =>{
    console.log("api activa en el puerto 3000");
});