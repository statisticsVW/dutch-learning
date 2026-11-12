/** A source the app's words come from, credited as its licence asks. */
type Credit = { name: string; url: string; by: string; usedFor: string; licence: string; licenceUrl: string };

const CREDITS: Credit[] = [
  {
    name: 'NT2Lex',
    url: 'https://cental.uclouvain.be/cefrlex/nt2lex/',
    by: 'Anaïs Tack, Thomas François, Piet Desmet and Cédrick Fairon (CENTAL, UCLouvain and ITEC, KU Leuven), 2018',
    usedFor: 'Which words are in the Dictionary: words that Dutch learners meet at the start (levels A1 and A2).',
    licence: 'CC BY-NC-SA 4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
  },
  {
    name: 'Wiktionary',
    url: 'https://en.wiktionary.org',
    by: 'English Wiktionary contributors',
    usedFor: 'English meanings in the Dictionary, and whether each noun takes de or het.',
    licence: 'CC BY-SA 4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
  {
    name: 'Tatoeba',
    url: 'https://tatoeba.org',
    by: 'Tatoeba contributors',
    usedFor: 'Example sentences (none are in the app yet).',
    licence: 'CC BY 2.0 FR',
    licenceUrl: 'https://creativecommons.org/licenses/by/2.0/fr/',
  },
];

/** Credits the sources of the app's words and their licences. Reached from Settings. */
export function About({ onBack }: { onBack: () => void }) {
  return (
    <main class="about">
      <h2>About</h2>
      <p>The words, meanings and articles in this app were put together with help from free sources. Thank you to everyone who made them!</p>
      <ul class="credits">
        {CREDITS.map((credit) => (
          <li key={credit.name} aria-labelledby={`credit-${credit.name}`}>
            <h3 id={`credit-${credit.name}`}>
              <a href={credit.url} target="_blank" rel="noopener noreferrer">
                {credit.name}
              </a>
            </h3>
            <p>{credit.usedFor}</p>
            <p class="credit-small">
              By {credit.by}. Licence:{' '}
              <a href={credit.licenceUrl} target="_blank" rel="noopener noreferrer">
                {credit.licence}
              </a>
            </p>
          </li>
        ))}
      </ul>
      <p class="credit-small">
        The Dictionary built from NT2Lex and Wiktionary is shared under CC BY-SA 4.0, for non-commercial use only. The Packs were written for this app, with every de/het checked against Wiktionary. Pronunciation uses your device’s own Dutch voice.
      </p>
      <button type="button" onClick={onBack}>
        Back
      </button>
    </main>
  );
}
