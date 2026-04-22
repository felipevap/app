import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Termos de Uso",
    description:
        "Termos de Uso do Portal Garage — direitos, deveres e responsabilidades dos usuários e da plataforma.",
};

const LAST_UPDATED = "19 de abril de 2026";

export default function TermosPage() {
    return (
        <main className="mx-auto max-w-3xl px-6 py-12 text-stone-800">
            <header className="mb-8">
                <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Portal Garage</p>
                <h1 className="mt-2 font-serif text-4xl font-semibold text-stone-900">
                    Termos de Uso
                </h1>
                <p className="mt-2 text-sm text-stone-500">Última atualização: {LAST_UPDATED}</p>
            </header>

            <section className="space-y-6 text-sm leading-relaxed">
                <p>
                    Estes Termos regulam o uso do Portal Garage, plataforma para organização de
                    eventos de vendas de garagem (&ldquo;Garage Sales&rdquo;), controle de
                    inventário, PDV, contratos digitais e checagem de preços via câmera. Ao
                    utilizar a plataforma, você declara estar de acordo com estes Termos e com a
                    nossa{" "}
                    <Link href="/politica-privacidade" className="text-violet-700 underline">
                        Política de Privacidade
                    </Link>
                    .
                </p>

                <h2 className="mt-8 text-lg font-semibold text-stone-900">1. Quem pode usar</h2>
                <p>
                    Apenas pessoas maiores de 18 anos, com capacidade civil plena, ou representantes
                    legais de pessoa jurídica podem criar uma conta. É proibido compartilhar
                    credenciais ou utilizar a conta de outrem.
                </p>

                <h2 className="mt-6 text-lg font-semibold text-stone-900">2. Planos e cobrança</h2>
                <p>
                    O plano padrão é oferecido em regime de assinatura. O período de avaliação, o
                    preço mensal e a data de renovação são exibidos no painel administrativo. O
                    cancelamento pode ser solicitado a qualquer momento; valores já pagos não são
                    estornados proporcionalmente, salvo obrigação legal.
                </p>

                <h2 className="mt-6 text-lg font-semibold text-stone-900">3. Responsabilidades do usuário</h2>
                <ul className="list-disc space-y-1 pl-6">
                    <li>Fornecer dados verdadeiros, completos e atualizados.</li>
                    <li>Manter a confidencialidade de senhas e tokens de sessão.</li>
                    <li>Utilizar a plataforma respeitando direitos de terceiros e a legislação
                        brasileira, em especial o Código de Defesa do Consumidor, a LGPD e as
                        normas fiscais aplicáveis à atividade.</li>
                    <li>Responder pelos conteúdos que publicar (fotos, descrições, cláusulas
                        contratuais, regras do evento).</li>
                </ul>

                <h2 className="mt-6 text-lg font-semibold text-stone-900">4. Contratos digitais</h2>
                <p>
                    Os modelos de contrato e os aceites registrados no Portal Garage têm efeito
                    probatório entre as partes. A plataforma armazena o texto renderizado, a
                    assinatura gráfica e o carimbo de tempo da aceitação, conforme a Lei
                    nº 14.063/2020 e o Código Civil.
                </p>

                <h2 className="mt-6 text-lg font-semibold text-stone-900">5. Reconhecimento de produtos</h2>
                <p>
                    A identificação automática de produtos por câmera (YOLO/MobileNet) é um
                    recurso auxiliar e <strong>não é infalível</strong>. O usuário deve revisar
                    nome, categoria e preço antes de concluir uma venda ou cadastro.
                </p>

                <h2 className="mt-6 text-lg font-semibold text-stone-900">6. Conteúdos proibidos</h2>
                <p>
                    É vedado cadastrar produtos ilícitos, fraudulentos, que violem direitos de
                    propriedade intelectual ou que representem ameaça à segurança pública. A
                    plataforma pode suspender contas em caso de descumprimento.
                </p>

                <h2 className="mt-6 text-lg font-semibold text-stone-900">7. Limitação de responsabilidade</h2>
                <p>
                    O Portal Garage atua como facilitador. Não somos parte das transações entre
                    comprador e vendedor, nem responsáveis pela qualidade, entrega ou legalidade
                    dos itens negociados. Respondemos, nos termos da lei, por falhas do próprio
                    serviço (disponibilidade e integridade de dados).
                </p>

                <h2 className="mt-6 text-lg font-semibold text-stone-900">8. Suspensão e encerramento</h2>
                <p>
                    Podemos suspender ou encerrar contas que violem estes Termos, a Política de
                    Privacidade ou a legislação aplicável, com notificação prévia quando
                    possível.
                </p>

                <h2 className="mt-6 text-lg font-semibold text-stone-900">9. Alterações</h2>
                <p>
                    Podemos atualizar estes Termos. Alterações relevantes serão comunicadas pelo
                    e-mail cadastrado ou por aviso dentro da plataforma, com antecedência razoável.
                </p>

                <h2 className="mt-6 text-lg font-semibold text-stone-900">10. Foro</h2>
                <p>
                    Fica eleito o foro da comarca do domicílio do usuário consumidor para dirimir
                    quaisquer controvérsias. Para usuários empresariais, fica eleito o foro da
                    sede da operadora da plataforma.
                </p>

                <p className="mt-10 text-center">
                    <Link href="/" className="text-violet-700 underline">
                        Voltar à página inicial
                    </Link>
                </p>
            </section>
        </main>
    );
}
