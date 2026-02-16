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
    criadoEm: number;
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
    addGarageSale: (garageSale: Omit<GarageSale, 'id' | 'criadoEm'>) => GarageSale;
    updateGarageSale: (id: string, garageSale: Partial<GarageSale>) => void;
    deleteGarageSale: (id: string) => void;
    getGarageSale: (id: string) => GarageSale | undefined;
    addProduct: (product: Omit<Product, 'id' | 'status'>) => Product;
    updateProduct: (id: string, product: Partial<Product>) => void;
    deleteProduct: (id: string) => void;
    getProduct: (id: string) => Product | undefined;
    getProductsByGarageSale: (garageSaleId: string) => Product[];
}

const GarageSaleContext = createContext<GarageSaleContextType | undefined>(undefined);

const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

export const GarageSaleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [garageSales, setGarageSales] = useState<GarageSale[]>(() => {
        if (typeof window === 'undefined') return [];
        const stored = localStorage.getItem('garage-sales');
        return stored ? JSON.parse(stored) : [];
    });

    const [products, setProducts] = useState<Product[]>(() => {
        if (typeof window === 'undefined') return [];
        const stored = localStorage.getItem('garage-sale-products');
        return stored ? JSON.parse(stored) : [];
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem('garage-sales', JSON.stringify(garageSales));
        } catch (error) {
            console.error('Erro ao salvar Garage Sales:', error);
        }
    }, [garageSales]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem('garage-sale-products', JSON.stringify(products));
        } catch (error) {
            console.error('Erro ao salvar produtos:', error);
            if (error instanceof DOMException && error.name === 'QuotaExceededError') {
                alert('Armazenamento cheio! Não foi possível salvar o produto. Tente remover produtos antigos ou usar menos imagens.');
            }
        }
    }, [products]);

    const addGarageSale = useCallback((garageSale: Omit<GarageSale, 'id' | 'criadoEm'>): GarageSale => {
        const newGarageSale: GarageSale = {
            ...garageSale,
            id: generateId(),
            criadoEm: Date.now()
        };
        setGarageSales(prev => [...prev, newGarageSale]);
        return newGarageSale;
    }, []);

    const updateGarageSale = useCallback((id: string, updated: Partial<GarageSale>) => {
        setGarageSales(prev => prev.map(gs => gs.id === id ? { ...gs, ...updated } : gs));
    }, []);

    const deleteGarageSale = useCallback((id: string) => {
        setGarageSales(prev => prev.filter(gs => gs.id !== id));
        setProducts(prev => prev.filter(p => p.garageSaleId !== id));
    }, []);

    const getGarageSale = useCallback((id: string) => {
        return garageSales.find(gs => gs.id === id);
    }, [garageSales]);

    const addProduct = useCallback((product: Omit<Product, 'id' | 'status'>): Product => {
        const newProduct: Product = {
            ...product,
            id: generateId(),
            status: 'disponível'
        };
        setProducts(prev => [...prev, newProduct]);
        return newProduct;
    }, []);

    const updateProduct = useCallback((id: string, updated: Partial<Product>) => {
        setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p));
    }, []);

    const deleteProduct = useCallback((id: string) => {
        setProducts(prev => prev.filter(p => p.id !== id));
    }, []);

    const getProduct = useCallback((id: string) => {
        return products.find(p => p.id === id);
    }, [products]);

    const getProductsByGarageSale = useCallback((garageSaleId: string) => {
        return products.filter(p => p.garageSaleId === garageSaleId);
    }, [products]);

    const value = useMemo(() => ({
        garageSales,
        products,
        addGarageSale,
        updateGarageSale,
        deleteGarageSale,
        getGarageSale,
        addProduct,
        updateProduct,
        deleteProduct,
        getProduct,
        getProductsByGarageSale
    }), [
        garageSales,
        products,
        addGarageSale,
        updateGarageSale,
        deleteGarageSale,
        getGarageSale,
        addProduct,
        updateProduct,
        deleteProduct,
        getProduct,
        getProductsByGarageSale
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
