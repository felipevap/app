"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import type { ContractPairStatus } from "@/lib/garage-sale-contract-pair-status";

export interface GarageSale {
    id: string;
    slug?: string | null;
    nome: string;
    dataInicio: string;
    dataFim: string;
    horarioInicio?: string | null;
    horarioFim?: string | null;
    endereco: string;
    responsavel: string;
    email: string;
    regras: string;
    criadoEm: number;
    deletedAt?: string | null;
    cep?: string | null;
    cpf?: string | null;
    pix?: string | null;
    itemsRegistrationComplete?: boolean;
    itemsRegistrationCompletedAt?: string | null;
    createdAt?: string;
    commissionPercent?: number;
    arScoreThreshold?: number;
    reservationTTLMinutes?: number;
    contractPairStatus?: ContractPairStatus;
}

export interface Product {
    id: string;
    nome: string;
    descricao: string;
    preco: number;
    imagens: string[];
    embedding?: number[] | null;
    categoria: string;
    condicao: string;
    tags: string[];
    garageSaleId: string;
    status: 'disponível' | 'vendido' | 'reservado';
    reservedBy?: string | null;
    reservedByName?: string | null;
    reservedByEmail?: string | null;
    reservedByPhone?: string | null;
    deletedAt?: string | null;
}

interface GarageSaleContextType {
    garageSales: GarageSale[];
    products: Product[];
    loading: boolean;
    addGarageSale: (
        garageSale: Omit<GarageSale, 'id' | 'criadoEm'> & {
            tenantId?: string;
            commissionPercent?: number;
            contractTemplateId?: string;
            filledParams?: Record<string, string>;
        }
    ) => Promise<GarageSale>;
    updateGarageSale: (id: string, garageSale: Partial<GarageSale>) => Promise<void>;
    deleteGarageSale: (id: string) => Promise<void>;
    getGarageSale: (id: string) => GarageSale | undefined;
    addProduct: (product: Omit<Product, 'id' | 'status'>) => Promise<Product>;
    updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
    deleteProduct: (id: string, permanent?: boolean) => Promise<void>;
    restoreProduct: (id: string) => Promise<void>;
    getProduct: (id: string) => Product | undefined;
    getProductsByGarageSale: (garageSaleId: string) => Product[];
    createSale: (sale: any) => Promise<any>;
    refreshData: (options?: { includeDeleted?: boolean; silent?: boolean }) => Promise<Product[] | undefined>;
}

const GarageSaleContext = createContext<GarageSaleContextType | undefined>(undefined);

export const GarageSaleProvider: React.FC<{ children: ReactNode; initialAuthenticated?: boolean }> = ({
    children,
    initialAuthenticated = false,
}) => {
    const [garageSales, setGarageSales] = useState<GarageSale[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(initialAuthenticated);

    const fetchData = useCallback(async (options?: { includeDeleted?: boolean; silent?: boolean }) => {
        try {
            if (!options?.silent) setLoading(true);
            const query = options?.includeDeleted ? '?includeDeleted=true' : '';
            const timestamp = new Date().getTime();
            const [gsRes, prodRes] = await Promise.all([
                fetch(`/api/garage-sales${query}`, { cache: 'no-store' }),
                fetch(`/api/products${query}${query ? '&' : '?'}t=${timestamp}`, { cache: 'no-store' })
            ]);

            if (gsRes.ok && prodRes.ok) {
                const gsData = await gsRes.json();
                const prodData = await prodRes.json();
                setGarageSales(gsData);
                setProducts(prodData);
                return prodData as Product[];
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            if (!options?.silent) setLoading(false);
        }
        return undefined;
    }, []);

    useEffect(() => {
        if (!initialAuthenticated) {
            setLoading(false);
            return;
        }
        fetchData();
    }, [initialAuthenticated, fetchData]);

    const addGarageSale = useCallback(async (
        garageSale: Omit<GarageSale, 'id' | 'criadoEm'> & {
            tenantId?: string;
            commissionPercent?: number;
            contractTemplateId?: string;
            filledParams?: Record<string, string>;
        }
    ): Promise<GarageSale> => {
        const { tenantId, contractTemplateId, filledParams, ...rest } = garageSale;
        const body = {
            ...rest,
            ...(tenantId ? { tenantId } : {}),
            ...(contractTemplateId ? { contractTemplateId } : {}),
            ...(filledParams ? { filledParams } : {}),
        };
        const res = await fetch('/api/garage-sales', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            let message = "Falha ao criar evento";
            try {
                const j = (await res.json()) as { error?: string };
                if (j?.error) message = j.error;
            } catch {
                /* ignore */
            }
            throw new Error(message);
        }

        const newGarageSale = await res.json();
        setGarageSales(prev => [newGarageSale, ...prev]);
        return newGarageSale;
    }, []);

    const updateGarageSale = useCallback(async (id: string, updated: Partial<GarageSale>) => {
        const res = await fetch(`/api/garage-sales/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated)
        });

        if (!res.ok) throw new Error('Failed to update garage sale');

        const updatedGS = await res.json();
        setGarageSales(prev => prev.map(gs => gs.id === id ? updatedGS : gs));
    }, []);

    const deleteGarageSale = useCallback(async (id: string) => {
        const res = await fetch(`/api/garage-sales/${id}`, {
            method: 'DELETE'
        });

        if (!res.ok) throw new Error('Failed to delete garage sale');

        setGarageSales(prev => prev.filter(gs => gs.id !== id));
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

    const deleteProduct = useCallback(async (id: string, permanent: boolean = false) => {
        const query = permanent ? '?permanent=true' : '';
        const res = await fetch(`/api/products/${id}${query}`, {
            method: 'DELETE'
        });

        if (!res.ok) throw new Error('Failed to delete product');

        if (permanent) {
            // Hard delete: remove from state completely
            setProducts(prev => prev.filter(p => p.id !== id));
        } else {
            // Soft delete: update locally to reflect deleted status
            setProducts(prev => prev.map(p => p.id === id ? { ...p, deletedAt: new Date().toISOString() } : p));
        }
    }, []);

    const restoreProduct = useCallback(async (id: string) => {
        const res = await fetch(`/api/products/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deletedAt: null })
        });

        if (!res.ok) throw new Error('Failed to restore product');

        const updatedProduct = await res.json();
        setProducts(prev => prev.map(p => p.id === id ? updatedProduct : p));
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
        restoreProduct,
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
        restoreProduct,
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
