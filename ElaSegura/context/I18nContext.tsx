import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LOCALE_DE, traduzir, traduzirPlural } from '../i18n';
import type { ChaveTraducao, Idioma, Interpolacao } from '../i18n';

const CHAVE_IDIOMA = '@elasegura/idioma';

type I18nContextType = {
  idioma: Idioma;
  locale: string;
  definirIdioma: (idioma: Idioma) => void;
  t: (chave: ChaveTraducao, valores?: Interpolacao) => string;
  tp: (
    singular: ChaveTraducao,
    plural: ChaveTraducao,
    quantidade: number,
    valores?: Interpolacao
  ) => string;
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

/**
 * Idioma do aparelho, quando dá para descobrir sem dependência nativa.
 *
 * Intl existe no Hermes com a build padrão do Expo; se não existir, o catch
 * devolve português, que é o público-alvo do app.
 */
function idiomaDoAparelho(): Idioma {
  try {
    const tag = Intl.DateTimeFormat().resolvedOptions().locale ?? '';
    return tag.toLowerCase().startsWith('pt') ? 'pt' : 'en';
  } catch {
    return 'pt';
  }
}

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [idioma, setIdioma] = useState<Idioma>('pt');

  useEffect(() => {
    AsyncStorage.getItem(CHAVE_IDIOMA)
      .then((salvo) => {
        if (salvo === 'pt' || salvo === 'en') setIdioma(salvo);
        else setIdioma(idiomaDoAparelho());
      })
      .catch(() => setIdioma(idiomaDoAparelho()));
  }, []);

  const definirIdioma = useCallback((novo: Idioma) => {
    setIdioma(novo);
    AsyncStorage.setItem(CHAVE_IDIOMA, novo).catch(() => {});
  }, []);

  const valor = useMemo<I18nContextType>(
    () => ({
      idioma,
      locale: LOCALE_DE[idioma],
      definirIdioma,
      t: (chave, valores) => traduzir(idioma, chave, valores),
      tp: (singular, plural, quantidade, valores) =>
        traduzirPlural(idioma, singular, plural, quantidade, valores),
    }),
    [idioma, definirIdioma]
  );

  return <I18nContext.Provider value={valor}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const contexto = useContext(I18nContext);
  if (contexto === undefined) {
    throw new Error('useI18n precisa estar dentro de um I18nProvider');
  }
  return contexto;
};
