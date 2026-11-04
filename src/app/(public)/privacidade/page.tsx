export const metadata = { title: "Política de Privacidade" };

export default function PrivacidadePage() {
  return (
    <>
      <h1>Política de Privacidade</h1>
      <p className="text-[13px] text-muted-2">Última atualização: 4 de novembro de 2026</p>

      <p>
        O ImobiInsight é um sistema interno de gestão comercial usado pela imobiliária e por seus corretores. Esta política explica
        quais dados pessoais o sistema trata, por que e como, conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).
      </p>

      <h2>1. Dados tratados</h2>
      <ul>
        <li>
          <strong>Usuários do sistema</strong> (sócios, gestores, administrativo e corretores): nome, e-mail e foto de perfil
          fornecidos pelo login com Google, além de função, CRECI e telefone cadastrados pela imobiliária.
        </li>
        <li>
          <strong>Clientes e interessados</strong> (leads): nome, telefone, imóvel de interesse, bairro, origem do contato e histórico
          de atendimentos.
        </li>
        <li>
          <strong>Negócios</strong>: contratos de venda e locação, valores, comissões, lançamentos financeiros e dados de imóveis,
          incluindo nome do proprietário e fotos.
        </li>
        <li>
          <strong>Registros técnicos</strong>: data, hora e usuário de cada alteração (histórico de auditoria).
        </li>
      </ul>

      <h2>2. Finalidade e base legal</h2>
      <p>
        Os dados são usados exclusivamente para a gestão comercial e financeira da imobiliária: acompanhar leads e atendimentos,
        controlar captações, contratos e comissões e gerar indicadores internos. As bases legais são a execução de contrato e de
        procedimentos preliminares (art. 7º, V), o legítimo interesse da imobiliária na gestão do próprio negócio (art. 7º, IX) e o
        cumprimento de obrigações legais (art. 7º, II).
      </p>

      <h2>3. Login com Google</h2>
      <p>
        O sistema solicita ao Google apenas os escopos básicos <code>openid</code>, <code>email</code> e <code>profile</code>, usados
        somente para identificar o usuário e verificar se o e-mail está autorizado. O ImobiInsight não acessa Gmail, Drive, agenda
        ou qualquer outro dado da conta Google.
      </p>

      <h2>4. Compartilhamento</h2>
      <p>
        Os dados não são vendidos nem compartilhados com terceiros para fins de marketing. Eles são armazenados em provedores de
        infraestrutura contratados pela imobiliária: Google (planilhas e login), Neon (banco de dados, região São Paulo) e
        Cloudflare (hospedagem do sistema).
      </p>

      <h2>5. Acesso e segurança</h2>
      <p>
        Só acessam o sistema pessoas autorizadas pela imobiliária, e cada perfil vê apenas os módulos necessários à sua função. A
        comunicação é criptografada (HTTPS) e as alterações ficam registradas no histórico de auditoria.
      </p>

      <h2>6. Retenção</h2>
      <p>
        Os dados são mantidos enquanto forem necessários à relação comercial e ao cumprimento de obrigações legais. Ao remover um
        registro das planilhas de origem, ele também deixa de existir no sistema na sincronização seguinte.
      </p>

      <h2>7. Direitos do titular</h2>
      <p>
        Você pode pedir confirmação, acesso, correção, anonimização, portabilidade ou exclusão dos seus dados, nos termos do art. 18
        da LGPD, pelo e-mail <a href="mailto:andrewsfranco93@gmail.com">andrewsfranco93@gmail.com</a>.
      </p>
    </>
  );
}
