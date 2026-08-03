/**
 * Estado compartilhado do dashboard.
 *
 * Por que um objeto e nao varias variaveis soltas: em modulos ES, quem importa
 * uma variavel exportada so pode LE-LA — reatribuir de outro arquivo e erro.
 * Como varios modulos precisam escrever nesses valores (a seta de data muda o
 * dia, o modal de perfil mexe nos dados), eles vivem como campos de um objeto:
 * a referencia e sempre a mesma e todos enxergam a alteracao.
 */

import { isoHoje } from "./utilitarios.js";

export const estado = {
  // Refeições e perfil do usuário logado (o que vai pro localStorage).
  // Preenchido em iniciar() (principal.js), depois que a sessão é validada.
  dados: null,

  // Previsão de resultado (prazo até o objetivo), calculada uma vez no boot a
  // partir do perfil da sessão (banco). Ver preverResultado() em calculo.js.
  previsao: null,

  // Dia que o dashboard está exibindo (Resumo do Dia + lista de refeições).
  // Começa em hoje; as setas ‹ › mudam este valor.
  dataSelecionada: isoHoje(),

  // Chave do localStorage: `nutribalance_data_<id>`, isolando as refeições
  // por usuário no mesmo navegador. Definida no boot.
  chaveStorage: null,
};

export const VERSAO_DADOS = 3;
