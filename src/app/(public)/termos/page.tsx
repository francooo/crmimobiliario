import Link from "next/link";

export const metadata = { title: "Termos de Uso" };

export default function TermosPage() {
  return (
    <>
      <h1>Termos de Uso</h1>
      <p className="text-[13px] text-muted-2">Última atualização: 4 de novembro de 2026</p>

      <p>
        O ImobiInsight é um sistema de uso interno da imobiliária, destinado exclusivamente aos seus sócios, colaboradores e
        corretores autorizados.
      </p>

      <h2>1. Acesso</h2>
      <p>
        O acesso é pessoal e intransferível, feito com a conta Google cujo e-mail foi cadastrado pela imobiliária. A imobiliária pode
        liberar, alterar ou revogar acessos a qualquer momento.
      </p>

      <h2>2. Uso permitido</h2>
      <ul>
        <li>Usar as informações apenas para atividades da imobiliária.</li>
        <li>Não copiar, exportar ou divulgar dados de clientes, proprietários ou negócios fora das finalidades da imobiliária.</li>
        <li>Manter a conta Google protegida e avisar a imobiliária em caso de acesso indevido.</li>
      </ul>

      <h2>3. Dados</h2>
      <p>
        As informações exibidas vêm das planilhas mantidas pela imobiliária. A exatidão dos dados depende do preenchimento dessas
        planilhas. O tratamento de dados pessoais segue a <Link href="/privacidade">Política de Privacidade</Link>.
      </p>

      <h2>4. Disponibilidade</h2>
      <p>
        O sistema é oferecido como está, podendo passar por manutenções e atualizações. Os indicadores têm caráter gerencial e não
        substituem a apuração contábil ou fiscal.
      </p>

      <h2>5. Contato</h2>
      <p>
        Dúvidas sobre estes termos: <a href="mailto:andrewsfranco93@gmail.com">andrewsfranco93@gmail.com</a>.
      </p>
    </>
  );
}
