// "Passacarte" che parla con Claude tenendo nascosta la chiave segreta.
// Per usare la versione più ricca ma più lenta, sostituisci la riga MODEL con:
//   const MODEL = "claude-sonnet-4-6";
const MODEL = "claude-haiku-4-5-20251001";

// Temi per variare le parole casuali ed evitare che si ripetano sempre le stesse.
const TEMI = [
  "la natura e il paesaggio", "le emozioni e gli stati d'animo", "il tempo e la memoria",
  "la luce, l'ombra e i colori", "il suono, la voce e il silenzio", "il movimento e la quiete",
  "parole desuete o letterarie", "parole di origine greca o latina rara",
  "il mare e l'acqua", "la notte e il sogno", "la malinconia e la nostalgia",
  "la meraviglia e lo stupore", "parole regionali o arcaiche italiane", "il corpo e i gesti",
  "il viaggio e la lontananza", "la casa e gli affetti", "la fede e il sacro", "il vino e il cibo"
];

const SYSTEM_PROMPT = `Sei un lessicografo italiano brillante. Data una parola italiana, rispondi SOLO con JSON valido (niente markdown, niente testo extra), struttura esatta:
{
  "parola": "la parola esatta",
  "pronuncia": "es: [vo-ka-bo-LA-rio]",
  "categoria": "sostantivo / verbo / aggettivo / ecc.",
  "definizione": "definizione ricca ed evocativa, quasi poetica",
  "etimologia": "origine breve e affascinante",
  "esempio": "frase d'esempio letteraria che usa la parola",
  "sinonimi": ["sin1", "sin2", "sin3"],
  "curiosita": "fatto curioso, uso letterario o sfumatura insolita"
}
Quando devi proporre una parola casuale, varia molto le tue scelte e prediligi parole rare, poetiche o dimenticate, mai banali e mai ripetute. Sii conciso ma bello.`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Metodo non consentito" });

  const word = req.body && req.body.word ? String(req.body.word) : "";
  const avoid = req.body && Array.isArray(req.body.avoid) ? req.body.avoid.slice(0, 60) : [];
  if (!word) return res.status(400).json({ error: "Parola mancante" });

  let prompt;
  if (word === "__random__") {
    const tema = TEMI[Math.floor(Math.random() * TEMI.length)];
    prompt = "Suggerisci UNA sola parola italiana rara, poetica o dimenticata legata a questo tema: "
      + tema + ". Dev'essere bella e non banale."
      + (avoid.length ? " Non proporre in nessun caso queste parole, che sono già state mostrate: " + avoid.join(", ") + "." : "")
      + " Fornisci tutte le informazioni richieste.";
  } else {
    prompt = 'Fornisci tutte le informazioni per la parola italiana: "' + word + '"';
  }

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 900,
        temperature: 1,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await r.json();
    const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) return res.status(502).json({ error: "Risposta non valida" });

    return res.status(200).json(JSON.parse(text.slice(start, end + 1)));
  } catch (e) {
    return res.status(500).json({ error: "Errore nella richiesta" });
  }
}
