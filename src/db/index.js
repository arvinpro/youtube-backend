import dns from 'node:dns';
import mongoose from 'mongoose';
import {DB_NAME} from '../constant.js';



const connectDB = async () => {
    try {
        dns.setServers(['8.8.8.8']);
        const conn = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error('Error connecting to the database:', error);
        process.exit(1);
    }
}

export default connectDB;