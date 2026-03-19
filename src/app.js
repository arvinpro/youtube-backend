import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();

app.get("/", (req,res)=>{
  res.json({message:"server working"})
})

app.get("/test-cookie", (req, res) => {
  res.cookie("testCookie", "hello123", {
    httpOnly: true,
    secure: false,
    sameSite: "lax"
  })
  res.json({ message: "Cookie sent" })
})
app.use(cors({
    origin: process.env.ORIGIN_URI,
    credentials: true,
}));

app.use(express.json({limit: '10mb'}));
app.use(express.urlencoded({limit: '10mb', extended: true})); //nested object support due to extended: true
app.use(express.static('public'));
app.use(cookieParser());


//routes
import { router } from './routes/user.routes.js';

app.use("/api/v1/users", router)

export default app