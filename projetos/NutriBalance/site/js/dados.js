/**
 * Persistencia do dashboard no localStorage + migracao entre versoes do formato.
 *
 * As refeicoes ficam no navegador (uma chave por usuario); o perfil e as metas
 * vem do banco pela sessao e sao mantidos em sincronia por sincronizarComSessao().
 */

import { estado, VERSAO_DADOS } from "./estado.js";
import { isoHoje, uid } from "./utilitarios.js";
import { derivarMetasMacro } from "./calculo.js";

// Estado inicial de um usuário sem dados salvos: perfil vindo da sessão (banco)
// e nenhuma refeição ainda.
function dadosVazios(perfil) {
  return { versao: VERSAO_DADOS, perfil: { ...perfil }, refeicoes: [] };
}

/**
 * Traz os dados salvos para a versão atual do formato.
 *  - v1: refeição plana com macros no próprio objeto.
 *  - v2: refeição com itens, mas com as chaves em inglês (profile/meals/items).
 *  - v3: mesmas informações com as chaves em português (perfil/refeicoes/itens).
 */
function migrar(dados, perfilDaSessao) {
  if (dados && dados.versao === VERSAO_DADOS) return dados;
  try {
    // --- v1 -> v2: cada refeição plana vira uma refeição com um item ---
    let v2 = dados;
    if (!dados || dados.version !== 2) {
      v2 = {
        version: 2,
        profile: {
          name: dados?.profile?.name ?? "Meu Perfil",
          goalKcal: dados?.profile?.goalKcal ?? 2000,
        },
        meals: (dados?.meals ?? []).map((m) => ({
          id: m.id ?? uid(),
          tipo: m.tipo ?? "Refeição",
          data: m.data ?? isoHoje(),
          items: [
            {
              id: uid(),
              nome: m.descricao || m.tipo || "Alimento",
              marca: "",
              gramas: 100,
              kcal100: Number(m.kcal) || 0,
              p100: Number(m.proteina) || 0,
              c100: Number(m.carbo) || 0,
              g100: Number(m.gordura) || 0,
            },
          ],
        })),
      };
    }

    // --- v2 -> v3: traduz as chaves para português ---
    const perfilV2 = v2?.profile ?? {};
    const metaKcal = Number(perfilV2.goalKcal) || 2000;
    // Só reaproveita os macros salvos se os três existirem; senão redistribui
    // a partir das kcal (evita um perfil meio preenchido zerar uma barra).
    const salvos = {
      metaCarbo: Number(perfilV2.goalCarbo) || 0,
      metaProteina: Number(perfilV2.goalProteina) || 0,
      metaGordura: Number(perfilV2.goalGordura) || 0,
    };
    const macros =
      salvos.metaCarbo > 0 && salvos.metaProteina > 0 && salvos.metaGordura > 0
        ? salvos
        : derivarMetasMacro(metaKcal);

    // Preserva o último snapshot sincronizado com o banco — sem ele, um ajuste
    // manual de metas seria sobrescrito pela sessão no próximo carregamento.
    const ultimas = v2?.lastSessionGoals;

    return {
      versao: VERSAO_DADOS,
      perfil: {
        nome: perfilV2.name ?? "Meu Perfil",
        foto: perfilV2.foto ?? null,
        metaKcal,
        ...macros,
      },
      ultimasMetasSessao: ultimas
        ? {
            metaKcal: ultimas.goalKcal,
            metaCarbo: ultimas.goalCarbo,
            metaProteina: ultimas.goalProteina,
            metaGordura: ultimas.goalGordura,
          }
        : null,
      refeicoes: (v2?.meals ?? []).map((m) => ({
        id: m.id ?? uid(),
        tipo: m.tipo ?? "Refeição",
        data: m.data ?? isoHoje(),
        itens: (m.items ?? []).map((it) => ({
          id: it.id ?? uid(),
          nome: it.nome ?? "Alimento",
          marca: it.marca ?? "",
          gramas: Number(it.gramas) || 0,
          kcal100: Number(it.kcal100) || 0,
          proteina100: Number(it.p100) || 0,
          carbo100: Number(it.c100) || 0,
          gordura100: Number(it.g100) || 0,
        })),
      })),
    };
  } catch {
    return dadosVazios(perfilDaSessao);
  }
}

function metasDe(p) {
  return {
    metaKcal: p.metaKcal,
    metaCarbo: p.metaCarbo,
    metaProteina: p.metaProteina,
    metaGordura: p.metaGordura,
  };
}

function metasIguais(a, b) {
  return (
    !!a &&
    !!b &&
    a.metaKcal === b.metaKcal &&
    a.metaCarbo === b.metaCarbo &&
    a.metaProteina === b.metaProteina &&
    a.metaGordura === b.metaGordura
  );
}

// Mantém o dashboard em sincronia com a conta (banco). O nome sempre reflete a
// conta logada. Para as metas, o banco é a autoridade quando ELAS MUDAM (via
// personalização): se as metas da sessão diferem do último snapshot
// sincronizado, adota as novas; caso contrário preserva o que está no
// localStorage — que pode conter o ajuste fino manual do modal de perfil.
function sincronizarComSessao(dados, perfilDaSessao) {
  dados.perfil.nome = perfilDaSessao.nome;
  // Foto é da conta (banco), não do localStorage — sempre reflete a sessão.
  dados.perfil.foto = perfilDaSessao.foto ?? null;
  const metasDaSessao = metasDe(perfilDaSessao);
  if (!metasIguais(dados.ultimasMetasSessao, metasDaSessao)) {
    Object.assign(dados.perfil, metasDaSessao);
    dados.ultimasMetasSessao = metasDaSessao;
  }
  return dados;
}

// Carrega as refeições salvas deste usuário; o perfil (nome + metas) é semeado
// da sessão (banco) na primeira vez e mantido em sincronia depois via
// sincronizarComSessao(). Exige estado.chaveStorage já definida.
export function carregarDados(perfilDaSessao) {
  const bruto = localStorage.getItem(estado.chaveStorage);
  let dados;
  if (!bruto) {
    dados = dadosVazios(perfilDaSessao);
  } else {
    let lido = null;
    try {
      lido = JSON.parse(bruto);
    } catch {
      /* localStorage corrompido — recomeça do perfil da sessão */
    }
    dados = lido ? migrar(lido, perfilDaSessao) : dadosVazios(perfilDaSessao);
  }
  sincronizarComSessao(dados, perfilDaSessao);
  salvarDados(dados);
  return dados;
}

// Sem argumento, salva o estado atual — que é o caso de quase todas as chamadas.
// O parâmetro existe para carregarDados(), que persiste a migração ANTES de o
// objeto virar estado.dados.
export function salvarDados(dados = estado.dados) {
  localStorage.setItem(estado.chaveStorage, JSON.stringify(dados));
}
