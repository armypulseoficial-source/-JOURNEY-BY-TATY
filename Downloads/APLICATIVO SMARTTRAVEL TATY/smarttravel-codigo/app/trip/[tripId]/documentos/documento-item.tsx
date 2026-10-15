'use client';

import { useEffect, useState } from 'react';
import { getOfflineDocument, saveDocumentOffline } from '@/lib/offline/store';

type Props = {
  id: string;
  title: string;
  documentType: string;
  offlineAvailable: boolean;
  // URL assinada de 60 minutos, gerada no servidor. Pode já ter expirado.
  url: string;
};

type Estado = 'parado' | 'salvando' | 'sem_espaco' | 'sem_rede' | 'erro';

const MENSAGEM: Record<Exclude<Estado, 'parado' | 'salvando'>, string> = {
  sem_espaco:
    'Sem espaço neste aparelho para guardar este documento. Libere espaço (fotos, apps) e toque em Salvar offline de novo. Online, o documento continua disponível.',
  sem_rede: 'Não foi possível baixar agora. Confira a conexão e tente de novo.',
  erro: 'Algo deu errado ao salvar. Tente de novo.',
};

export function DocumentoItem({ id, title, documentType, offlineAvailable, url }: Props) {
  // Object URL da cópia local. Quando existe, a tela usa ela e não a URL assinada.
  const [copiaLocal, setCopiaLocal] = useState<string | null>(null);
  const [estado, setEstado] = useState<Estado>('parado');

  useEffect(() => {
    let cancelado = false;
    getOfflineDocument(id).then((blob) => {
      if (blob && !cancelado) setCopiaLocal(URL.createObjectURL(blob));
    });
    return () => {
      cancelado = true;
    };
  }, [id]);

  // Libera a memória da cópia atual quando ela é trocada ou a tela sai.
  useEffect(() => {
    if (!copiaLocal) return;
    return () => URL.revokeObjectURL(copiaLocal);
  }, [copiaLocal]);

  async function salvar() {
    setEstado('salvando');
    try {
      const resultado = await saveDocumentOffline(id, url);
      if (!resultado.ok) {
        setEstado(resultado.reason === 'quota' ? 'sem_espaco' : 'sem_rede');
        return;
      }
      // Sucesso: a cópia aparece na própria linha (link e "salvo neste aparelho").
      const blob = await getOfflineDocument(id);
      if (blob) setCopiaLocal(URL.createObjectURL(blob));
    } catch {
      setEstado('erro');
    }
  }

  const linkAbrir = copiaLocal ?? url;

  return (
    <li>
      <a href={linkAbrir} target="_blank" rel="noopener noreferrer">
        {copiaLocal ? `${title} (cópia no aparelho)` : title}
      </a>
      <small>
        {' '}· {documentType}
        {offlineAvailable && !copiaLocal ? ' · disponível offline' : ''}
        {copiaLocal ? ' · salvo neste aparelho' : ''}
      </small>

      {offlineAvailable && !copiaLocal && (
        <div>
          <button type="button" onClick={salvar} disabled={estado === 'salvando'}>
            {estado === 'salvando' ? 'Salvando…' : 'Salvar offline'}
          </button>
          {estado !== 'parado' && estado !== 'salvando' && <p role="alert">{MENSAGEM[estado]}</p>}
        </div>
      )}
    </li>
  );
}
