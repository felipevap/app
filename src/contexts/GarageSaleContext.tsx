"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';

export interface GarageSale {
    id: string;
    nome: string;
    dataInicio: string;
    dataFim: string;
    endereco: string;
    responsavel: string;
    email: string;
    regras: string;
    banner?: string;
    criadoEm: number; // Mantido para compatibilidade
}

export interface Product {
    id: string;
    nome: string;
    descricao: string;
    preco: number;
    imagens: string[];
    categoria: string;
    condicao: string;
    tags: string[];
    garageSaleId: string;
    status: 'disponível' | 'vendido';
}

interface GarageSaleContextType {
    garageSales: GarageSale[];
    products: Product[];
    loading: boolean;
    addGarageSale: (garageSale: Omit<GarageSale, 'id' | 'criadoEm'>) => Promise<GarageSale>;
    updateGarageSale: (id: string, garageSale: Partial<GarageSale>) => Promise<void>;
    deleteGarageSale: (id: string) => Promise<void>;
    getGarageSale: (id: string) => GarageSale | undefined;
    addProduct: (product: Omit<Product, 'id' | 'status'>) => Promise<Product>;
    updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
    deleteProduct: (id: string) => Promise<void>;
    getProduct: (id: string) => Product | undefined;
    getProductsByGarageSale: (garageSaleId: string) => Product[];
    createSale: (sale: any) => Promise<any>;
    refreshData: () => Promise<void>;
}

const GarageSaleContext = createContext<GarageSaleContextType | undefined>(undefined);

export const GarageSaleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [garageSales, setGarageSales] = useState<GarageSale[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [gsRes, prodRes] = await Promise.all([
                fetch('/api/garage-sales'),
                fetch('/api/products')
            ]);

            if (gsRes.ok && prodRes.ok) {
                const gsData = await gsRes.json();
                const prodData = await prodRes.json();
                setGarageSales(gsData);
                setProducts(prodData);
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const addGarageSale = useCallback(async (garageSale: Omit<GarageSale, 'id' | 'criadoEm'>): Promise<GarageSale> => {
        const res = await fetch('/api/garage-sales', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(garageSale)
        });

        if (!res.ok) throw new Error('Failed to create garage sale');

        const newGarageSale = await res.json();
        setGarageSales(prev => [newGarageSale, ...prev]);
        return newGarageSale;
    }, []);

    const updateGarageSale = useCallback(async (id: string, updated: Partial<GarageSale>) => {
        // TODO: Implementar PUT
        setGarageSales(prev => prev.map(gs => gs.id === id ? { ...gs, ...updated } : gs));
    }, []);

    const deleteGarageSale = useCallback(async (id: string) => {
        // TODO: Implementar DELETE
        setGarageSales(prev => prev.filter(gs => gs.id !== id));
        setProducts(prev => prev.filter(p => p.garageSaleId !== id));
    }, []);

    const getGarageSale = useCallback((id: string) => {
        return garageSales.find(gs => gs.id === id);
    }, [garageSales]);

    const addProduct = useCallback(async (product: Omit<Product, 'id' | 'status'>): Promise<Product> => {
        const res = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(product)
        });

        if (!res.ok) throw new Error('Failed to create product');

        const newProduct = await res.json();
        setProducts(prev => [newProduct, ...prev]);
        return newProduct;
    }, []);

    const updateProduct = useCallback(async (id: string, updated: Partial<Product>) => {
        const res = await fetch(`/api/products/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated)
        });

        if (!res.ok) throw new Error('Failed to update product');

        const updatedProduct = await res.json();
        setProducts(prev => prev.map(p => p.id === id ? updatedProduct : p));
    }, []);

    const deleteProduct = useCallback(async (id: string) => {
        setProducts(prev => prev.filter(p => p.id !== id));
    }, []);

    const getProduct = useCallback((id: string) => {
        return products.find(p => p.id === id);
    }, [products]);

    const getProductsByGarageSale = useCallback((garageSaleId: string) => {
        return products.filter(p => p.garageSaleId === garageSaleId);
    }, [products]);

    const createSale = useCallback(async (sale: any) => {
        const res = await fetch('/api/sales', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sale)
        });

        if (!res.ok) throw new Error('Failed to create sale');

        const newSale = await res.json();
        await fetchData();
        return newSale;
    }, [fetchData]);

    const value = useMemo(() => ({
        garageSales,
        products,
        loading,
        addGarageSale,
        updateGarageSale,
        deleteGarageSale,
        getGarageSale,
        addProduct,
        updateProduct,
        deleteProduct,
        getProduct,
        getProductsByGarageSale,
        createSale,
        refreshData: fetchData
    }), [
        garageSales,
        products,
        loading,
        addGarageSale,
        updateGarageSale,
        deleteGarageSale,
        getGarageSale,
        addProduct,
        updateProduct,
        deleteProduct,
        getProduct,
        getProductsByGarageSale,
        createSale,
        fetchData
    ]);

    return (
        <GarageSaleContext.Provider value={value}>
            {children}
        </GarageSaleContext.Provider>
    );
};

export const useGarageSales = () => {
    const context = useContext(GarageSaleContext);
    if (!context) {
        throw new Error('useGarageSales must be used within a GarageSaleProvider');
    }
    return context;
};
