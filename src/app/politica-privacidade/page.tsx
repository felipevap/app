import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Política de Privacidade",
    description:
        "Política de Privacidade do Portal Garage, em conformidade com a Lei Geral de Proteção de Dados (LGPD).",
};

const LAST_UPDATED = "19 de abril de 2026";

export default function PoliticaPrivacidadePage() {
    return (
        <main className="mx-auto max-w-3xl px-6 py-12 text-stone-800">
            <header className="mb-8">
                <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Portal Garage</p>
                <h1 className="mt-2 font-serif text-4xl font-semibold text-stone-900">
                    Política de Privacidade
                </h1>
                <p className="mt-2 text-sm text-stone-500">Última atualização: {LAST_UPDATED}</p>
            </header>

            <section className="space-y-6 text-sm leading-relaxed">
                <p>
                    Esta Política de Privacidade descreve como o Portal Garage (&ldquo;nós&rdquo;)
                    coleta, utiliza, armazena e compartilha dados pessoais dos seus usuários
                    (&ldquo;você&rdquo;) em conformidade com a <strong>Lei nº 13.709/2018 – Lei
                    Geral de Proteção de Dados Pessoais (LGPD)</strong>.
                </p>

                <h2 className="mt-8 text-lg font-semibold text-stone-900">1. Dados coletados</h2>
                <ul className="list-disc space-y-1 pl-6">
                    <li>
                        <strong>Dados cadastrais:</strong> nome, e-mail, telefone, CPF e CEP quando
                        você cria uma organização, cadastra-se como proprietário de um evento ou
                        finaliza um pedido.
                    </li>
                    <li>
                        <strong>Dados contratuais:</strong> texto e parâmetros preenchidos em
                        contratos de prestação de serviço e inventário, assinaturas digitais (PNG)
                        e registros de aceite.
                    </li>
                    <li>
                        <strong>Dados do evento:</strong> endereço, datas e regras dos eventos
                        (garage sales), chave PIX informada pelo proprietário.
                    </li>
                    <li>
                        <strong>Dados de produtos:</strong> fotografias enviadas por
                        administradores e representações vetoriais (embeddings) usadas para
                        reconhecimento visual.
                    </li>
                    <li>
                        <strong>Dados técnicos:</strong> cookies essenciais de autenticação
                        (<code>gg_session</code>), identificador anônimo do dispositivo
                        (<code>garage_sale_session_id</code>), logs de erro no servidor.
                    </li>
                </ul>

                <h2 className="mt-6 text-lg font-semibold text-stone-900">2. Finalidades</h2>
                <ul className="list-disc space-y-1 pl-6">
                    <li>Autenticar usuários e manter sessões seguras.</li>
                    <li>Executar o ciclo de um evento: cadastro, contratos, vendas e repasse.</li>
                    <li>Identificar produtos via câmera durante o evento (checagem e PDV).</li>
                    <li>Cumprir obrigações legais, contábeis, fiscais e regulatórias.</li>
                </ul>

                <h2 className="mt-6 text-lg font-semibold text-stone-900">3. Bases legais</h2>
                <p>
                    Tratamos dados com base em <strong>execução de contrato</strong> (art. 7º, V),
                    <strong> cumprimento de obrigação legal</strong> (art. 7º, II),
                    <strong> legítimo interesse</strong> (art. 7º, IX) para segurança e prevenção a
                    fraude, e <strong>consentimento</strong> (art. 7º, I) quando necessário.
                </p>

                <h2 className="mt-6 text-lg font-semibold text-stone-900">4. Compartilhamento</h2>
                <p>
                    Os dados pessoais são compartilhados apenas com operadores estritamente
                    necessários à prestação do serviço (por exemplo, provedor de banco de dados e
                    hospedagem em nuvem). Não vendemos seus dados a terceiros.
                </p>

                <h2 className="mt-6 text-lg font-semibold text-stone-900">5. Retenção</h2>
                <p>
                    Dados cadastrais e contratuais são mantidos enquanto a conta estiver ativa e
                    por até <strong>5 (cinco) anos</strong> após o encerramento, para atender a
                    obrigações legais. Embeddings e fotos de produtos permanecem associados ao
                    evento enquanto ele existir.
                </p>

                <h2 className="mt-6 text-lg font-semibold text-stone-900">
                    6. Direitos do titular (art. 18 da LGPD)
                </h2>
                <ul className="list-disc space-y-1 pl-6">
                    <li>Confirmação da existência de tratamento.</li>
                    <li>Acesso e portabilidade dos dados.</li>
                    <li>Correção de dados incompletos, inexatos ou desatualizados.</li>
                    <li>Anonimização, bloqueio ou eliminação de dados desnecessários.</li>
                    <li>Revogação do consentimento e exclusão dos dados tratados com base nele.</li>
                </ul>
                <p>
                    Para exercer qualquer direito, entre em contato com o Encarregado de Dados
                    (DPO) pelo e-mail{" "}
                    <a className="text-violet-700 underline" href="mailto:privacidade@portal-garage.local">
                        privacidade@portal-garage.local
                    </a>
                    . Responderemos em até 15 dias.
                </p>

                <h2 className="mt-6 text-lg font-semibold text-stone-900">7. Segurança</h2>
                <p>
                    Aplicamos medidas técnicas e administrativas razoáveis para proteger seus
                    dados, incluindo criptografia de senhas com bcrypt, sessões JWT com segredo
                    rotacionável, cookies <code>HttpOnly</code>/<code>Secure</code> em produção e
                    segregação por tenant (organização).
                </p>

                <h2 className="mt-6 text-lg font-semibold text-stone-900">8. Cookies</h2>
                <p>
                    Utilizamos apenas cookies essenciais de autenticação. Não usamos cookies de
                    rastreamento publicitário.
                </p>

                <h2 className="mt-6 text-lg font-semibold text-stone-900">9. Alterações</h2>
                <p>
                    Podemos atualizar esta Política de tempos em tempos. A data da última
                    atualização está no topo desta página.
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
