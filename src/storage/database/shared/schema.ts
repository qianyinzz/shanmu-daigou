import { pgTable, serial, varchar, text, numeric, integer, timestamp, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"


export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 商品表
export const products = pgTable(
	"products",
	{
		id: serial().primaryKey(),
		name: varchar("name", { length: 200 }).notNull(),
		category: varchar("category", { length: 50 }).notNull(),
		price: numeric("price", { precision: 10, scale: 2 }).notNull(),
		unit: varchar("unit", { length: 20 }).notNull(),
		stock: integer("stock").notNull().default(0),
		image_key: text("image_key"),
		description: text("description"),
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("products_category_idx").on(table.category),
		index("products_created_at_idx").on(table.created_at),
	]
);

// 订单表
export const orders = pgTable(
	"orders",
	{
		id: serial().primaryKey(),
		order_no: varchar("order_no", { length: 30 }).notNull().unique(),
		phone: varchar("phone", { length: 20 }).notNull(),
		location: varchar("location", { length: 100 }),
		status: varchar("status", { length: 20 }).notNull().default("pending"),
		total_price: numeric("total_price", { precision: 10, scale: 2 }).notNull(),
		service_fee: numeric("service_fee", { precision: 10, scale: 2 }).notNull(),
		grand_total: numeric("grand_total", { precision: 10, scale: 2 }).notNull(),
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("orders_status_idx").on(table.status),
		index("orders_location_idx").on(table.location),
		index("orders_created_at_idx").on(table.created_at),
		index("orders_status_created_idx").on(table.status, table.created_at),
	]
);

// 订单商品明细表
export const orderItems = pgTable(
	"order_items",
	{
		id: serial().primaryKey(),
		order_id: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
		product_id: integer("product_id").notNull(),
		product_name: varchar("product_name", { length: 200 }).notNull(),
		price: numeric("price", { precision: 10, scale: 2 }).notNull(),
		quantity: integer("quantity").notNull(),
	},
	(table) => [
		index("order_items_order_id_idx").on(table.order_id),
		index("order_items_product_id_idx").on(table.product_id),
	]
);
