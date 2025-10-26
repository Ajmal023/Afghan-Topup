import { Router } from "express";
import { Setting } from "../models/index.js";
import { requireAuth } from "../middlewares/auth.js";

export const settingsRouter = Router();

settingsRouter.get("/server", async (req, res, next) => {
    try {
        const serverSetting = await Setting.findOne({ 
            where: { setting_name: 'server' } 
        });
        
        const adSetting = await Setting.findOne({ 
            where: { setting_name: 'ad' } 
        });

        res.json({
            server: serverSetting?.value || 1,
            ad: adSetting
        });
    } catch (error) {
        next(error);
    }
});


settingsRouter.post("/server", requireAuth, async (req, res, next) => {
    try {
        const { value, ad, show_ad } = req.body;

  
        const [adSetting] = await Setting.upsert({
            setting_name: 'ad',
            setting_details: ad || '',
            value: show_ad || 0
        }, { returning: true });

        const [serverSetting] = await Setting.upsert({
            setting_name: 'server',
            value: value.toString()
        }, { returning: true });

        res.json({
            result: serverSetting,
            ad: adSetting.setting_details,
            status: "Success"
        });
    } catch (error) {
        next(error);
    }
});