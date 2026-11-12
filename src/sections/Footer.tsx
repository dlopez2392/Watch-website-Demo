import { scrollToId } from '../lib/motion';

const LINKS: [string, string][] = [
  ['movimento', 'Il Movimento'],
  ['collezione', 'La Collezione'],
  ['bottega', 'La Bottega'],
  ['storia', 'Storia'],
  ['riserva', 'Riserva'],
];

export default function Footer() {
  return (
    <footer className="footer" data-tone="dark">
      <div className="wrap">
        <p className="footer-mark" aria-hidden="true">
          Valdarno
        </p>
        <div className="footer-grid">
          <div>
            <p className="label">Manifattura Orologiera</p>
            <p className="footer-text">
              Via dei Serragli 39r
              <br />
              50124 Firenze, Italia
            </p>
          </div>
          <nav aria-label="Footer">
            <p className="label">Il sito</p>
            <ul>
              {LINKS.map(([id, label]) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToId(id);
                    }}
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="footer-note">
            <p className="label">A note on what this is</p>
            <p className="footer-text">
              Valdarno is a fictional concept brand. The house, its people, its history, its prices and its watches were invented for this design study, and any resemblance to a real watchmaker is unintended. Nothing here is for sale.
            </p>
            <p className="footer-text">
              The watches and plates are drawn in code from one parametric model. The photography and film are generated imagery: the watch photographs are made from renders of that model, and nothing here shows a real workshop, a real watch or real people.
            </p>
          </div>
        </div>
        <div className="footer-base">
          <p className="sc">mcmxxvi – mmxxvi</p>
          <p className="hand">fatto a mano, a Firenze</p>
          <a
            className="label"
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              scrollToId('top');
            }}
          >
            Back to the top
          </a>
        </div>
      </div>
    </footer>
  );
}
