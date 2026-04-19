import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/*
export const ProductController = {
    // Create new product (Admin)
    createProduct: async (req: Request, res: Response) => {
        try {
            const { estateName, location, prototype, plotSize, basePrice, description } = req.body;

            // Check duplicates? Maybe simplified unique check
            const product = await prisma.product.create({
                data: {
                    estateName,
                    location,
                    prototype,
                    plotSize: Number(plotSize),
                    basePrice: Number(basePrice),
                    description
                }
            });
            res.status(201).json(product);
        } catch (error) {
            console.error("Create Product Error", error);
            res.status(500).json({ error: "Failed to create product" });
        }
    },

    // Get All Products (for Admin list + Selection dropdowns)
    getProducts: async (req: Request, res: Response) => {
        try {
            const products = await prisma.product.findMany({
                orderBy: { estateName: 'asc' }
            });
            res.json(products);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch products" });
        }
    },

    // Update Product
    updateProduct: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { estateName, location, prototype, plotSize, basePrice, description } = req.body;

            const product = await prisma.product.update({
                where: { id: String(id) },
                data: {
                    estateName,
                    location,
                    prototype,
                    plotSize: Number(plotSize),
                    basePrice: Number(basePrice),
                    description
                }
            });
            res.json(product);
        } catch (error) {
            res.status(500).json({ error: "Failed to update product" });
        }
    },

    // Delete Product
    deleteProduct: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            // Check if sold?
            const sales = await prisma.sale.count({ where: { productId: String(id) } });
            if (sales > 0) return res.status(400).json({ error: "Cannot delete product that has sales attached." });

            await prisma.product.delete({ where: { id: String(id) } });
            res.json({ message: "Product deleted" });
        } catch (error) {
            res.status(500).json({ error: "Failed to delete product" });
        }
    }
};
*/
