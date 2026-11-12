import { PlateProportion } from '../plates/plates';

const YEARS: [string, string, string, string][] = [
  ['MCMXXVI', '1926', 'A bench in Via dei Serragli', 'Ottavio Bellandi, an instrument maker from Figline in the upper Valdarno, opens a workshop in Florence. He makes surveyors’ levels and keeps the clocks of the quarter running.'],
  ['MCMLI', '1951', 'The first wristwatch', 'A hand-wound watch of thirty-five millimetres, made for the engineers rebuilding the bridges of the Arno. The order book calls it simply l’orologio.'],
  ['MCMLXVI', '1966', 'The water', 'On the fourth of November the Arno enters the workshop to a height of two metres. The tools are lost. The drawing notebooks, kept on the highest shelf, are not. The house has called them il Codice ever since.'],
  ['MCMLXXIV', '1974', 'Tirreno', 'A diver drawn for the pilots of the port of Livorno, tested in the roads off the Meloria light. Eight hundred are made.'],
  ['MCMLXXXIII', '1983', 'The quiet years', 'Quartz arrives and the benches fall silent. For thirty-six years Valdarno repairs what other houses made, and keeps its notebooks dry.'],
  ['MMXIX', '2019', 'The benches again', 'Livia Bellandi, an engineer and the founder’s great-granddaughter, reopens production with four watchmakers and a shelf of drawings.'],
  ['MMXXVI', '2026', 'Codice 39', 'A hundred years after the first bench: the first calibre drawn entirely in the house, and the watch on this page.'],
];

export default function Storia() {
  return (
    <section className="section storia" id="storia" aria-labelledby="storia-h">
      <div className="storia-plate" aria-hidden="true">
        <PlateProportion />
      </div>
      <div className="wrap storia-grid">
        <header className="storia-head">
          <p className="kicker" data-reveal>
            <span className="numeral">V</span>
            <span className="label">Storia</span>
          </p>
          <h2 className="display" id="storia-h" data-reveal style={{ ['--i' as string]: 1 }}>
            A hundred years, <em>one address.</em>
          </h2>
          <p className="lede" data-reveal style={{ ['--i' as string]: 2 }}>
            The house is named for the valley the founder walked out of. It has moved once, by eleven metres, after the flood.
          </p>
          <p className="hand storia-note" data-reveal style={{ ['--i' as string]: 3 }}>
            <span className="mirror">tutto comincia da un disegno</span>
          </p>
        </header>
        <ol className="timeline">
          {YEARS.map(([roman, year, title, text]) => (
            <li key={year} data-reveal>
              <p className="timeline-year">
                <span className="sc">{roman}</span>
                <span className="label">{year}</span>
              </p>
              <div>
                <h3 className="timeline-title">{title}</h3>
                <p className="body">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
