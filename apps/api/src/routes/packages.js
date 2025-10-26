import { Router } from "express";
import { Package, ProviderConfig } from "../models/index.js";
import { requireAuth } from "../middlewares/auth.js";
import { requireApiKey } from "../middlewares/apiKeyAuth.js";

export const packagesRouter = Router();



packagesRouter.get("/", requireApiKey, async (req, res, next) => {
    try {
         const packages = await Package.findAll({
            include: [{
                model: ProviderConfig,
                as: 'provider',
                where: { active: true },
                attributes: ['id', 'provider', 'name', 'active']
            }],
            where: { status: true },
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
    provider: pkg.provider ? {
                    id: pkg.provider.id,
                    name: pkg.provider.name,
                    provider: pkg.provider.provider
                } : null,
    status: pkg.status,
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
                include: [{
                    model: ProviderConfig,
                    as: 'provider',
                    attributes: ['id', 'provider', 'name', 'active']
                }],
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
                provider: pkg.provider ? {
                    id: pkg.provider.id,
                    name: pkg.provider.name,
                    provider: pkg.provider.provider,
                    active: pkg.provider.active
                } : null,
                status: pkg.status,
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
        const { cost, value, provider_id, status = true } = req.body;

        if (!cost || !value) {
            return res.status(400).json({ error: "Cost and value are required" });
        }

        const provider = await ProviderConfig.findByPk(provider_id);
        if (!provider) {
            return res.status(404).json({ error: "Provider not found" });
        }
        const newPackage = await Package.create({
            cost: parseFloat(cost),
            cost_currency: "USD",
            value: parseFloat(value),
            value_currency: "AFN",
            base_cost: parseFloat(cost),
            provider_id: provider_id,
            status: Boolean(status)
        });


        const packageWithProvider = await Package.findByPk(newPackage.id, {
            include: [{
                model: ProviderConfig,
                as: 'provider',
                attributes: ['id', 'provider', 'name', 'active']
            }]
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
        const { cost, value, provider_id, status } = req.body;

        if (!cost || !value) {
            return res.status(400).json({ error: "Cost and value are required" });
        }

        const packageItem = await Package.findByPk(id);
        if (!packageItem) {
            return res.status(404).json({ error: "Package not found" });
        }
        if (provider_id) {
            const provider = await ProviderConfig.findByPk(provider_id);
            if (!provider) {
                return res.status(404).json({ error: "Provider not found" });
            }
        }
        
        await packageItem.update({
            cost: parseFloat(cost),
            value: parseFloat(value),
            ...(provider_id && { provider_id }),
            ...(status !== undefined && { status: Boolean(status) })
        });

        const updatedPackage = await Package.findByPk(id, {
            include: [{
                model: ProviderConfig,
                as: 'provider',
                attributes: ['id', 'provider', 'name', 'active']
            }]
        });

        res.json({
            message: 'Package edited successfully',
            data: updatedPackage
        });
    } catch (error) {
        console.error('Error updating package:', error);
        res.status(500).json({ error: 'Error, Something went wrong' });
    }
});

packagesRouter.patch("/:id/toggle", requireAuth, async (req, res, next) => {
    try {
        const { id } = req.params;

        const packageItem = await Package.findByPk(id);
        if (!packageItem) {
            return res.status(404).json({ error: "Package not found" });
        }

        await packageItem.update({ status: !packageItem.status });

        res.json({
            message: `Package ${packageItem.status ? 'activated' : 'deactivated'} successfully`,
            data: {
                id: packageItem.id,
                status: packageItem.status
            }
        });
    } catch (error) {
        console.error('Error toggling package status:', error);
        res.status(500).json({ error: 'Error updating package status' });
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