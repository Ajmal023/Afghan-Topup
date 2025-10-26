import { Router } from "express";
import { Package, Currency, Setting } from "../models/index.js";
import { requireAuth } from "../middlewares/auth.js";
import { requireApiKey } from "../middlewares/apiKeyAuth.js";

export const packagesRouter = Router();




packagesRouter.get("/", requireApiKey, async (req, res, next) => {
    try {
        const packages = await Package.findAll({
            order: [['id', 'ASC']]
        });
        
  res.json({
  data: packages.map(pkg => ({
    id: pkg.id,
    cost: parseFloat(pkg.cost),
    value: parseFloat(pkg.value),
    cost_currency: pkg.cost_currency || "USD",
    value_currency: pkg.value_currency || "AFN",
    base_cost: parseFloat(pkg.base_cost || pkg.cost),
    created_at: pkg.createdAt?.toISOString(),  
    updated_at: pkg.updatedAt?.toISOString()
  }))
});
    } catch (error) {
        console.error('Error fetching packages:', error);
        if (error.message.includes("Unauthorized")) {
            return res.status(401).json({ data: "Unauthorized" });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

packagesRouter.get("/admin", requireAuth, async (req, res, next) => {
    try {
        const packages = await Package.findAll({
            order: [['id', 'ASC']]
        });
        
        res.json({ 
            data: packages.map(pkg => ({
                id: pkg.id,
                cost: parseFloat(pkg.cost),
                value: parseFloat(pkg.value),
                cost_currency: pkg.cost_currency || "USD",
                value_currency: pkg.value_currency || "AFN",
                base_cost: parseFloat(pkg.base_cost || pkg.cost),
                created_at: pkg.createdAt,
                updated_at: pkg.updatedAt
            }))
        });
    } catch (error) {
        console.error('Error fetching packages:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


packagesRouter.post("/", requireAuth, async (req, res, next) => {
    try {
        const { cost, value } = req.body;

        if (!cost || !value) {
            return res.status(400).json({ error: "Cost and value are required" });
        }

        const newPackage = await Package.create({
            cost: parseFloat(cost),
            cost_currency: "USD",
            value: parseFloat(value),
            value_currency: "AFN",
            base_cost: parseFloat(cost),
        });

        res.status(201).json({
            message: 'Package added successfully',
            data: newPackage
        });
    } catch (error) {
        console.error('Error creating package:', error);
        res.status(500).json({ error: 'Error, Something went wrong' });
    }
});


packagesRouter.put("/:id", requireAuth, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { cost, value } = req.body;

        if (!cost || !value) {
            return res.status(400).json({ error: "Cost and value are required" });
        }

        const packageItem = await Package.findByPk(id);
        if (!packageItem) {
            return res.status(404).json({ error: "Package not found" });
        }

        await packageItem.update({
            cost: parseFloat(cost),
            value: parseFloat(value),
        });

        res.json({
            message: 'Package edited successfully',
            data: packageItem
        });
    } catch (error) {
        console.error('Error updating package:', error);
        res.status(500).json({ error: 'Error, Something went wrong' });
    }
});


packagesRouter.delete("/:id", requireApiKey, async (req, res, next) => {
    try {
        const { id } = req.params;

        const packageItem = await Package.findByPk(id);
        if (!packageItem) {
            return res.status(404).json({ error: "Package not found" });
        }

        await packageItem.destroy();
        res.json({ status: 200, message: 'Success' });
    } catch (error) {
        console.error('Error deleting package:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});


packagesRouter.get("/ajax", requireApiKey, async (req, res, next) => {
    try {
        const packages = await Package.findAll({
            order: [['id', 'ASC']]
        });
        res.json(packages);
    } catch (error) {
        console.error('Error fetching packages:', error);
        next(error);
    }
});