import { Router } from "express";
import { Customers } from "../models/index.js";
import { requireAuth } from "../middlewares/auth.js";
import { requireApiKey } from "../middlewares/apiKeyAuth.js";
export const customersRouter = Router();


customersRouter.get("/profile/:uid", requireApiKey, async (req, res, next) => {
    try {
        const { uid } = req.params;
        
        console.log("Fetching profile for UID:", uid);
        
        if (!uid) {
            return res.status(400).json({ 
                error: "User ID not found in request",
                data: null 
            });
        }

        const customer = await Customers.findOne({
            where: { uid }
        });

        if (!customer) {
            return res.json({
                data: null,
                message: "No profile found"
            });
        }

        res.json({
            data: {
                id: customer.id,
                uid: customer.uid,
                first_name: customer.first_name,
                last_name: customer.last_name,
                email: customer.email,
                phone_number: customer.phone_number,
                whatsapp_number: customer.whatsapp_number,
                profile_image: customer.profile_image,
                country_code: customer.country_code,
                status: customer.status,
                created_at: customer.createdAt,
                updated_at: customer.updatedAt
            }
        });
    } catch (error) {
        console.error('Error fetching customer profile:', error);
        res.status(500).json({ error: 'Internal server error', data: null });
    }
});


customersRouter.post("/profile/:uid", requireApiKey, async (req, res, next) => {
    try {
        const { uid } = req.params; 
        const { 
            first_name, 
            last_name, 
            email, 
            phone_number, 
            whatsapp_number,
            country_code 
        } = req.body;

        console.log("Creating profile for UID:", uid, "with data:", req.body);

  
        if (!email) {
            return res.status(400).json({ error: "Email is required" });
        }


        let customer = await Customers.findOne({ where: { uid } });

        if (customer) {

            await customer.update({
                first_name: first_name || customer.first_name,
                last_name: last_name || customer.last_name,
                email: email || customer.email,
                phone_number: phone_number || customer.phone_number,
                whatsapp_number: whatsapp_number || customer.whatsapp_number,
                country_code: country_code || customer.country_code
            });
        } else {
  
            customer = await Customers.create({
                uid: uid,
                first_name: first_name || '',
                last_name: last_name || '',
                email: email,
                phone_number: phone_number || '',
                whatsapp_number: whatsapp_number || '',
                country_code: country_code || 'AF'
            });
        }

        res.json({
            message: 'Profile saved successfully',
            data: {
                id: customer.id,
                uid: customer.uid,
                first_name: customer.first_name,
                last_name: customer.last_name,
                email: customer.email,
                phone_number: customer.phone_number,
                whatsapp_number: customer.whatsapp_number,
                profile_image: customer.profile_image,
                country_code: customer.country_code
            }
        });
    } catch (error) {
        console.error('Error saving customer profile:', error);
        
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ error: "Customer profile already exists" });
        }
        
        res.status(500).json({ error: 'Error saving profile' });
    }
});


customersRouter.put("/profile/:uid", requireApiKey, async (req, res, next) => {
    try {
        const { uid } = req.params;
        const { 
            first_name, 
            last_name, 
            email, 
            phone_number, 
            whatsapp_number,
            country_code 
        } = req.body;

        console.log("Updating/Creating profile for UID:", uid, "with data:", req.body);


        if (!email) {
            return res.status(400).json({ error: "Email is required" });
        }


        if (email && !email.includes('@')) {
            return res.status(400).json({ error: "Valid email is required" });
        }


        let customer = await Customers.findOne({ where: { uid } });

        if (customer) {
            await customer.update({
                first_name: first_name !== undefined ? first_name : customer.first_name,
                last_name: last_name !== undefined ? last_name : customer.last_name,
                email: email !== undefined ? email : customer.email,
                phone_number: phone_number !== undefined ? phone_number : customer.phone_number,
                whatsapp_number: whatsapp_number !== undefined ? whatsapp_number : customer.whatsapp_number,
                country_code: country_code !== undefined ? country_code : customer.country_code
            });
        } else {
            customer = await Customers.create({
                uid: uid,
                first_name: first_name || '',
                last_name: last_name || '',
                email: email,
                phone_number: phone_number || '',
                whatsapp_number: whatsapp_number || '',
                country_code: country_code || 'AF'
            });
        }

        res.json({
            message: customer ? 'Profile updated successfully' : 'Profile created successfully',
            data: {
                id: customer.id,
                uid: customer.uid,
                first_name: customer.first_name,
                last_name: customer.last_name,
                email: customer.email,
                phone_number: customer.phone_number,
                whatsapp_number: customer.whatsapp_number,
                profile_image: customer.profile_image,
                country_code: customer.country_code
            }
        });
    } catch (error) {
        console.error('Error updating/creating customer profile:', error);
        
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ error: "Customer profile already exists" });
        }
        
        res.status(500).json({ error: 'Error saving profile' });
    }
});


customersRouter.delete("/profile/:uid", requireApiKey, async (req, res, next) => {
    try {
        const { uid } = req.params;

        const customer = await Customers.findOne({ where: { uid } });

        if (!customer) {
            return res.status(404).json({ error: "Customer profile not found" });
        }

        await customer.destroy();

        res.json({ 
            message: 'Profile deleted successfully' 
        });
    } catch (error) {
        console.error('Error deleting customer profile:', error);
        res.status(500).json({ error: 'Error deleting profile' });
    }
});