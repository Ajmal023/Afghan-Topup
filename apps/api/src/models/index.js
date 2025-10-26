import { Sequelize } from "sequelize";
import UserModel from "./user.js";
import SessionModel from "./session.js";
import AuditLogModel from "./audit_log.js";
import ProductTypeModel from "./product_type.js";
import CategoryModel from "./category.js";
import ProductModel from "./product.js";
import ProductVariantModel from "./product_variant.js";
import ProductCategoryModel from "./product_category.js";
import OperatorModel from "./operator.js";
import ContactModel from "./contact.js";
import OrderModel from "./order.js";
import OrderItemModel from "./order_item.js";
import PaymentIntentModel from "./payment_intent.js";
import TopupLogModel from "./topup_log.js";
import ReferralCodeModel from "./referral_code.js";
import ReferralUseModel from "./referral_use.js";
import TicketModel from "./ticket.js";
import TicketCommentModel from "./ticket_comment.js";
import ProviderConfigModel from "./provider_config.js";
import CurrencyModel from "./currency.js";
import CustomersModel from "./customers.js";
import PromoCodeRequestModel from "./promoCodeRequest.js";
import PromoCodeModel from "./promoCode.js";
import PromoUseModel from "./promoUse.js";
import RecurringTopupModel from "./recurring_topup.js";
import OtpCodeModel from "./otp_code.js";
import TransactionModel from "./transaction.js";
import ApiSataraganModel from "./apiSataragan.js";
import SettingModel from "./setting.js";
import PackageModel from "./package.js";
import CurrencyModel1 from "./newCurrency.js";
import SataraganBalanceModel from "./sataraganBalance.js";
import IncentiveRequestModel from "./incentive_request.js";
import setaraganTopupModel from "./setaraganTopup.js";
import IncentiveRecipientModel, {
    PromoAudienceModel,
    ReferralAudienceModel,
} from "./incentive_recipient.js";

export const sequelize = new Sequelize(process.env.DATABASE_URL, {
    logging: false,
    dialect: "postgres",
});

export const User = UserModel(sequelize);
export const Session = SessionModel(sequelize);
export const AuditLog = AuditLogModel(sequelize);
export const ProductType = ProductTypeModel(sequelize);
export const Category = CategoryModel(sequelize);
export const Product = ProductModel(sequelize);
export const ProductVariant = ProductVariantModel(sequelize);
export const ProductCategory = ProductCategoryModel(sequelize);
export const Operator = OperatorModel(sequelize);
export const Customers = CustomersModel(sequelize);
export const PromoCodeRequest = PromoCodeRequestModel(sequelize);
export const Contact = ContactModel(sequelize);
export const Order = OrderModel(sequelize);
export const OrderItem = OrderItemModel(sequelize);
export const PaymentIntent = PaymentIntentModel(sequelize);
export const TopupLog = TopupLogModel(sequelize);
export const ReferralCode = ReferralCodeModel(sequelize);
export const ReferralUse = ReferralUseModel(sequelize);
export const Ticket = TicketModel(sequelize);
export const TicketComment = TicketCommentModel(sequelize);
export const ProviderConfig = ProviderConfigModel(sequelize);
export const Currency = CurrencyModel(sequelize);
export const PromoCode = PromoCodeModel(sequelize);
export const PromoUse = PromoUseModel(sequelize);
export const RecurringTopup = RecurringTopupModel(sequelize);
export const OtpCode = OtpCodeModel(sequelize);
export const IncentiveRequest = IncentiveRequestModel(sequelize);
export const IncentiveRecipient = IncentiveRecipientModel(sequelize);
export const PromoAudience = PromoAudienceModel(sequelize);
export const ReferralAudience = ReferralAudienceModel(sequelize);
export const Transaction = TransactionModel(sequelize);
export const ApiSataragan = ApiSataraganModel(sequelize);
export const Setting = SettingModel(sequelize);
export const Package = PackageModel(sequelize);
export const Currency1 = CurrencyModel1(sequelize);
export const SataraganBalance = SataraganBalanceModel(sequelize);
export const SetaraganTopup = setaraganTopupModel(sequelize);

Transaction.hasMany(ApiSataragan, { foreignKey: "transaction_id", onDelete: "CASCADE" });
ApiSataragan.belongsTo(Transaction, { foreignKey: "transaction_id" });
Transaction.hasMany(ApiSataragan, { foreignKey: 'transaction_id' });
ApiSataragan.belongsTo(Transaction, { foreignKey: 'transaction_id' });
Transaction.hasMany(SetaraganTopup, { foreignKey: 'transaction_id' });
SetaraganTopup.belongsTo(Transaction, { foreignKey: 'transaction_id' });
User.hasMany(Session, { foreignKey: "user_id", onDelete: "CASCADE" });
Session.belongsTo(User, { foreignKey: "user_id" });
Customers.hasMany(PromoCodeRequest, { 
    foreignKey: "customer_uid", 
    sourceKey: "uid",
    as: "PromoCodeRequests"
});
PromoCodeRequest.belongsTo(Customers, { 
    foreignKey: "customer_uid", 
    targetKey: "uid",
    as: "Customer"
});
PromoCode.belongsTo(PromoCodeRequest, { 
    foreignKey: "promo_request_id",
    as: "PromoCodeRequest"
});
PromoCodeRequest.hasOne(PromoCode, { 
    foreignKey: "promo_request_id",
    as: "PromoCode"
});
PromoUse.belongsTo(Customers, {
  foreignKey: 'customer_uid',
  targetKey: 'uid',
  as: 'Customer'
});
Customers.hasMany(PromoUse, {
  foreignKey: 'customer_uid',
  sourceKey: 'uid',
  as: 'PromoUses'
});
PromoCode.hasMany(PromoUse, { 
    foreignKey: "promo_code_id", 
    onDelete: "CASCADE",
    as: "PromoUses"
});
PromoUse.belongsTo(PromoCode, { 
    foreignKey: "promo_code_id",
    as: "PromoCode"
});

