import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-3">
    <h2 className="text-xl font-semibold text-foreground">{title}</h2>
    <div className="text-muted-foreground leading-relaxed space-y-2">{children}</div>
  </section>
);

const List = ({ items }: { items: string[] }) => (
  <ul className="list-disc pl-6 space-y-1">
    {items.map((it) => (
      <li key={it}>{it}</li>
    ))}
  </ul>
);

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <span className="text-sm text-muted-foreground">Última atualização: 26/05/2026</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Política de Privacidade — FLM</h1>
          <p className="text-muted-foreground">
            Esta Política de Privacidade explica como o FLM coleta, utiliza, armazena e protege as
            informações dos usuários que acessam a plataforma, seja via navegador, aplicativo mobile
            ou outros meios oficiais.
          </p>
          <p className="text-muted-foreground">Elaborada em conformidade com a legislação brasileira aplicável, especialmente:</p>
          <List
            items={[
              "Lei nº 13.709/2018 — Lei Geral de Proteção de Dados Pessoais (LGPD)",
              "Lei nº 12.965/2014 — Marco Civil da Internet",
              "Lei nº 8.078/1990 — Código de Defesa do Consumidor",
              "Demais normas aplicáveis à proteção de dados, serviços digitais e segurança da informação",
            ]}
          />
          <p className="text-muted-foreground">Ao utilizar o FLM, o usuário declara que leu, compreendeu e concorda com esta Política de Privacidade.</p>
        </div>

        <Section title="1. Sobre o FLM">
          <p>
            O FLM é um jogo online de gerenciamento de futebol que permite aos usuários criar e
            administrar clubes, participar de ligas, copas, rankings, partidas simuladas, sistemas
            de treinamento, fisioterapia, categorias de base, negociações, eventos internos e
            outros recursos relacionados à experiência do game.
          </p>
          <p>
            O FLM pode operar em versões beta, acesso antecipado e versões em desenvolvimento
            contínuo, podendo receber alterações, correções e novos sistemas a qualquer momento.
          </p>
        </Section>

        <Section title="2. Base Legal para Tratamento de Dados">
          <p>O tratamento de dados realizado pelo FLM possui fundamento legal conforme a LGPD, incluindo:</p>
          <List
            items={[
              "Consentimento do usuário",
              "Execução de contrato e prestação do serviço",
              "Cumprimento de obrigações legais",
              "Exercício regular de direitos",
              "Proteção ao crédito e prevenção de fraudes",
              "Legítimo interesse para melhoria e segurança da plataforma",
            ]}
          />
        </Section>

        <Section title="3. Informações Coletadas">
          <h3 className="text-base font-semibold text-foreground">3.1 Dados fornecidos pelo usuário</h3>
          <List
            items={[
              "Nome de usuário",
              "Endereço de e-mail",
              "Senha criptografada",
              "Foto de perfil",
              "Dados inseridos dentro do jogo",
              "Informações de pagamento",
              "Mensagens enviadas ao suporte",
            ]}
          />
          <h3 className="text-base font-semibold text-foreground pt-2">3.2 Dados coletados automaticamente</h3>
          <List
            items={[
              "Endereço IP",
              "Tipo de navegador",
              "Sistema operacional",
              "Modelo do dispositivo",
              "Logs de acesso",
              "Cookies e sessões",
              "Dados de uso da plataforma",
              "Informações de desempenho do sistema",
            ]}
          />
        </Section>

        <Section title="4. Uso das Informações">
          <List
            items={[
              "Criar e manter contas",
              "Permitir acesso ao jogo",
              "Salvar progresso e estatísticas",
              "Gerar rankings e classificações",
              "Melhorar sistemas do FLM",
              "Detectar fraudes e abusos",
              "Processar pagamentos",
              "Garantir segurança da plataforma",
              "Cumprir obrigações legais",
            ]}
          />
        </Section>

        <Section title="5. Estatísticas e Conteúdo Público">
          <p>O FLM poderá exibir publicamente dentro da plataforma:</p>
          <List
            items={[
              "Nome dos clubes",
              "Rankings",
              "Estatísticas",
              "Histórico de partidas",
              "Títulos e conquistas",
              "Informações competitivas relacionadas ao jogo",
            ]}
          />
          <p>Esses dados fazem parte da funcionalidade online do FLM.</p>
        </Section>

        <Section title="6. Compartilhamento de Dados">
          <p>O FLM não comercializa dados pessoais. As informações poderão ser compartilhadas apenas:</p>
          <List
            items={[
              "Com serviços necessários ao funcionamento da plataforma",
              "Com sistemas de pagamento",
              "Para cumprimento de ordens judiciais ou obrigações legais",
              "Para investigação de fraudes e segurança",
            ]}
          />
        </Section>

        <Section title="7. Cookies e Tecnologias Semelhantes">
          <List
            items={[
              "Cookies",
              "Local Storage",
              "Tokens de autenticação",
              "Ferramentas analíticas",
              "Tecnologias de sessão",
            ]}
          />
          <p>Esses recursos auxiliam na segurança, desempenho e funcionamento da plataforma.</p>
        </Section>

        <Section title="8. Segurança das Informações">
          <p>O FLM adota medidas técnicas e administrativas adequadas para proteger os dados pessoais contra:</p>
          <List
            items={[
              "Acessos não autorizados",
              "Vazamentos",
              "Alterações indevidas",
              "Destruição ou perda de dados",
              "Atividades maliciosas",
            ]}
          />
          <p>Nos termos do artigo 46 da LGPD, o FLM busca aplicar medidas de segurança aptas à proteção dos dados pessoais.</p>
        </Section>

        <Section title="9. Proteção Contra Fraudes e Manipulação">
          <p>O FLM poderá monitorar atividades suspeitas envolvendo:</p>
          <List
            items={[
              "Exploração de bugs",
              "Uso de softwares ilegais",
              "Manipulação de partidas",
              "Tentativas de invasão",
              "Automação não autorizada",
              "Fraudes financeiras",
            ]}
          />
          <p>O FLM poderá aplicar advertências, suspensões temporárias ou banimentos permanentes.</p>
        </Section>

        <Section title="10. Responsabilidade do Usuário">
          <List
            items={[
              "Manter sua senha segura",
              "Não compartilhar a conta",
              "Utilizar informações verdadeiras",
              "Proteger seus dispositivos",
            ]}
          />
          <p>Nos termos do Marco Civil da Internet, cada usuário responde pelas atividades realizadas em sua conta.</p>
        </Section>

        <Section title="11. Direitos do Usuário — LGPD">
          <p>Conforme os artigos 17 e 18 da LGPD, o usuário poderá solicitar:</p>
          <List
            items={[
              "Confirmação da existência de tratamento",
              "Acesso aos dados",
              "Correção de informações",
              "Exclusão de dados",
              "Portabilidade",
              "Revogação de consentimento",
              "Informações sobre compartilhamento de dados",
            ]}
          />
          <p>As solicitações poderão ser feitas pelos canais oficiais do FLM.</p>
        </Section>

        <Section title="12. Armazenamento e Retenção de Dados">
          <List
            items={[
              "Enquanto a conta permanecer ativa",
              "Pelo período necessário para cumprimento legal",
              "Para proteção contra fraudes",
              "Para exercício regular de direitos",
            ]}
          />
          <p>Mesmo após solicitação de exclusão, determinados dados poderão ser mantidos conforme permitido pela legislação brasileira.</p>
        </Section>

        <Section title="13. Uso por Menores de Idade">
          <p>Usuários menores de 18 anos devem utilizar o FLM com autorização de seus responsáveis legais.</p>
          <p>Nos termos do artigo 14 da LGPD, dados de menores receberão proteção especial.</p>
        </Section>

        <Section title="14. Compras, Pagamentos e Recursos Premium">
          <List
            items={[
              "Assinaturas",
              "Recursos premium",
              "Benefícios de acesso antecipado",
              "Conteúdos pagos",
            ]}
          />
          <p>Os pagamentos poderão ser processados por plataformas terceirizadas seguras e certificadas.</p>
        </Section>

        <Section title="15. Sistema de Login e Autenticação">
          <p>O FLM utiliza sistemas de autenticação para proteção das contas.</p>
          <p>Tentativas de acesso indevido, fraude ou invasão poderão resultar em bloqueio preventivo e comunicação às autoridades competentes, quando necessário.</p>
        </Section>

        <Section title="16. Estatísticas e Análise de Desempenho">
          <List
            items={[
              "Melhorar estabilidade",
              "Corrigir falhas",
              "Balancear sistemas",
              "Melhorar experiência do usuário",
              "Monitorar desempenho da plataforma",
            ]}
          />
        </Section>

        <Section title="17. Versão Beta e Acesso Antecipado">
          <List
            items={[
              "Recursos poderão sofrer alterações",
              "Dados poderão ser ajustados",
              "Sistemas poderão ser reiniciados",
              "Instabilidades poderão ocorrer",
            ]}
          />
          <p>O usuário reconhece que versões em teste podem passar por mudanças frequentes.</p>
        </Section>

        <Section title="18. Alterações nesta Política">
          <List
            items={[
              "Mudanças legais",
              "Atualizações da plataforma",
              "Inclusão de novos serviços",
              "Melhorias operacionais",
            ]}
          />
          <p>Recomendamos revisão periódica desta Política.</p>
        </Section>

        <Section title="19. Contato e Suporte">
          <p>Para dúvidas relacionadas à privacidade, proteção de dados ou exercício de direitos legais, utilize os canais oficiais do FLM.</p>
        </Section>

        <footer className="pt-8 border-t border-border text-center text-sm text-muted-foreground">
          © FLM — Todos os direitos reservados.
        </footer>
      </main>
    </div>
  );
};

export default Privacy;
