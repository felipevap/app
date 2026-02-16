export default function AdminDashboard() {
    return (
        <div className="space-y-6">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-white">Painel</h1>
                <p className="text-neutral-400">Bem-vindo ao centro de comando.</p>
            </header>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {[
                    { title: "Vendas Totais", value: "R$ 12.450", trend: "+12%" },
                    { title: "Produtos Ativos", value: "342", trend: "+5%" },
                    { title: "Aprovações Pendentes", value: "18", trend: "-2%" },
                ].map((stat, i) => (
                    <div
                        key={i}
                        className="rounded-xl border border-neutral-800 bg-neutral-950 p-6 shadow-sm"
                    >
                        <h3 className="text-sm font-medium text-neutral-400">
                            {stat.title}
                        </h3>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-white">
                                {stat.value}
                            </span>
                            <span
                                className={`text-sm ${stat.trend.startsWith("+") ? "text-green-400" : "text-red-400"
                                    }`}
                            >
                                {stat.trend}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-6">
                <h2 className="mb-4 text-xl font-bold text-white">Atividade Recente</h2>
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="flex items-center justify-between border-b border-neutral-800 pb-4 last:border-0 last:pb-0"
                        >
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-neutral-800" />
                                <div>
                                    <p className="font-medium text-white">Nova Venda Registrada</p>
                                    <p className="text-sm text-neutral-400">há 2 minutos</p>
                                </div>
                            </div>
                            <span className="text-sm font-medium text-green-400">
                                +R$ 150,00
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
