export type ContractPairStatus = {
    service: { configured: boolean; signed: boolean };
    inventory: { configured: boolean; signed: boolean };
};

export const garageSaleContractStatusInclude = {
    contractTemplates: {
        include: {
            template: { select: { type: true } },
        },
    },
    contractAcceptances: {
        include: {
            template: { select: { type: true } },
        },
    },
} as const;

export function buildContractPairStatus(
    contractTemplates: { template: { type: string } }[],
    contractAcceptances: { template: { type: string } }[]
): ContractPairStatus {
    return {
        service: {
            configured: contractTemplates.some((t) => t.template.type === "service"),
            signed: contractAcceptances.some((a) => a.template.type === "service"),
        },
        inventory: {
            configured: contractTemplates.some((t) => t.template.type === "inventory"),
            signed: contractAcceptances.some((a) => a.template.type === "inventory"),
        },
    };
}

export function garageSaleRowToApiPayload<
    T extends {
        contractTemplates: { template: { type: string } }[];
        contractAcceptances: { template: { type: string } }[];
    },
>(row: T): Omit<T, "contractTemplates" | "contractAcceptances"> & { contractPairStatus: ContractPairStatus } {
    const { contractTemplates, contractAcceptances, ...rest } = row;
    return {
        ...rest,
        contractPairStatus: buildContractPairStatus(contractTemplates, contractAcceptances),
    };
}
