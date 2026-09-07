import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { observarAuth } from '../services/auth';

type ConexaoContextType = {
  online: boolean;
  /** Marca offline manualmente quando uma chamada falha por rede. */
  reportarFalhaDeRede: () => void;
  /** Marca online de novo quando qualquer chamada volta a funcionar. */
  reportarSucesso: () => void;
};

const ConexaoContext = createContext<ConexaoContextType | undefined>(undefined);

/**
 * Detecta conexão sem dependência nativa nova.
 *
 * A ideia é usar um sinal que o próprio Firestore já dá: um onSnapshot com
 * `includeMetadataChanges` avisa, em `snapshot.metadata.fromCache`, quando a
 * resposta veio do cache porque o SDK não conseguiu falar com o servidor.
 * Observamos o documento de perfil da usuária, que é pequeno e que ela já tem
 * permissão de ler, então o custo é praticamente zero.
 *
 * Duas fontes complementam esse sinal:
 *
 * - Na web, os eventos online/offline do navegador, que são imediatos.
 * - Em qualquer plataforma, os serviços podem chamar reportarFalhaDeRede()
 *   quando uma consulta estoura com erro de rede — útil antes de o listener
 *   perceber, e para quando não há usuária logada (nada a observar).
 *
 * `fromCache` também fica true por um instante logo após uma escrita local,
 * por causa da compensação de latência. Por isso a virada para offline espera
 * um intervalo curto: um piscada de cache não deve mostrar a faixa de "sem
 * conexão" para quem está online.
 */
const ATRASO_PARA_OFFLINE = 2500;

export const ConexaoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [online, setOnline] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelarTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const marcarOnline = useCallback(() => {
    cancelarTimer();
    setOnline(true);
  }, []);

  const marcarOffline = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setOnline(false);
    }, ATRASO_PARA_OFFLINE);
  }, []);

  // Sinal do navegador (web).
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    setOnline(window.navigator?.onLine ?? true);
    const aoVoltar = () => marcarOnline();
    const aoCair = () => {
      cancelarTimer();
      setOnline(false);
    };

    window.addEventListener('online', aoVoltar);
    window.addEventListener('offline', aoCair);
    return () => {
      window.removeEventListener('online', aoVoltar);
      window.removeEventListener('offline', aoCair);
    };
  }, [marcarOnline]);

  // Sinal do Firestore, reassinado a cada troca de usuária.
  useEffect(() => {
    let cancelarSnapshot: (() => void) | null = null;

    const cancelarAuth = observarAuth((user) => {
      cancelarSnapshot?.();
      cancelarSnapshot = null;

      if (!user) return;

      cancelarSnapshot = onSnapshot(
        doc(db, 'usuarios', user.uid),
        { includeMetadataChanges: true },
        (snap) => {
          if (snap.metadata.fromCache) marcarOffline();
          else marcarOnline();
        },
        () => marcarOffline()
      );
    });

    return () => {
      cancelarAuth();
      cancelarSnapshot?.();
      cancelarTimer();
    };
  }, [marcarOnline, marcarOffline]);

  const valor = useMemo<ConexaoContextType>(
    () => ({
      online,
      reportarFalhaDeRede: marcarOffline,
      reportarSucesso: marcarOnline,
    }),
    [online, marcarOffline, marcarOnline]
  );

  return <ConexaoContext.Provider value={valor}>{children}</ConexaoContext.Provider>;
};

export const useConexao = () => {
  const contexto = useContext(ConexaoContext);
  if (contexto === undefined) {
    throw new Error('useConexao precisa estar dentro de um ConexaoProvider');
  }
  return contexto;
};

/** uid atual sem passar por hook — usado pelas chaves do cache offline. */
export const uidAtual = () => auth.currentUser?.uid ?? null;
