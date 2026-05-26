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

const Terms = () => {
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
          <span className="text-sm text-muted-foreground">Última atualização: 25/05/2026</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Termos de Uso — FLM 26</h1>
          <p className="text-muted-foreground">
            Bem-vindo ao FLM 26 — Football Life Manager. Ao acessar, criar conta ou utilizar
            qualquer funcionalidade do jogo, o usuário concorda automaticamente com os presentes
            Termos de Uso.
          </p>
        </div>

        <Section title="1. Sobre o FLM 26">
          <p>
            O FLM 26 é um jogo online de gerenciamento de futebol onde os usuários podem
            administrar clubes, disputar campeonatos, desenvolver jogadores, negociar atletas,
            lançar uniformes, participar de rankings e utilizar diversos sistemas internos do game.
          </p>
          <p>O jogo encontra-se em constante desenvolvimento e poderá receber:</p>
          <List
            items={[
              "atualizações",
              "mudanças de balanceamento",
              "manutenção",
              "novos sistemas",
              "correções de bugs",
              "reinicializações parciais",
              "temporadas novas",
            ]}
          />
        </Section>

        <Section title="2. Criação de Conta">
          <p>Ao criar uma conta no FLM 26, o usuário concorda que:</p>
          <List
            items={[
              "fornecerá informações válidas",
              "não utilizará identidade falsa",
              "não compartilhará sua conta",
              "é responsável pela segurança da própria conta",
            ]}
          />
          <p>A administração do FLM 26 não se responsabiliza por:</p>
          <List items={["contas roubadas", "compartilhamento de senha", "perdas causadas por terceiros"]} />
        </Section>

        <Section title="3. Conduta dos Jogadores">
          <p>É proibido:</p>
          <List
            items={[
              "utilizar hacks",
              "explorar bugs",
              "usar automações ilegais",
              "manipular partidas",
              "abusar de falhas econômicas",
              "vender contas sem autorização",
              "praticar assédio, racismo ou discurso ofensivo",
              "prejudicar propositalmente o funcionamento do jogo",
            ]}
          />
          <p>Jogadores que violarem as regras poderão sofrer:</p>
          <List
            items={[
              "advertência",
              "suspensão",
              "reset de conta",
              "banimento temporário",
              "banimento permanente",
            ]}
          />
        </Section>

        <Section title="4. Economia e Sistemas do Jogo">
          <p>
            Todos os valores, moedas virtuais, jogadores, rankings e itens do FLM 26 pertencem ao
            sistema do jogo e podem sofrer alterações a qualquer momento para:
          </p>
          <List
            items={[
              "balanceamento",
              "correções",
              "prevenção de exploits",
              "atualização de temporada",
            ]}
          />
          <p>A administração poderá:</p>
          <List
            items={[
              "corrigir transações bugadas",
              "remover recursos obtidos ilegalmente",
              "redefinir sistemas afetados por falhas graves",
            ]}
          />
        </Section>

        <Section title="5. Acesso Antecipado">
          <p>Usuários do acesso antecipado entendem que:</p>
          <List
            items={[
              "o jogo ainda pode conter bugs",
              "sistemas podem mudar",
              "funcionalidades podem ser removidas ou refeitas",
              "instabilidades podem ocorrer",
            ]}
          />
          <p>O feedback da comunidade poderá ser utilizado para melhorar o desenvolvimento do FLM 26.</p>
        </Section>

        <Section title="6. Compras, Premium e Doações">
          <p>Recursos premium, doações e contribuições ajudam no desenvolvimento do jogo.</p>
          <p>Ao realizar pagamentos:</p>
          <List
            items={[
              "o usuário entende que está apoiando o projeto",
              "benefícios podem mudar futuramente",
              "pagamentos não garantem vantagens permanentes",
              "compras podem ser ajustadas em caso de exploração ou erro",
            ]}
          />
          <p>Tentativas de fraude resultarão em banimento.</p>
        </Section>

        <Section title="7. Disponibilidade dos Serviços">
          <p>O FLM 26 poderá ficar temporariamente indisponível devido a:</p>
          <List
            items={[
              "manutenção",
              "atualizações",
              "problemas técnicos",
              "falhas de hospedagem",
              "ataques externos",
              "instabilidades do servidor",
            ]}
          />
          <p>Não garantimos funcionamento ininterrupto 24h por dia.</p>
        </Section>

        <Section title="8. Propriedade Intelectual">
          <p>Todos os elementos do FLM 26 pertencem ao projeto, incluindo:</p>
          <List
            items={[
              "nome",
              "identidade visual",
              "sistemas",
              "interface",
              "códigos",
              "artes",
              "logos",
              "mecânicas",
              "conteúdos exclusivos",
            ]}
          />
          <p>É proibida a cópia parcial ou total sem autorização.</p>
        </Section>

        <Section title="9. Privacidade">
          <p>O FLM 26 poderá armazenar:</p>
          <List
            items={[
              "dados básicos da conta",
              "progresso do jogo",
              "estatísticas",
              "informações necessárias para funcionamento da plataforma",
            ]}
          />
          <p>Os dados não serão vendidos para terceiros.</p>
        </Section>

        <Section title="10. Alterações nos Termos">
          <p>Os Termos de Uso poderão ser modificados a qualquer momento para acompanhar:</p>
          <List
            items={[
              "atualizações do jogo",
              "mudanças legais",
              "novos sistemas",
              "melhorias de segurança",
            ]}
          />
          <p>O uso contínuo do FLM 26 após alterações representa concordância com os novos termos.</p>
        </Section>

        <Section title="11. Banimentos e Punições">
          <p>A administração do FLM 26 possui direito de:</p>
          <List
            items={[
              "investigar atividades suspeitas",
              "remover conteúdos indevidos",
              "aplicar punições sem aviso prévio em casos graves",
            ]}
          />
          <p>Exploração de bugs de propósito poderá resultar em banimento permanente.</p>
        </Section>

        <Section title="12. Contato">
          <p>Dúvidas, denúncias ou suporte poderão ser realizados pelos canais oficiais do FLM 26.</p>
        </Section>

        <footer className="pt-8 border-t border-border text-center text-sm text-muted-foreground">
          © 2026 FLM 26 — Football Life Manager. Todos os direitos reservados.
        </footer>
      </main>
    </div>
  );
};

export default Terms;
