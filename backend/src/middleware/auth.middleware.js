import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export async function protectRoute(req, res, next) {
    try {
       const token = req.cookies.jwt; 

       if(!token) {
        return res.status(401).json({ message: "Unauthorized" });
       }
         const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

         if(!decoded) {
            return res.status(401).json({ message: "Unauthorized invalid" });
         }
         const user = await User.findById(decoded.userId).select('-password');
            if(!user) {
                return res.status(401).json({ message: "Unauthorized no user" });
            }
            req.user = user;
            next();
    } catch (error) {
        console.error("Error in protectRoute middleware:", error);
        res.status(401).json({ message: "Unauthorized catch" });
    }
}