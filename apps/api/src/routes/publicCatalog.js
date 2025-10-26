import { Router } from "express";
import { Op } from "sequelize";
import {
    ProductVariant,
    Product,
    ProductType,
    Operator,
    Category,
} from "../models/index.js";
import { normalizeAfMsisdn } from "../utils/msisdn.js";

export const publicCatalogRouter = Router();


publicCatalogRouter.get("/resolve", async (req, res) => {
    const { msisdn } = req.query;
    const parsed = normalizeAfMsisdn(msisdn);
    if (!parsed.ok) return res.status(400).json({ error: parsed.reason });

    // AWCC only (070/071)
    const operator =
        parsed.operatorCode === "AWCC"
            ? await Operator.findOne({ where: { code: "AWCC" } })
            : null;

    if (!operator) {
        return res.status(422).json({
            error: "unsupported_operator",
            data: { msisdn: parsed.e164, operator: parsed.operatorCode },
        });
    }

    return res.json({
        msisdn: { e164: parsed.e164, national: parsed.national },
        operator: { id: operator.id, code: operator.code, name: operator.name },
        country: "AF",
    });
});

/** GET /api/public/catalog/types?operator_code=AWCC */
publicCatalogRouter.get("/types", async (req, res, next) => {
    try {
        const { operator_code, operator_id } = req.query;

        const opWhere = {};
        if (operator_id) opWhere.id = operator_id;
        if (operator_code) opWhere.code = operator_code;

        const types = await ProductType.findAll({
            attributes: ["id", "code", "name", "description"],
            include: [
                {
                    model: Product,
                    required: true,
                    where: { is_active: true },
                    include: [
                        {
                            model: Operator,
                            required: Object.keys(opWhere).length > 0,
                            where: Object.keys(opWhere).length ? opWhere : undefined,
                        },
                    ],
                },
            ],
            order: [["name", "ASC"]],
        });

        res.json({
            data: types.map((t) => ({
                id: t.id,
                code: t.code,
                name: t.name,
                description: t.description,
            })),
        });
    } catch (e) {
        next(e);
    }
});

function buildOrder(sort) {
    if (sort === "amount_desc") return [["amount_minor", "DESC"]];
    if (sort === "newest") return [[Product, "createdAt", "DESC"]];
    return [["amount_minor", "ASC"]];
}

/** GET /api/public/catalog/variants (flat)
 *  ?product_type_code=mobilе_topup|bundle
 *  &operator_code=AWCC
 *  &q=&sort=amount_asc|amount_desc|newest&page=&limit=
 */
publicCatalogRouter.get("/variants", async (req, res, next) => {
    try {
        const {
            product_type_code,
            product_type_id,
            operator_code,
            operator_id,
            q,
            sort = "amount_asc",
        } = req.query;

        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
        const offset = (page - 1) * limit;

        const pvWhere = { is_active: true };
        const pWhere = { is_active: true };
        if (q) pWhere.name = { [Op.iLike]: `%${q}%` };

        const ptWhere = {};
        if (product_type_id) ptWhere.id = product_type_id;
        if (product_type_code) ptWhere.code = product_type_code;

        const opWhere = {};
        if (operator_id) opWhere.id = operator_id;
        if (operator_code) opWhere.code = operator_code;

        const include = [
            {
                model: Product,
                required: true,
                where: pWhere,
                include: [
                    {
                        model: ProductType,
                        required: Object.keys(ptWhere).length > 0,
                        where: Object.keys(ptWhere).length ? ptWhere : undefined,
                    },
                    {
                        model: Operator,
                        required: Object.keys(opWhere).length > 0,
                        where: Object.keys(opWhere).length ? opWhere : undefined,
                    },
                    { model: Category, through: { attributes: [] }, required: false },
                ],
            },
            {
                model: Operator,
                required: false,
            },
        ];

        const { rows, count } = await ProductVariant.findAndCountAll({
            where: pvWhere,
            include,
            order: buildOrder(String(sort)),
            limit,
            offset,
        });

        res.json({
            data: rows.map((v) => ({
                id: v.id,
                name: v.name,
                amount_minor: v.amount_minor !== null ? Number(v.amount_minor) : null,
                currency: v.currency,
                display_usd_minor:
                    v.display_usd_minor !== null ? Number(v.display_usd_minor) : null,
                is_custom_amount: !!v.is_custom_amount,
                code: v.code,
                operator: v.Operator
                    ? { id: v.Operator.id, name: v.Operator.name, code: v.Operator.code }
                    : v.Product?.Operator
                        ? {
                            id: v.Product.Operator.id,
                            name: v.Product.Operator.name,
                            code: v.Product.Operator.code,
                        }
                        : null,
                product: v.Product
                    ? {
                        id: v.Product.id,
                        name: v.Product.name,
                        type_code: v.Product.ProductType?.code ?? null,
                    }
                    : null,
            })),
            meta: { page, limit, count, totalPages: Math.ceil(count / limit) },
        });
    } catch (e) {
        next(e);
    }
});

