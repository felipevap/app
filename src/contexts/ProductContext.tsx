"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';

export interface GarageSale {
    id: string;
    name: string;
    createdAt: number;
}

export interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    images: string[];
    garageSaleId: string;
    category: string;
    condition: string;
    tags: string[];
}

interface ProductContextType {
    products: Product[];
    garageSales: GarageSale[];
    currentGarageSale: GarageSale | null;
    addProduct: (product: Omit<Product, 'id'>) => void;
    updateProduct: (id: string, product: Partial<Product>) => void;
    deleteProduct: (id: string) => void;
    getProduct: (id: string) => Product | undefined;
    addGarageSale: (name: string) => GarageSale;
    getProductsByGarageSale: (id: string) => Product[];
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

export const ProductProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [garageSales, setGarageSales] = useState<GarageSale[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Initial Load
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const storedGS = localStorage.getItem('ar-app-garage-sales');
            const storedProds = localStorage.getItem('ar-app-products');

            if (storedGS) setGarageSales(JSON.parse(storedGS));

            if (storedProds) {
                const parsedProducts = JSON.parse(storedProds);
                // Migration logic could go here if needed, keeping it simple for now
                setProducts(parsedProducts.map((p: any) => ({
                    ...p,
                    images: p.images || (p.image ? [p.image] : []),
                    garageSaleId: p.garageSaleId || 'migrated-default',
                    category: p.category || 'Outros',
                    condition: p.condition || 'Usado',
                    tags: p.tags || []
                })));
            }
            setIsLoaded(true);
        }
    }, []);

    const currentGarageSale = useMemo(() => {
        if (garageSales.length === 0) return null;
        return garageSales.reduce((latest, gs) =>
            gs.createdAt > latest.createdAt ? gs : latest
            , garageSales[0]);
    }, [garageSales]);

    useEffect(() => {
        if (isLoaded) {
            try {
                localStorage.setItem('ar-app-products', JSON.stringify(products));
            } catch (error) {
                console.error('Failed to save to localStorage:', error);
            }
        }
    }, [products, isLoaded]);

    useEffect(() => {
        if (isLoaded) {
            try {
                localStorage.setItem('ar-app-garage-sales', JSON.stringify(garageSales));
            } catch (error) {
                console.error('Failed to save garage sales to localStorage:', error);
            }
        }
    }, [garageSales, isLoaded]);

    const addGarageSale = useCallback((name: string): GarageSale => {
        const newGarageSale: GarageSale = {
            id: generateId(),
            name,
            createdAt: Date.now()
        };
        setGarageSales(prev => [...prev, newGarageSale]);
        return newGarageSale;
    }, []);

    const addProduct = useCallback((product: Omit<Product, 'id'>) => {
        const newProduct = { ...product, id: generateId() };
        setProducts(prev => [...prev, newProduct]);
    }, []);

    const updateProduct = useCallback((id: string, updated: Partial<Product>) => {
        setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p));
    }, []);

    const deleteProduct = useCallback((id: string) => {
        setProducts(prev => prev.filter(p => p.id !== id));
    }, []);

    const getProduct = useCallback((id: string) => products.find(p => p.id === id), [products]);

    const getProductsByGarageSale = useCallback((id: string) => {
        return products.filter(p => p.garageSaleId === id);
    }, [products]);

    const value = useMemo(() => ({
        products,
        garageSales,
        currentGarageSale,
        addProduct,
        updateProduct,
        deleteProduct,
        getProduct,
        addGarageSale,
        getProductsByGarageSale
    }), [products, garageSales, currentGarageSale, addProduct, updateProduct, deleteProduct, getProduct, addGarageSale, getProductsByGarageSale]);

    // Avoid rendering children until initial load to prevent hydration mismatch
    if (!isLoaded) return null;

    return (
        <ProductContext.Provider value={value}>
            {children}
        </ProductContext.Provider>
    );
};

export const useProducts = () => {
    const context = useContext(ProductContext);
    if (!context) {
        throw new Error('useProducts must be used within a ProductProvider');
    }
    return context;
};
