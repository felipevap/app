export const formatDate = (date: string | Date | null | undefined): string => {
    if (!date) return "";

    // If it's a string in yyyy-MM-dd format, parse parts to avoid timezone issues
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const [year, month, day] = date.split('-').map(Number);
        return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
    }

    // For other formats or Date objects
    const d = new Date(date);
    if (isNaN(d.getTime())) return ""; // Invalid date

    return d.toLocaleDateString('pt-BR', {
        timeZone: 'UTC', // Ensure consistent display independent of user timezone for stored dates
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

export const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};