/** GET /api/public/catalog/groups (grouped by Product)
 *  ?product_type_code=bundle|mobile_topup
 *  &operator_code=AWCC
 *
 * Returns:
 *  { data: [ { product: {id,name}, variants: [..] }, ... ] }
 */
publicCatalogRouter.get("/groups", async (req, res, next) => {
    try {
        const { product_type_code, product_type_id, operator_code, operator_id } =
            req.query;

        const ptWhere = {};
        if (product_type_id) ptWhere.id = product_type_id;
        if (product_type_code) ptWhere.code = product_type_code;

        const opWhere = {};
        if (operator_id) opWhere.id = operator_id;
        if (operator_code) opWhere.code = operator_code;

        // 1) Find active products under given type/operator
        const products = await Product.findAll({
            where: { is_active: true },
            include: [
                {
                    model: ProductType,
                    required: Object.keys(ptWhere).length > 0,
                    where: Object.keys(ptWhere).length ? ptWhere : undefined,
                },
                {
                    model: Operator,
                    required: Object.keys(opWhere).length > 0,
                    where: Object.keys(opWhere).length ? opWhere : undefined,
                },
            ],
            order: [["name", "ASC"]],
        });

        // 2) Load active variants per product (allow variant.operator_id=null OR same operator)
        const productIds = products.map((p) => p.id);
        if (productIds.length === 0)
            return res.json({ data: [], meta: { count: 0 } });

        const variants = await ProductVariant.findAll({
            where: { is_active: true, product_id: { [Op.in]: productIds } },
            include: [
                { model: Product, required: true },
                { model: Operator, required: false },
            ],
            order: [["amount_minor", "ASC"]],
        });

        // 3) Group by product
        const grouped = products.map((p) => {
            const vs = variants
                .filter((v) => v.product_id === p.id)
                .filter((v) => {
                    if (!operator_id && !operator_code) return true;
                    // accept when variant operator matches product operator, or variant has no operator
                    if (v.operator_id == null) return true;
                    return (
                        p.operator_id != null && String(v.operator_id) === String(p.operator_id)
                    );
                })
                .map((v) => ({
                    id: v.id,
                    name: v.name,
                    amount_minor: v.amount_minor !== null ? Number(v.amount_minor) : null,
                    currency: v.currency,
                    display_usd_minor:
                        v.display_usd_minor !== null ? Number(v.display_usd_minor) : null,
                    is_custom_amount: !!v.is_custom_amount,
                    code: v.code,
                }));

            return {
                product: { id: p.id, name: p.name },
                variants: vs,
            };
        });

        res.json({ data: grouped, meta: { count: grouped.length } });
    } catch (e) {
        next(e);
    }
});

/** alias for legacy */
publicCatalogRouter.get("/topups", async (req, res, next) => {
    req.query.product_type_code = "mobile_topup";
    return publicCatalogRouter.handle(req, res, next);
});
