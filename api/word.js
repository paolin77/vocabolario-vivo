// "Passacarte" che parla con Claude tenendo nascosta la chiave segreta.
// Per usare la versione più ricca ma più lenta, sostituisci la riga MODEL con:
//   const MODEL = "claude-sonnet-4-6";
const MODEL = "claude-haiku-4-5-20251001";

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
Per una parola casuale, scegli parole rare, poetiche o dimenticate (es: ineffabile, crepuscolo, mellifluo, vaghezza, sgomento), mai banali. Sii conciso ma bello.`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Metodo non consentito" });

  const word = req.body && req.body.word ? String(req.body.word) : "";
  if (!word) return res.status(400).json({ error: "Parola mancante" });

  const prompt = word === "__random__"
    ? "Suggerisci una parola italiana rara, poetica o particolarmente bella e fornisci tutte le informazioni richieste."
    : 'Fornisci tutte le informazioni per la parola italiana: "' + word + '"';

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
