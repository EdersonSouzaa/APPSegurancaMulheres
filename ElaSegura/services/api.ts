/**
 * Adaptador de compatibilidade: mantém a interface `api.get/post/put/delete`
 * que as telas já usam, mas resolve tudo no Firestore em vez de chamar o
 * servidor Express (que deixou de existir na migração para o Firebase).
 *
 * Camada de transição, deliberadamente. Ela existe para que a migração do
 * backend não exigisse reescrever 33 pontos de chamada em 8 telas de uma vez.
 * Cada tela pode ser migrada, no seu tempo, para os módulos tipados:
 *
 *   services/usuario.ts   services/contatos.ts   services/ocorrencias.ts
 *   services/sos.ts       services/alertas.ts    services/auth.ts
 *
 * Quando nenhuma tela importar mais este arquivo, ele pode ser apagado.
 *
 * O parâmetro `token` é ignorado: a autenticação vem de auth.currentUser,
 * gerenciado pelo Firebase Auth. Ele continua na assinatura só para não
 * quebrar as chamadas existentes.
 */
import { obterAlertas } from './alertas';
import {
  listarContatos,
  criarContato,
  atualizarContato,
  excluirContato,
} from './contatos';
import {
  listarOcorrencias,
  listarOcorrenciasProximas,
  criarOcorrencia,
  atualizarOcorrencia,
  excluirOcorrencia,
} from './ocorrencias';
import { acionarSos } from './sos';
import {
  obterPerfil,
  atualizarPerfil,
  atualizarFoto,
  atualizarPreferencias,
  atualizarSenha,
} from './usuario';

type Metodo = 'GET' | 'POST' | 'PUT' | 'DELETE';

/** Separa "/ocorrencias/proximas?lat=1&lng=2" em caminho + query. */
function separar(endpoint: string) {
  const [caminho, queryString = ''] = endpoint.split('?');
  return {
    partes: caminho.split('/').filter(Boolean),
    params: new URLSearchParams(queryString),
  };
}

function naoSuportado(metodo: Metodo, endpoint: string): never {
  throw new Error(`Endpoint não suportado pelo adaptador Firebase: ${metodo} ${endpoint}`);
}

async function despachar(metodo: Metodo, endpoint: string, body?: any): Promise<any> {
  const { partes, params } = separar(endpoint);
  const [recurso, segundo] = partes;

  switch (recurso) {
    case 'alertas':
      if (metodo === 'GET') return obterAlertas();
      return naoSuportado(metodo, endpoint);

    case 'contatos':
      if (metodo === 'GET' && !segundo) return listarContatos();
      if (metodo === 'POST') return criarContato(body?.name, body?.phone, body?.emergencial);
      if (metodo === 'PUT' && segundo) return atualizarContato(segundo, body);
      if (metodo === 'DELETE' && segundo) return excluirContato(segundo);
      return naoSuportado(metodo, endpoint);

    case 'ocorrencias':
      if (metodo === 'GET' && segundo === 'proximas') {
        return listarOcorrenciasProximas(
          Number(params.get('lat')),
          Number(params.get('lng')),
          params.get('radius') ? Number(params.get('radius')) : 1000,
          params.get('filter') ?? undefined
        );
      }
      if (metodo === 'GET' && !segundo) {
        return listarOcorrencias(params.get('filter') ?? undefined);
      }
      if (metodo === 'POST') return criarOcorrencia(body);
      if (metodo === 'PUT' && segundo) return atualizarOcorrencia(segundo, body);
      if (metodo === 'DELETE' && segundo) return excluirOcorrencia(segundo);
      return naoSuportado(metodo, endpoint);

    case 'sos':
      if (metodo === 'POST') return acionarSos(body?.location ?? null);
      return naoSuportado(metodo, endpoint);

    case 'user':
      if (metodo === 'GET' && segundo === 'me') return obterPerfil();
      if (metodo === 'PUT' && segundo === 'profile-picture') {
        return atualizarFoto(body?.profile_picture);
      }
      if (metodo === 'PUT' && segundo === 'update') {
        return atualizarPerfil(body?.name, body?.email);
      }
      if (metodo === 'PUT' && segundo === 'preferences') {
        return atualizarPreferencias(body ?? {});
      }
      if (metodo === 'PUT' && segundo === 'update-password') {
        return atualizarSenha(body?.currentPassword, body?.newPassword);
      }
      return naoSuportado(metodo, endpoint);

    default:
      return naoSuportado(metodo, endpoint);
  }
}

export const api = {
  get: (endpoint: string, _token?: string) => despachar('GET', endpoint),
  post: (endpoint: string, data: any, _token?: string) => despachar('POST', endpoint, data),
  put: (endpoint: string, data: any, _token?: string) => despachar('PUT', endpoint, data),
  delete: (endpoint: string, _token?: string) => despachar('DELETE', endpoint),
};
