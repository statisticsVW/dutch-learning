# How a 13-year-old English speaker can learn beginner Dutch with a web app: research notes

*Compiled 2026-11-11. Each claim links to the source it comes from. Sources marked **[secondary]** are not the primary owner of the claim. Sources marked **[not fetched]** were cited from bibliographic records or search abstracts, and their full text was not read. Check those before relying on fine detail.*

---

## TL;DR: what this means for the app

1. **Make retrieval the core loop, and space it out.** Ask the learner to recall a word or sentence first, then show the answer. Reviews should come back on an expanding schedule. Use an existing FSRS library rather than hand-rolling SM-2. Keep target retention around 90%, because pushing it higher makes the workload climb steeply.
2. **Short daily sessions beat cramming.** Learners *feel* that cramming works better even when it doesn't. The app should do the scheduling so the learner doesn't have to judge it.
3. **Pair the flashcards with lots of easy, understandable input.** Show short sentences and mini-stories in which almost every word is already known, with audio. Also add a little explicit "notice this" teaching for the things English speakers reliably get wrong: de/het, verb-second word order, verb-final subordinate clauses, and g/ui/ij/eu/uu.
4. **Design for autonomy, competence and relatedness, not just points.** Let the learner choose topics and pace, give visible proof of progress (e.g. "you can now read this"), and include something social such as a shareable deck or a friend or family "challenge". Treat points, badges and streaks as optional, light and informational. Never make them controlling. Broken-streak messages that shame the learner backfire. Offer streak repair or freezes.
5. **Use Dutch's closeness to English.** FSI puts Dutch in its easiest category. Lean on cognates early for quick wins, and flag false friends explicitly.
6. **Content licences:** Tatoeba sentences (CC BY 2.0 FR), Wiktionary (CC BY-SA 4.0), Common Voice and Lingua Libre audio, and OpenSubtitles-derived frequency lists (CC BY-SA 4.0) are usable in a free, shareable app with attribution and share-alike. Forvo and NT2Lex are **non-commercial** only. SUBTLEX-NL is offered for research. Browser TTS (`speechSynthesis`) is widely supported, but whether an nl-NL voice exists depends on the device. Speech *recognition* is not Baseline, and in Chrome it sends audio to a server, which matters for a child user.

---

## 1. Spaced repetition and retrieval practice

**The evidence**

