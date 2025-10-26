import { Router } from "express";
import { Customers } from "../models/index.js";
import { requireAuth } from "../middlewares/auth.js";
import { Op } from "sequelize";

export const adminCustomersRouter = Router();


adminCustomersRouter.use(requireAuth);


adminCustomersRouter.get("/", async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status,
      sortBy = "createdAt",
      sortOrder = "DESC"
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    

    const whereClause = {};
    
    if (status) {
      whereClause.status = status;
    }
    
    if (search) {
      whereClause[Op.or] = [
        { first_name: { [Op.iLike]: `%${search}%` } },
        { last_name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone_number: { [Op.iLike]: `%${search}%` } },
        { uid: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: customers } = await Customers.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: offset,
      order: [[sortBy, sortOrder.toUpperCase()]],
      attributes: [
        'id', 'uid', 'first_name', 'last_name', 'email', 
        'phone_number', 'whatsapp_number', 'country_code',
        'status', 'profile_image', 'createdAt', 'updatedAt'
      ]
    });

    const totalPages = Math.ceil(count / parseInt(limit));

    res.json({
      data: customers,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: count,
        itemsPerPage: parseInt(limit),
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


adminCustomersRouter.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const customer = await Customers.findByPk(id, {
      attributes: [
        'id', 'uid', 'first_name', 'last_name', 'email', 
        'phone_number', 'whatsapp_number', 'country_code',
        'status', 'profile_image', 'createdAt', 'updatedAt'
      ]
    });

    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    res.json({
      data: customer
    });
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


adminCustomersRouter.get("/uid/:uid", async (req, res, next) => {
  try {
    const { uid } = req.params;

    const customer = await Customers.findOne({
      where: { uid },
      attributes: [
        'id', 'uid', 'first_name', 'last_name', 'email', 
        'phone_number', 'whatsapp_number', 'country_code',
        'status', 'profile_image', 'createdAt', 'updatedAt'
      ]
    });

    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    res.json({
      data: customer
    });
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


adminCustomersRouter.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      first_name,
      last_name,
      email,
      phone_number,
      whatsapp_number,
      country_code,
      status
    } = req.body;

    const customer = await Customers.findByPk(id);

    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }


    if (email && !email.includes('@')) {
      return res.status(400).json({ error: "Valid email is required" });
    }


    if (email && email !== customer.email) {
      const existingCustomer = await Customers.findOne({ 
        where: { email, id: { [Op.ne]: id } } 
      });
      if (existingCustomer) {
        return res.status(409).json({ error: "Email already exists" });
      }
    }

    await customer.update({
      first_name: first_name !== undefined ? first_name : customer.first_name,
      last_name: last_name !== undefined ? last_name : customer.last_name,
      email: email !== undefined ? email : customer.email,
      phone_number: phone_number !== undefined ? phone_number : customer.phone_number,
      whatsapp_number: whatsapp_number !== undefined ? whatsapp_number : customer.whatsapp_number,
      country_code: country_code !== undefined ? country_code : customer.country_code,
      status: status !== undefined ? status : customer.status
    });

    res.json({
      message: 'Customer updated successfully',
      data: {
        id: customer.id,
        uid: customer.uid,
        first_name: customer.first_name,
        last_name: customer.last_name,
        email: customer.email,
        phone_number: customer.phone_number,
        whatsapp_number: customer.whatsapp_number,
        country_code: customer.country_code,
        status: customer.status,
        profile_image: customer.profile_image
      }
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: "Email already exists" });
    }
    
    res.status(500).json({ error: 'Error updating customer' });
  }
});


adminCustomersRouter.patch("/:id/status", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['active', 'inactive'].includes(status)) {
      return res.status(400).json({ error: "Valid status (active/inactive) is required" });
    }

    const customer = await Customers.findByPk(id);

    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    await customer.update({ status });

    res.json({
      message: `Customer ${status === 'active' ? 'activated' : 'deactivated'} successfully`,
      data: {
        id: customer.id,
        uid: customer.uid,
        email: customer.email,
        status: customer.status
      }
    });
  } catch (error) {
    console.error('Error updating customer status:', error);
    res.status(500).json({ error: 'Error updating customer status' });
  }
});

adminCustomersRouter.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const customer = await Customers.findByPk(id);

    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    await customer.destroy();

    res.json({ 
      message: 'Customer deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ error: 'Error deleting customer' });
  }
});


adminCustomersRouter.get("/stats/summary", async (req, res, next) => {
  try {
    const totalCustomers = await Customers.count();
    const activeCustomers = await Customers.count({ where: { status: 'active' } });
    const inactiveCustomers = await Customers.count({ where: { status: 'inactive' } });
    
 
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentCustomers = await Customers.count({
      where: {
        createdAt: {
          [Op.gte]: thirtyDaysAgo
        }
      }
    });

    res.json({
      data: {
        total: totalCustomers,
        active: activeCustomers,
        inactive: inactiveCustomers,
        recent: recentCustomers
      }
    });
  } catch (error) {
    console.error('Error fetching customer stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default adminCustomersRouter;