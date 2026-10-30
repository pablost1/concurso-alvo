type Props = { enunciado: string; textoApoio?: string; imagens?: string[] };

/** Texto de apoio, figuras e enunciado de uma questão (as alternativas ficam a cargo de cada tela). */
export function CorpoQuestao({ enunciado, textoApoio, imagens = [] }: Props) {
  return (
    <>
      {textoApoio && (
        <details className="apoio" open>
          <summary>Texto de apoio</summary>
          <p>{textoApoio}</p>
        </details>
      )}
      {imagens.length > 0 && (
        <div className="figs">
          {/* eslint-disable-next-line @next/next/no-img-element -- figuras de provas, servidas por rota autenticada */}
          {imagens.map((src) => <img key={src} src={src} alt="Figura da questão" loading="lazy" />)}
        </div>
      )}
      <p style={{ whiteSpace: "pre-wrap" }}>{enunciado}</p>
    </>
  );
}