- **Spacing works, and the best gap grows with how long you need to remember.** A meta-analysis covered 839 assessments of distributed practice across 317 experiments. It found that the inter-study interval giving maximal retention *increased as the retention interval increased* ([Cepeda et al., 2006, *Psychological Bulletin* 132(3)](https://www.evullab.org/pdf/CepedaPashlerVulWixtedRohrer-PB-2006.pdf)).
- A follow-up with more than 1,350 participants measured retention after up to a year. Increasing the study gap first improved and then slowly reduced final performance. The optimal gap grew with the test delay, but shrank as a *proportion* of it, from roughly 20–40% of a 1-week delay to a much smaller fraction of a 1-year delay ([Cepeda, Vul, Rohrer, Wixted & Pashler, 2008, *Psychological Science* 19(11)](https://www.evullab.org/pdf/CepedaVulRohrerWixtedPashler-PS-2008.pdf)). For the app, this means reviews should be close together at first and then spread out, which is exactly what SRS schedulers do.
- **Testing is itself a learning event (the testing effect).** Students who took practice tests retained more at 2-day and 1-week delays than students who restudied, even though restudying looked better at 5 minutes ([Roediger & Karpicke, 2006, *Psychological Science* 17(3)](https://psychology.ecu.edu/wp-content/pv-uploads/sites/216/2019/03/Roediger-Karpicke-2006.pdf)). Continuing to *retrieve* items after they were first recalled was what drove long-term retention. Dropping recalled items from testing hurt ([Karpicke & Roediger, 2008, *Science* 319](https://doi.org/10.1126/science.1152408)) **[not fetched]**.
- **Flashcards specifically:** in a web-based flashcard study of vocabulary pairs, one big spaced stack beat several small massed stacks, and spacing beat cramming even the day before a test. Spacing was better for **90%** of participants, yet **72%** believed massing had worked better after the first session ([Kornell, 2009, *Applied Cognitive Psychology* 23(9), doi:10.1002/acp.1537](https://doi.org/10.1002/acp.1537)) **[not fetched; abstract via search]**. Learners misjudge what works, so the app should schedule reviews itself and not leave that judgement to the learner.

**Scheduling algorithms**

- **SM-2 (SuperMemo, 1987)** is the classic, simple algorithm ([primary description, super-memo.com](https://super-memo.com/english/ol/sm2.htm)):
  - It uses intervals of I(1)=1 day, I(2)=6 days, and then I(n)=I(n−1)×EF.
  - The ease factor EF starts at 2.5, is updated after each review by `EF' = EF + (0.1 − (5−q)(0.08 + (5−q)·0.02))`, and has a floor of 1.3.
  - Grades run from 0 to 5. A grade below 3 restarts the item's intervals.
  - It is easy to implement but has known weaknesses. For example, a run of hard grades can leave an item stuck at a low ease ("ease hell").
- **FSRS (Free Spaced Repetition Scheduler)** models each card's **Difficulty, Stability and Retrievability (DSR)**. Stability is the interval at which recall probability is 90%. FSRS-6 uses 21 trainable parameters and the power forgetting curve `R(t,S) = (1 + factor·t/S)^(−w20)` ([FSRS algorithm wiki, open-spaced-repetition](https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm)). The next interval is chosen so that predicted recall falls to a **desired retention** target.
- Anki's manual calls desired retention "the most important setting in FSRS" and gives a default of **90%**. Above 90%, the workload rises quickly, and above 97% it "can become overwhelming" ([Anki manual, deck options](https://docs.ankiweb.net/deck-options.html)).
- **Implementation:** [`ts-fsrs`](https://github.com/open-spaced-repetition/ts-fsrs) is an MIT-licensed TypeScript implementation that ships ESM/CJS/UMD builds. Its current major version defaults to FSRS-7 and supports earlier versions.

**What this means for design:**

- Use ts-fsrs with retention at about 0.9.
- Use a 4-button grade (Again/Hard/Good/Easy) or a simplified 2-button grade.
- Cap new cards per day, for example at 5–10, so the review backlog never feels punishing.
- Prefer *production* prompts (English → Dutch, audio → meaning) once a word has been recognised a few times.

## 2. Comprehensible input, and its critiques

- **Krashen's Input Hypothesis:** people acquire language by understanding messages that are slightly beyond their current level ("i+1"). A raised "affective filter" (anxiety, low motivation) blocks intake ([Krashen, 1982, *Principles and Practice in Second Language Acquisition*, author-hosted PDF](https://www.sdkrashen.com/content/books/principles_and_practice.pdf)) **[PDF fetched but text not extractable; claims per the well-known book contents]**.
- **The main critiques:**
  - McLaughlin (1987) argued that Krashen never defined key constructs such as "acquisition", "learning" and "comprehensible input" independently, which makes the hypotheses hard to test ([McLaughlin, *Theories of Second-Language Learning*, 1987]; summarised in [Liu, *J. Education & Human Development*](https://www.slideshare.net/slideshow/a-critical-review-of-krashen-s-input-hypothesis-three-major-argumentspdf/259705909)) **[secondary]**.
  - Swain's **Output Hypothesis** (1985) argues that producing language pushes learners to notice gaps. Schmidt's **Noticing Hypothesis** argues that input must be consciously noticed before it becomes intake ([Schmidt, 1990, *Applied Linguistics* 11(2), doi:10.1093/applin/11.2.129](https://doi.org/10.1093/applin/11.2.129)) **[not fetched]**.
  - The practical consensus is that input is necessary but not sufficient. Add some noticing (brief, explicit attention to form) and some output.
- **How easy should beginner texts be?** Hu & Nation (2000) proposed that about **98%** of the running words must be known for adequate unassisted reading comprehension, and 95% for minimal comprehension. A 2023 replication could not fully reproduce the original result, but 98% remains the standard benchmark ([Lancaster University replication record, Kremmel et al. 2023](https://eprints.lancs.ac.uk/id/eprint/210922)).
- **What this means for design:**
  - Build graded mini-texts (5–8 sentences) that use almost only words already introduced in the SRS deck, plus one or two new words with a tap-to-gloss option.
  - Pair every text with audio, using TTS or a recorded clip, so that listening input grows alongside reading.
  - Keep the experience low-anxiety. No timers on input activities.

## 3. Motivation and engagement for 12–14-year-olds

- **Self-Determination Theory (SDT):** three innate psychological needs, **competence, autonomy and relatedness**, lead to better self-motivation and well-being when they are met, and worse when they are thwarted ([Ryan & Deci, 2000, *American Psychologist* 55(1), 68–78](https://selfdeterminationtheory.org/SDT/documents/2000_RyanDeci_SDT.pdf)).
- **Rewards can undermine intrinsic motivation (overjustification).** A meta-analysis of 128 experiments found that *tangible* expected rewards significantly undermine intrinsic motivation for interesting tasks. Positive verbal feedback tended to increase it ([Deci, Koestner & Ryan, 1999, *Psychological Bulletin* 125(6), 627–668](https://depts.washington.edu/techdocs/papers/deciExtrinsicRewardsAndIntrinsicMotivation99.pdf)). Note that this was contested at the time: Cameron and colleagues reached more benign conclusions, and Psych. Bull. 1999 125(6) published the exchange.
- **Gamification works a bit, with caveats.** A meta-analysis found small positive effects on **cognitive** (g = .49), **motivational** (g = .36) and **behavioural** (g = .25) learning outcomes. Only the cognitive effect held up in the more rigorous studies. Game fiction and social interaction were significant moderators for behavioural outcomes ([Sailer & Homner, 2020, *Educational Psychology Review* 32, 77–112](https://link.springer.com/article/10.1007/s10648-019-09498-w)).
- **Badges and leaderboards can backfire.** In a semester-long classroom study, students in the gamified section (leaderboard plus badges) showed *declining* intrinsic motivation, satisfaction and empowerment compared with the control group. The drop in intrinsic motivation mediated lower final exam scores ([Hanus & Fox, 2015, *Computers & Education* 80, 152–161](https://doi.org/10.1016/j.compedu.2014.08.019)) **[not fetched; abstract via search]**.
- **Streaks:** across seven studies, highlighting an *intact* streak increased future engagement compared with highlighting a *broken* one. People treat keeping a logged streak as a goal in its own right, and once it breaks they often disengage. The effect was weaker when the streak could be repaired ([Silverman & Barasch, 2023, *Journal of Consumer Research* 49(6), 1095–1117, doi:10.1093/jcr/ucac029](https://doi.org/10.1093/jcr/ucac029)) **[not fetched; abstract via search]**. University coverage quotes the authors advising apps to avoid "you broke your streak" messaging ([CU Boulder news](https://www.colorado.edu/business/news/2023/04/20/research-streaks-marketing-tech-barasch)) **[secondary]**.
- **What this means for design for a 13-year-old:**
  - **Autonomy:** let the learner choose themes (gaming, football, food, travel to Amsterdam), daily goal size and avatar or theme. Explain *why* a review is due.
  - **Competence:** show progress in real terms ("you know 212 words, enough for ~X% of everyday speech", "you can now read story 4"). Give immediate, informative feedback. Do not penalise mistakes.
  - **Relatedness:** add shareable decks or progress cards, a "challenge a friend/parent" quiz, and optionally a Dutch-speaking friend or pen-pal mode.
  - **Points, badges and streaks:** keep them informational, as a record of what was done, and not contingent rewards for every action. Include streak freezes or repair. Avoid public leaderboards by default. Never use loss-framed guilt notifications.

## 4. What makes Dutch easy and hard for English speakers

**Overall difficulty.** The US Foreign Service Institute places Dutch in **Category I** ("languages more similar to English"), with an estimated **24 weeks / ~600 class hours** to professional working proficiency for adult native English speakers in intensive training ([State Dept. FSI page, archived Jan 2021](https://webarchive.library.unt.edu/web/20210105072258/https://www.state.gov/foreign-language-training)). The live page returned HTTP 403 to automated fetch, so these figures come from the archived copy plus search snippets. They describe intensive adult classes and are only a relative indicator for a teen learner.

**Pronunciation.** The authoritative phonetic reference is [Gussenhoven, 1992, "Dutch", *JIPA* 22(1–2), 45–47, doi:10.1017/S002510030000459X](https://doi.org/10.1017/S002510030000459X) **[not fetched; IPA values below are the standard ones, verify against the paper]**. The main trouble spots are:

| Spelling | Typical sound (NL) | Why it's hard for English speakers |
|---|---|---|
| **g / ch** | velar or uvular fricative [x]/[ɣ] (often voiceless [χ] in the north; softer in the south and Flanders) | No English equivalent. Learners substitute [g] or [k] |
| **ui** | [œy] | Absent from English. Often mis-said as "ow" or "oy" |
| **ij / ei** | [ɛi] (same sound, two spellings) | Spelling trap. Sounds close to English "ay", not "eye" |
| **eu** | [øː] | Rounded front vowel that English lacks |
| **oe** | [u] | Spelling trap: like English "oo", *not* "oh" |
| **uu / u (open syllable)** | [y] | Rounded front vowel that English lacks |

**Grammar.**

- **de / het (grammatical gender):** the definite article is *het* for singular neuter nouns and *de* for singular common (masculine/feminine) nouns. **All plurals take *de*** ([Taaladvies, Flemish government](https://www.vlaanderen.be/taaladvies/taaladviezen/lidwoord-taalkundige-term)). Most nouns' gender has to be memorised. **Diminutives in -je are het-words** (*de kat → het katje*), and diminutives are very frequent in everyday Dutch ([inburgering.org](https://inburgering.org/nl/grammar/diminutive-basics)) **[secondary; widely taught rule]**. In the app, *always store and show the article with the noun* ("de tafel", "het huis"), and colour-code de/het.
- **Verb-second (V2) and verb-final subordinate clauses:** the Algemene Nederlandse Spraakkunst describes Dutch word order with two "poles":
  - In main clauses the finite verb sits in the first pole, i.e. in first or second position.
  - In subordinate clauses a conjunction, question word or relative pronoun fills the first pole, and the finite verb moves to the end, joining the verbal cluster ([e-ANS §21.1.1.1, Instituut voor de Nederlandse Taal](https://e-ans.ivdnt.org/topics/pid/ans21010101lingtopic); clause types in [§21.2](https://e-ans.ivdnt.org/topics/pid/ans2102lingtopic)).
  - Examples include *Morgen **ga** ik naar school* (inversion after a fronted adverb) and *…omdat ik morgen naar school **ga***.
  - English speakers reliably say *\*Morgen ik ga*. This is a perfect candidate for explicit "noticing" drills, such as sentence-builder tiles.
- **Cognates help, and false friends hurt.** Dutch–English cognates (*lamp–lamp*, *flood–vloed*) are recognised faster by bilinguals, and recognition is modulated by how much the form overlaps ([Dijkstra et al., 2010, *Journal of Memory and Language* 62(3), 284–301](https://doi.org/10.1016/j.jml.2009.12.003)) **[not fetched]**.
  - **Design:** front-load high-frequency transparent cognates for early wins (*water, hand, warm, appel, boek*).
  - Tag common false friends explicitly, for example *eventueel* (= possibly), *brutaal* (= cheeky), *slim* (= clever), *bellen* (= to phone), *door* (= through), *also/alsof*, *become/bekomen* **[illustrative; not from a single cited source]**.

## 5. Free content sources and their licences

| Resource | What it gives | Licence / terms | Fit for a free shareable app |
|---|---|---|---|
| **SUBTLEX-NL** (Ghent Univ.) | Word frequencies from ~44M words of film/TV subtitles. Contextual diversity predicts lexical decision better than raw counts ([Keuleers, Brysbaert & New, 2010, *Behav. Res. Methods* 42(3)](https://link.springer.com/content/pdf/10.3758/BRM.42.3.643.pdf)). An updated release with PoS and Zipf values is on [OSF](https://osf.io/3d8cx/wiki) | Described as freely available for research. The original Ghent URL 404'd when fetched | Good for *ranking* which words to teach. Check terms before redistributing the raw list |
| **FrequencyWords** (OpenSubtitles 2016/2018) | Top-50k word lists per language | Code MIT, **content CC BY-SA 4.0** ([repo](https://github.com/hermitdave/FrequencyWords)) | Yes, with attribution and share-alike |
| **NT2Lex** (UCLouvain/KU Leuven) | CEFR-graded (A1–C1) Dutch lexicon from L2 textbooks and readers. Basic and sense-disambiguated versions | **CC BY-NC-SA 4.0**, "for your own research or teaching" ([download page](http://cental.uclouvain.be/cefrlex/nt2lex/download/); cite Tack et al. 2018, BEA workshop) | Yes, if the app stays **non-commercial**. Best source for an A1 word list |
| **Tatoeba** | Dutch sentences linked to English translations, as TSV dumps | Sentences **CC BY 2.0 FR** (a subset CC0). Audio licence is set per contributor, and audio with no licence must not be reused outside Tatoeba ([downloads](https://tatoeba.org/en/downloads)) | Yes. Attribute and check sentence quality. Use only audio rows that carry a licence |
| **Wiktionary** | Definitions, genders (de/het), IPA, inflections | Dual **CC BY-SA 4.0** + GFDL ([Wiktionary:Copyrights](https://en.wiktionary.org/wiki/Wiktionary:Copyrights)). Pre-parsed JSON dumps exist (wiktextract/kaikki.org), and those inherit Wiktionary's licence | Yes, with attribution and share-alike. A great source for noun gender |
| **Lingua Libre** | Single-word native-speaker recordings, uploaded to Wikimedia Commons | **CC BY-SA 4.0** per the project ([Wikipedia: Lingua Libre](https://en.wikipedia.org/wiki/Lingua_Libre)) **[secondary; the site returned 503]**. Commons files carry per-file licences ([Commons:Lingua Libre](https://commons.wikimedia.org/wiki/Commons:Lingua_Libre)) | Yes. Read the licence from each file's Commons page |
| **Wikimedia Commons pronunciations** | Other Dutch pronunciation files | Licence set per file (usually CC BY-SA or CC0) | Yes, per file |
| **Mozilla Common Voice (nl)** | Crowd-recorded Dutch sentence audio (a multi-GB corpus) | **CC0-1.0**, plus download terms that forbid trying to identify speakers and (in recent releases) re-hosting or re-sharing the dataset ([Mozilla Data Collective listing](https://datacollective.mozillafoundation.org/datasets/cmflnuzw612cjai01qcld1gt5); [HF dataset card](https://huggingface.co/datasets/mozilla-foundation/common_voice_14_0/blob/main/README.md)) | Possible for selected clips, but audio quality varies and the re-share clause needs checking. Better suited to ASR than to teaching |
| **Forvo** | Native pronunciations of individual words | API is **paid**: the non-profit plan is $2/month, 500 req/day, no commercial use. Content terms are summarised as "Attribution, non-commercial and share-alike" ([Forvo API](https://api.forvo.com/)). The main site's T&C returned 403 | Only via a paid API key and for non-commercial use. Avoid for a simple free static app |

**Browser speech APIs (MDN)**

- **Text-to-speech, `speechSynthesis`:** `getVoices()` is **Baseline: widely available** (since 2018). The voice list depends on the device's OS and installed voices, and it may load asynchronously, so listen for `voiceschanged` ([MDN getVoices](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/getVoices)). Set `utterance.lang = "nl-NL"` and pick a voice whose `lang` starts with `nl`. If none exists, fall back to recorded audio, because some devices have no Dutch voice.
- **Speech-to-text, `SpeechRecognition`:**
  - It is **not Baseline** because it "does not work in some of the most widely-used browsers".
  - In Chrome, "your audio is sent to a web service for recognition processing, so it won't work offline".
  - `lang` defaults to the page's HTML `lang` attribute ([MDN SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)).
  - Newer specs add on-device recognition (`processLocally`, `available()`/`install()`), gated by a Permissions-Policy ([MDN Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)).
  - **For a 13-year-old user:** treat speech recognition as an optional, clearly disclosed "pronunciation check". Get consent, since audio goes to a third party. Feature-detect it, and never make it required.

---

## Sources

**Learning science**
- Cepeda, N. J., Pashler, H., Vul, E., Wixted, J. T., & Rohrer, D. (2006). Distributed practice in verbal recall tasks. *Psychological Bulletin*, 132(3), 354–380. https://doi.org/10.1037/0033-2909.132.3.354 ([PDF](https://www.evullab.org/pdf/CepedaPashlerVulWixtedRohrer-PB-2006.pdf))
- Cepeda, N. J., Vul, E., Rohrer, D., Wixted, J. T., & Pashler, H. (2008). Spacing effects in learning: A temporal ridgeline of optimal retention. *Psychological Science*, 19(11), 1095–1102. https://doi.org/10.1111/j.1467-9280.2008.02209.x ([PDF](https://www.evullab.org/pdf/CepedaVulRohrerWixtedPashler-PS-2008.pdf))
- Roediger, H. L., & Karpicke, J. D. (2006). Test-enhanced learning. *Psychological Science*, 17(3), 249–255. https://doi.org/10.1111/j.1467-9280.2006.01693.x
- Karpicke, J. D., & Roediger, H. L. (2008). The critical importance of retrieval for learning. *Science*, 319(5865), 966–968. https://doi.org/10.1126/science.1152408 [not fetched]
- Kornell, N. (2009). Optimising learning using flashcards: Spacing is more effective than cramming. *Applied Cognitive Psychology*, 23(9), 1297–1317. https://doi.org/10.1002/acp.1537 [not fetched]
- Wozniak, P. SM-2 algorithm description. https://super-memo.com/english/ol/sm2.htm
- Open Spaced Repetition, "The Algorithm" (FSRS). https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm
- ts-fsrs (MIT). https://github.com/open-spaced-repetition/ts-fsrs
- Anki Manual, Deck Options (FSRS desired retention). https://docs.ankiweb.net/deck-options.html

**Input**
- Krashen, S. (1982). *Principles and Practice in Second Language Acquisition*. https://www.sdkrashen.com/content/books/principles_and_practice.pdf
- Schmidt, R. (1990). The role of consciousness in second language learning. *Applied Linguistics*, 11(2), 129–158. https://doi.org/10.1093/applin/11.2.129 [not fetched]
- Liu, D. A critical review of Krashen's input hypothesis [secondary]. https://www.slideshare.net/slideshow/a-critical-review-of-krashen-s-input-hypothesis-three-major-argumentspdf/259705909
- Hu, M., & Nation, P. (2000). Unknown vocabulary density and reading comprehension. *Reading in a Foreign Language*, 13(1); replication by Kremmel et al. (2023). https://eprints.lancs.ac.uk/id/eprint/210922

**Motivation**
- Ryan, R. M., & Deci, E. L. (2000). Self-determination theory… *American Psychologist*, 55(1), 68–78. https://selfdeterminationtheory.org/SDT/documents/2000_RyanDeci_SDT.pdf
- Deci, E. L., Koestner, R., & Ryan, R. M. (1999). A meta-analytic review of experiments examining the effects of extrinsic rewards on intrinsic motivation. *Psychological Bulletin*, 125(6), 627–668. https://depts.washington.edu/techdocs/papers/deciExtrinsicRewardsAndIntrinsicMotivation99.pdf
- Sailer, M., & Homner, L. (2020). The gamification of learning: A meta-analysis. *Educational Psychology Review*, 32, 77–112. https://link.springer.com/article/10.1007/s10648-019-09498-w
- Hanus, M. D., & Fox, J. (2015). Assessing the effects of gamification in the classroom. *Computers & Education*, 80, 152–161. https://doi.org/10.1016/j.compedu.2014.08.019 [not fetched]
- Silverman, J., & Barasch, A. (2023). On or off track: How (broken) streaks affect consumer decisions. *Journal of Consumer Research*, 49(6), 1095–1117. https://doi.org/10.1093/jcr/ucac029 [not fetched]

**Dutch language**
- U.S. Department of State, FSI Foreign Language Training (archived 2021-01-05). https://webarchive.library.unt.edu/web/20210105072258/https://www.state.gov/foreign-language-training
- Gussenhoven, C. (1992). Dutch. *Journal of the International Phonetic Association*, 22(1–2), 45–47. https://doi.org/10.1017/S002510030000459X [not fetched]
- Instituut voor de Nederlandse Taal, e-ANS §21.1.1.1 "Het principe van de polen van een zin". https://e-ans.ivdnt.org/topics/pid/ans21010101lingtopic
- Taaladvies (Vlaamse overheid), "lidwoord". https://www.vlaanderen.be/taaladvies/taaladviezen/lidwoord-taalkundige-term
- Inburgering.org, diminutive basics [secondary]. https://inburgering.org/nl/grammar/diminutive-basics
- Dijkstra, T., Miwa, K., Brummelhuis, B., Sappelli, M., & Baayen, H. (2010). How cross-language similarity and task demands affect cognate recognition. *Journal of Memory and Language*, 62(3), 284–301. https://doi.org/10.1016/j.jml.2009.12.003 [not fetched]

**Content and APIs**
- Keuleers, E., Brysbaert, M., & New, B. (2010). SUBTLEX-NL. *Behavior Research Methods*, 42(3), 643–650. https://link.springer.com/content/pdf/10.3758/BRM.42.3.643.pdf; OSF update: https://osf.io/3d8cx/wiki
- FrequencyWords (OpenSubtitles). https://github.com/hermitdave/FrequencyWords
- NT2Lex download and licence. http://cental.uclouvain.be/cefrlex/nt2lex/download/
- Tatoeba downloads and licences. https://tatoeba.org/en/downloads
- Wiktionary:Copyrights. https://en.wiktionary.org/wiki/Wiktionary:Copyrights
- Commons:Lingua Libre. https://commons.wikimedia.org/wiki/Commons:Lingua_Libre
- Mozilla Common Voice, Dutch dataset listing. https://datacollective.mozillafoundation.org/datasets/cmflnuzw612cjai01qcld1gt5
- Forvo API plans and licence summary. https://api.forvo.com/
- MDN: Web Speech API. https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API
- MDN: SpeechRecognition. https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition
- MDN: SpeechSynthesis.getVoices(). https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/getVoices
