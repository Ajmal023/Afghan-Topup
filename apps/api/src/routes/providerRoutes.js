import { Router } from "express";
import { ProviderConfig } from "../models/index.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";

export const providerConfigsRouter = Router();


providerConfigsRouter.get("/", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const providers = await ProviderConfig.findAll({
            order: [['createdAt', 'DESC']]
        });
        
        res.json({
            data: providers.map(provider => ({
                id: provider.id,
                provider: provider.provider,
                name: provider.name,
                credentials: provider.credentials,
                active: provider.active,
                created_by: provider.created_by,
                created_at: provider.createdAt,
                updated_at: provider.updatedAt
            }))
        });
    } catch (error) {
        console.error('Error fetching providers:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


providerConfigsRouter.get("/active", requireAuth, async (req, res, next) => {
    try {
        const providers = await ProviderConfig.findAll({
            where: { active: true },
            order: [['name', 'ASC']]
        });
        
        res.json({
            data: providers.map(provider => ({
                id: provider.id,
                provider: provider.provider,
                name: provider.name,
                active: provider.active
            }))
        });
    } catch (error) {
        console.error('Error fetching active providers:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


providerConfigsRouter.post("/", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const { provider, name, credentials, active = false } = req.body;

        if (!provider || !name || !credentials) {
            return res.status(400).json({ error: "Provider, name, and credentials are required" });
        }

        const newProvider = await ProviderConfig.create({
            provider,
            name,
            credentials,
            active: Boolean(active),
            created_by: req.user.id
        });

        res.status(201).json({
            message: 'Provider configuration created successfully',
            data: {
                id: newProvider.id,
                provider: newProvider.provider,
                name: newProvider.name,
                active: newProvider.active,
                created_at: newProvider.createdAt
            }
        });
    } catch (error) {
        console.error('Error creating provider config:', error);
        res.status(500).json({ error: 'Error creating provider configuration' });
    }
});


providerConfigsRouter.put("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { provider, name, credentials, active } = req.body;

        const providerConfig = await ProviderConfig.findByPk(id);
        if (!providerConfig) {
            return res.status(404).json({ error: "Provider configuration not found" });
        }

        await providerConfig.update({
            ...(provider && { provider }),
            ...(name && { name }),
            ...(credentials && { credentials }),
            ...(active !== undefined && { active: Boolean(active) })
        });

        res.json({
            message: 'Provider configuration updated successfully',
            data: providerConfig
        });
    } catch (error) {
        console.error('Error updating provider config:', error);
        res.status(500).json({ error: 'Error updating provider configuration' });
    }
});


providerConfigsRouter.delete("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const { id } = req.params;

        const providerConfig = await ProviderConfig.findByPk(id);
        if (!providerConfig) {
            return res.status(404).json({ error: "Provider configuration not found" });
        }


        const { Package } = await import('../models/index.js');
        const packageCount = await Package.count({ where: { provider_id: id } });
        
        if (packageCount > 0) {
            return res.status(400).json({ 
                error: "Cannot delete provider configuration. It is being used by packages." 
            });
        }

        await providerConfig.destroy();
        res.json({ message: 'Provider configuration deleted successfully' });
    } catch (error) {
        console.error('Error deleting provider config:', error);
        res.status(500).json({ error: 'Error deleting provider configuration' });
    }
});


providerConfigsRouter.patch("/:id/toggle", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const { id } = req.params;

        const providerConfig = await ProviderConfig.findByPk(id);
        if (!providerConfig) {
            return res.status(404).json({ error: "Provider configuration not found" });
        }

        await providerConfig.update({ active: !providerConfig.active });

        res.json({
            message: `Provider ${providerConfig.active ? 'activated' : 'deactivated'} successfully`,
            data: {
                id: providerConfig.id,
                active: providerConfig.active
            }
        });
    } catch (error) {
        console.error('Error toggling provider status:', error);
        res.status(500).json({ error: 'Error updating provider status' });
    }
});