Transaction.hasMany(PromoUse, { 
    foreignKey: "transaction_id",
    as: "PromoUses"
});
PromoUse.belongsTo(Transaction, { 
    foreignKey: "transaction_id",
    as: "Transaction"
});
Customers.hasMany(PromoCode, {
    foreignKey: "customer_uid",
    sourceKey: "uid",
    as: "PromoCodes"
});
PromoCode.belongsTo(Customers, {
    foreignKey: "customer_uid",
    targetKey: "uid",
    as: "Customer"
});
AuditLog.belongsTo(User, { as: "actor", foreignKey: "actor_user_id" });
Product.belongsTo(ProductType, { foreignKey: "product_type_id" });
ProductType.hasMany(Product, { foreignKey: "product_type_id" });
Product.hasMany(ProductVariant, { foreignKey: "product_id", onDelete: "CASCADE" });
ProductVariant.belongsTo(Product, { foreignKey: "product_id" });
Product.belongsToMany(Category, { through: ProductCategory, foreignKey: "product_id" });
Category.belongsToMany(Product, { through: ProductCategory, foreignKey: "category_id" });
Product.belongsTo(Operator, { foreignKey: "operator_id" });
Operator.hasMany(Product, { foreignKey: "operator_id" });
ProductVariant.belongsTo(Operator, { foreignKey: "operator_id" });
Operator.hasMany(ProductVariant, { foreignKey: "operator_id" });
Contact.belongsTo(User, { foreignKey: "user_id" });
User.hasMany(Contact, { foreignKey: "user_id" });
Order.belongsTo(User, { foreignKey: "user_id" });
User.hasMany(Order, { foreignKey: "user_id" });
OrderItem.belongsTo(Order, { foreignKey: "order_id", onDelete: "CASCADE" });
Order.hasMany(OrderItem, { foreignKey: "order_id" });
OrderItem.belongsTo(ProductVariant, { foreignKey: "product_variant_id" });
OrderItem.belongsTo(Operator, { foreignKey: "operator_id" });
Operator.hasMany(OrderItem, { foreignKey: "operator_id" });
PaymentIntent.belongsTo(User, { foreignKey: "user_id" });
PaymentIntent.belongsTo(Order, { foreignKey: "order_id" });
Order.hasMany(PaymentIntent, { foreignKey: "order_id" });
TopupLog.belongsTo(OrderItem, { foreignKey: "order_item_id" });
OrderItem.hasMany(TopupLog, { foreignKey: "order_item_id" });
TopupLog.belongsTo(Operator, { foreignKey: "operator_id" });
ReferralCode.belongsTo(User, { as: "owner", foreignKey: "owner_user_id" });
ReferralUse.belongsTo(ReferralCode, { foreignKey: "referral_code_id" });
ReferralUse.belongsTo(User, { as: "referrer", foreignKey: "referrer_user_id" });
ReferralUse.belongsTo(User, { as: "referred", foreignKey: "referred_user_id" });
Ticket.belongsTo(User, { as: "customer", foreignKey: "customer_user_id" });
Ticket.belongsTo(User, { as: "assignee", foreignKey: "assignee_user_id" });
TicketComment.belongsTo(Ticket, { foreignKey: "ticket_id", onDelete: "CASCADE" });
Ticket.hasMany(TicketComment, { foreignKey: "ticket_id" });
TicketComment.belongsTo(User, { foreignKey: "author_user_id" });
ProviderConfig.belongsTo(User, { as: "createdBy", foreignKey: "created_by" });
RecurringTopup.belongsTo(User, { foreignKey: "user_id" });
RecurringTopup.belongsTo(ProductVariant, { foreignKey: "product_variant_id" });
RecurringTopup.belongsTo(Operator, { foreignKey: "operator_id" });
OtpCode.belongsTo(User, { foreignKey: "user_id" });
IncentiveRequest.belongsTo(User, { as: "requester", foreignKey: "requester_user_id" });
IncentiveRequest.belongsTo(User, { as: "decidedBy", foreignKey: "decided_by_user_id" });
IncentiveRequest.hasMany(IncentiveRecipient, { foreignKey: "request_id", onDelete: "CASCADE" });
IncentiveRecipient.belongsTo(IncentiveRequest, { foreignKey: "request_id" });
IncentiveRequest.belongsTo(PromoCode, {
    as: "resultPromo",
    foreignKey: "result_code_id",
    constraints: false,
});
IncentiveRequest.belongsTo(ReferralCode, {
    as: "resultReferral",
    foreignKey: "result_code_id",
    constraints: false,
});
PromoAudience.belongsTo(PromoCode, { foreignKey: "promo_code_id" });
PromoCode.hasMany(PromoAudience, { foreignKey: "promo_code_id", as: "audience" });
ReferralAudience.belongsTo(ReferralCode, { foreignKey: "referral_code_id" });
ReferralCode.hasMany(ReferralAudience, { foreignKey: "referral_code_id", as: "audience" });

export async function syncModels() {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
}