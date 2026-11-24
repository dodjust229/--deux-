// Réécriture du banc de questions : paliers 3 et 4 plus explicites, séduction
// palier 2 plus directe. La structure (id, catégorie, format, palier, audience,
// visibilité, options) est strictement conservée : seuls `title`, `prompt` et
// `options` changent. Chaque consigne garde son émoji et, pour les défis et
// questions croisées, sa forme interrogative (règles de scripts/sync-catalog.mjs).
import fs from "node:fs";

const PATH = "src/catalog.json";
const cards = JSON.parse(fs.readFileSync(PATH, "utf8"));

/** id -> { title?, prompt, options? } */
const REWRITE = {
  /* ================= PALIER 3 — « On se lâche » ================= */
  p03: {
    title: "Ce qui te fait lâcher prise",
    prompt: "🧠 Quand mon corps te plaît et que tu sens que ça monte, qu'est-ce qui te fait lâcher prise le plus vite : ma bouche, mes mains, ma voix ou mon regard ? Choisis en secret.",
    options: ["Ta bouche sur la mienne", "Tes mains qui me parcourent", "Ta voix tout près de mon oreille", "Ton regard qui ne me lâche pas"]
  },
  p04: {
    title: "Juste après",
    prompt: "🫧 Juste après un moment intime, qu'est-ce que tu veux vraiment : rester en moi sans un mot, parler de ce qui vient de se passer, rire, ou recommencer ?"
  },
  p05: {
    title: "Le désir que je n'ai jamais dit",
    prompt: "🫶 Quel désir précis n'as-tu jamais confié à personne — pas même à moi — et que tu pourrais écrire ici, sachant que ça reste sur ton appareil ?"
  },
  p06: {
    title: "Ce qui me fait craquer chez toi",
    prompt: "🔎 Devine quel geste précis de mon corps te fait craquer quand on est au lit, puis dis-moi si tu joues avec exprès."
  },
  p07: {
    title: "Dans six mois",
    prompt: "🌊 Quelle expérience sensuelle précise aimerais-tu qu'on ait vécue ensemble d'ici six mois — et qu'est-ce qui te retient aujourd'hui de la proposer ?"
  },
  p08: {
    title: "Le rythme qui te fait perdre la tête",
    prompt: "🕯️ Quel rythme te fait perdre la tête : lent et profond, rapide et urgent, des alternances imprévisibles, ou celui qui suit exactement ce que je te dis ? Choisis en secret.",
    options: ["Lent et profond, sans se presser", "Rapide et urgent, sans retenue", "Des alternances imprévisibles", "Celui que tu me dictes mot pour mot"]
  },
  p09: {
    title: "Ce qui te rassure quand ça monte",
    prompt: "🫀 Quand l'intimité devient très intense, qu'est-ce qui te rassure le plus : que je te regarde dans les yeux, que je te parle, que je ralentisse, ou que je te demande si c'est bon ? Devine aussi ce qui me rassurerait."
  },
  x03: {
    title: "Ce qu'un geste a changé",
    prompt: "🫦 Le premier peut-il dire quel geste précis de l'autre a changé sa façon de le désirer ? Le second peut-il répondre par ce que ce geste lui fait encore aujourd'hui ?"
  },
  a01: {
    title: "Le flirt qui t'allume",
    prompt: "🌶️ Quel flirt t'allume le plus vite : mes sous-entendus à table, ma main qui s'attarde, mes messages en pleine journée, ou mon regard quand personne ne regarde ? Choisis en secret.",
    options: ["Mes sous-entendus devant les autres", "Ma main qui s'attarde sur toi", "Mes messages en pleine journée", "Mon regard quand personne ne regarde"]
  },
  a04: {
    title: "Ce qui te met en confiance quand ça va vite",
    prompt: "🔥 Quand tout s'accélère entre nous, qu'est-ce qui te permet de te sentir totalement libre : que je te dise ce que je veux, que je te demande ce que tu veux, ou que je m'arrête pour vérifier ?"
  },
  p10: {
    title: "Le besoin derrière le désir",
    prompt: "🌙 Quand tu as envie de moi, qu'est-ce que tu cherches vraiment : me sentir contre toi, te sentir désiré, oublier le reste, ou te perdre dans le plaisir ?"
  },
  p11: {
    title: "La confiance qui autorise",
    prompt: "🔐 Qu'est-ce qui te permet de dire une envie sexuelle à voix haute sans avoir peur de ma réaction ? Choisis en secret ce qui compte le plus.",
    options: ["Savoir que tu peux dire non sans me blesser", "Que je te dise d'abord ce que je veux", "Qu'on en parle sans que ça devienne un défi", "Que rien ne sorte de ce lit"]
  },
  p12: {
    title: "Ce que tu n'oses pas demander",
    prompt: "🫂 Devine quelle attention intime j'aimerais recevoir plus souvent et que je n'ose pas réclamer — puis dis-moi si tu es prêt à me la donner."
  },
  p13: {
    title: "Une envie, dite à voix haute",
    prompt: "💬 Peux-tu formuler une envie sexuelle précise que tu aimerais explorer avec moi, en disant aussi ce qui te ferait te sentir en sécurité pour la tenter ?"
  },
  p14: {
    title: "Écouter avant de répondre",
    prompt: "🫂 Le premier peut-il nommer une limite intime qui compte pour lui ? Le second peut-il la reformuler exactement, avant de dire ce qu'il en pense ?"
  },
  p15: {
    title: "Le rythme qui te respecte",
    prompt: "⏳ Quand le désir monte vite entre nous, qu'est-ce qui t'aide à garder un rythme qui te convient vraiment, sans te forcer à suivre le mien ?"
  },
  p16: {
    title: "Où tu te sens libre de parler",
    prompt: "🕯️ Dans quel contexte te sentirais-tu le plus libre de me dire une envie sexuelle précise : dans le noir, après l'amour, par messages, ou en plein jour ? Choisis en secret.",
    options: ["Dans le noir, sans me voir", "Juste après l'amour", "Par messages, à distance", "En plein jour, face à face"]
  },
  p17: {
    title: "Ce que tu veux comprendre de mon désir",
    prompt: "🧩 Quelle part de mon désir aimerais-tu mieux comprendre — ce qui m'allume, ce qui me bloque, ce que je n'ose pas demander — sans supposer que tu connais déjà la réponse ?"
  },
  s08: {
    title: "Le regard qui dit tout",
    prompt: "👁️ Quel regard de ma part te fait comprendre, sans un mot, que j'ai envie de toi là, maintenant ? Décris-le précisément."
  },
  s09: {
    title: "La phrase qui te trouble",
    prompt: "💋 Peux-tu me murmurer une phrase de désir assez directe pour me faire rougir, en restant exactement dans ce que j'aime entendre ?"
  },
  s10: {
    title: "Le geste que tu veux que je prenne",
    prompt: "🔥 Quel geste de désir aimerais-tu que je prenne plus souvent, et plus lentement ? Choisis en secret.",
    options: ["Ta nuque, mes lèvres dessus", "Ma main qui descend sans se presser", "Mon corps contre le tien, debout", "Mes mots avant mes gestes"]
  },
  a25: {
    title: "L'envie assumée",
    prompt: "😈 Quelle proposition te semblerait la plus excitante à explorer à deux, si on en avait tous les deux envie ce soir ? Choisis en secret.",
    options: ["Un jeu de rôles avec des règles", "Une soirée où chacun avoue un fantasme", "Te laisser mener sans rien décider", "Une surprise que je prépare sans te dire quoi"]
  },
  a26: {
    title: "Le désir sans détour",
    prompt: "🌶️ Quelle envie sensuelle aimerais-tu me confier franchement, sans la transformer en défi et sans te sentir obligé de la réaliser ?"
  },
  a27: {
    title: "Oser demander",
    prompt: "🫦 Peux-tu me demander une chose sexuelle précise que tu aimerais recevoir, en me laissant totalement libre de dire oui, non ou pas maintenant ?"
  },
  f01: {
    title: "Le désir jamais formulé",
    prompt: "🌶️ Quel désir intime aimerais-tu pouvoir dire à voix haute sans que ça change ce que je pense de toi ?"
  },
  f02: {
    title: "L'audace consentie",
    prompt: "😈 Choisissez en secret l'audace qui vous tente le plus tous les deux, ce soir.",
    options: ["Se déshabiller l'un l'autre, lentement", "Un jeu de dominant et dominé, à règles claires", "Se regarder sans se toucher pendant dix minutes", "Dire à voix haute ce qu'on veut faire, avant de le faire"]
  },
  f03: {
    title: "Le fantasme deviné",
    prompt: "🫦 Quel scénario sexuel pourrais-je avoir envie de vivre avec toi ? Écris ton intuition, puis comparez — sans obligation de le réaliser."
  },
  f04: {
    title: "La vérité du corps",
    prompt: "🔥 Peux-tu nommer une partie de ton corps que tu aimes qu'on regarde, et une que tu aimerais que je touche plus souvent ?"
  },
  f05: {
    title: "La scène qui t'a excité",
    prompt: "💋 Le premier peut-il raconter une scène précise entre vous qui l'a excité plus que de raison ? Le second peut-il dire ce qu'il ressentait à ce moment-là ?"
  },
  f06: {
    title: "Le oui et le non",
    prompt: "🧭 Dans l'intimité, qu'est-ce qui te fait dire oui sans hésiter, et quel signal doit toujours tout arrêter, même au milieu ?"
  },
  f07: {
    title: "Le terrain à explorer",
    prompt: "🗝️ Choisissez en secret le sujet sexuel que vous aimeriez aborder vraiment, sans détour.",
    options: ["Ce qui nous manque au lit", "Un fantasme qu'on n'a jamais dit", "Ce qu'on aimerait essayer à trois… ou pas du tout", "Ce qu'on ne veut plus jamais faire"]
  },
  f08: {
    title: "Le mot qui te trouble",
    prompt: "😏 Quel mot ou quelle phrase, dite par moi au bon moment, te trouble plus que je ne l'imagine ?"
  },
  f09: {
    title: "Le besoin de sécurité",
    prompt: "🫶 Qu'est-ce qui te rassure le plus quand on essaie quelque chose de nouveau au lit ? Devine aussi ce qui me rassurerait."
  },
  f10: {
    title: "L'envie formulée",
    prompt: "🌶️ Peux-tu formuler une envie sexuelle de façon directe, puis dire ce qui te ferait te sentir assez en confiance pour la vivre ?"
  },
  f11: {
    title: "Le souvenir du frisson",
    prompt: "⚡ Le premier peut-il raconter un moment précis où son désir pour l'autre était presque insoutenable ? Le second peut-il dire s'il l'avait senti ?"
  },
  f12: {
    title: "La vulnérabilité choisie",
    prompt: "🖤 Quelle part de ton désir ou de ton corps aimerais-tu montrer sans craindre d'être jugé ?"
  },
  f13: {
    title: "Le rythme du désir",
    prompt: "🔥 Choisissez en secret le rythme qui vous attire le plus pour un moment intime, ce soir.",
    options: ["Long, lent, jusqu'à ce qu'on n'en puisse plus", "Rapide, affamé, sans préliminaires", "Des pauses, des reprises, du souffle", "Toi qui décides, moi qui suis"]
  },
  f14: {
    title: "Le geste qui trouble",
    prompt: "🫦 Quel geste de ma part pourrait te faire perdre le fil de tes pensées ? Devine aussi celui que je choisirais chez toi."
  },
  f15: {
    title: "La limite positive",
    prompt: "💬 Peux-tu expliquer une limite qui te protège, et dire ce qui, à l'intérieur de cette limite, te plaît vraiment ?"
  },
  f16: {
    title: "La curiosité sexuelle",
    prompt: "🌶️ Quelle question sur ta sexualité aimerais-tu pouvoir poser ou recevoir sans gêne ni jugement ?"
  },
  f17: {
    title: "Le compliment osé",
    prompt: "😈 Le premier peut-il décrire précisément ce qu'il désire chez l'autre, sans détour ? Le second peut-il répondre par ce qu'il aimerait entendre plus souvent ?"
  },
  f18: {
    title: "Après l'intimité",
    prompt: "🫧 Après un moment sexuel, de quoi as-tu vraiment besoin pour te sentir bien : de la tendresse, de parler, du silence, de rire, ou de mon corps encore contre le tien ?"
  },
  f19: {
    title: "La surprise intime",
    prompt: "🎲 Quelle surprise sensuelle pourrais-je te préparer qui resterait exactement dans tes limites ? Devine ma réponse."
  },
  f20: {
    title: "Le regard assumé",
    prompt: "👀 Peux-tu me dire ce que tu regardes en premier sur mon corps quand tu me désires, sans te censurer ?"
  },
  f21: {
    title: "La confiance à deux",
    prompt: "🫀 Le premier peut-il dire ce qui lui permet de se livrer sexuellement ? Le second peut-il répondre par un engagement concret, pas une promesse vague ?"
  },
  f22: {
    title: "Le tabou à dénouer",
    prompt: "🔓 Quel sujet sexuel te semble encore impossible à aborder avec moi, et qu'est-ce qui t'aiderait à en parler sans gêne ?"
  },
  f23: {
    title: "Le scénario de séduction",
    prompt: "💋 Choisissez en secret le scénario qui vous attire le plus, sans vous engager à le vivre.",
    options: ["Un inconnu et une inconnue, dans un bar", "Un patron et son employé", "Deux personnes qui n'ont pas le droit", "Toi, moi, et aucune règle"]
  },
  f24: {
    title: "Le feu vert",
    prompt: "🔥 Peux-tu demander clairement à l'autre ce qu'il aimerait essayer, puis écouter sa réponse sans chercher à la négocier ?"
  },

  /* ================= PALIER 4 — « Ce qu'on n'avoue jamais » ================= */
  a02: {
    title: "La limite à tenir",
    prompt: "😈 Quelle limite veux-tu que je respecte absolument quand on perd la tête, et comment veux-tu que je te la rappelle sans casser l'instant ?"
  },
  a03: {
    title: "La première minute",
    prompt: "🌶️ Peux-tu décrire, minute par minute, ce que tu me ferais si je te laissais commencer ce soir ? L'autre reste libre de refuser."
  },
  a05: {
    title: "Ce que je n'ai jamais osé demander",
    prompt: "🫦 Écris précisément ce que tu voudrais que je te fasse et que tu n'as jamais osé demander. Les réponses se révèlent en même temps ; chacun reste libre de refuser."
  },
  a06: {
    title: "Dix secondes de plus",
    prompt: "😈 Si je te laissais dix secondes de plus ce soir, sans rien dire, qu'est-ce que tu ferais exactement ? Une phrase, pas un roman."
  },
  a07: {
    title: "Le mot de passe",
    prompt: "🥵 Choisis un mot qui veut dire « continue » et un mot qui veut dire « arrête tout de suite ». Écrivez-les, puis découvrez-les ensemble — et respectez-les à la lettre."
  },
  a08: {
    title: "La scène",
    prompt: "🍒 Décris comme au cinéma la scène où tu voudrais que tout bascule ce soir : le lieu, la lumière, le premier geste, et ce que tu me fais ensuite. Une envie, pas une promesse."
  },
  a09: {
    title: "Raconte, je prolonge",
    prompt: "🎭 Êtes-vous prêts à commencer une scène érotique en deux phrases, puis à laisser l'autre la continuer sans la corriger ? Chacun peut s'arrêter quand il veut."
  },
  a10: {
    title: "Là où tout bascule",
    prompt: "💥 Écris où et quand tu aimerais que je te prenne, puis devine le choix de l'autre : ici ce soir, ailleurs dans la maison, ou dans un lieu inattendu. Rien de tout cela n'engage l'autre."
  },
  a11: {
    title: "Le détail qui te fait craquer",
    prompt: "🫦 Quel détail précis de mon corps te donne envie de me toucher immédiatement ? Choisis sans réfléchir.",
    options: ["Ma nuque et mes épaules", "Ma bouche quand elle s'entrouvre", "Mes hanches sous mes vêtements", "Mes cuisses quand je m'assieds"]
  },
  a12: {
    title: "Sans détour",
    prompt: "🔥 Qu'est-ce qui t'excite le plus dans ma façon de te désirer, et qu'est-ce que tu voudrais que je te fasse plus souvent, sans détour ?"
  },
  a13: {
    title: "Le murmure",
    prompt: "🤫 Peux-tu t'approcher et me dire à l'oreille, mot pour mot, ce que tu veux me faire ce soir ? Tu peux aussi l'écrire si tu préfères."
  },
  a14: {
    title: "Ce que tu veux ce soir",
    prompt: "🌙 Écris précisément ce que tu veux que je te fasse ce soir, puis devine ce que j'ai écrit. Comparez sans négocier."
  },
  a15: {
    title: "Le baiser que tu réclames",
    prompt: "💋 Quel baiser veux-tu de moi maintenant : tendre et long, profond et lent, affamé, ou celui qui descend ailleurs ? Décris-le."
  },
  a16: {
    title: "Ton point faible",
    prompt: "🫦 Quel geste précis te fait perdre tous tes moyens ? Choisis celui que tu assumes le plus.",
    options: ["Une main ferme dans mes cheveux", "Des lèvres dans mon cou", "Des mots crus à l'oreille", "Un regard qui me déshabille"]
  },
  a17: {
    title: "Une envie, deux versions",
    prompt: "🔥 Êtes-vous prêts à ce que le premier décrive en trois phrases une envie sexuelle précise, puis que le second dise ce qui l'attire et ce qu'il changerait ? Chacun peut passer."
  },
  a18: {
    title: "La question interdite",
    prompt: "😈 Quelle question sur le sexe as-tu toujours voulu me poser sans oser ? Pose-la maintenant, sans obligation de réponse."
  },
  a19: {
    title: "Le regard qui insiste",
    prompt: "👀 Peux-tu me regarder dix secondes comme si tu allais me dire exactement ce que tu veux me faire, puis m'expliquer ce qui te traversait l'esprit ? Aucun contact n'est imposé."
  },
  a20: {
    title: "L'ambiance qui te fait basculer",
    prompt: "🕯️ Choisis l'ambiance qui te ferait basculer le plus vite ce soir.",
    options: ["Une chambre à la lumière tamisée", "Une douche chaude à deux", "Des baisers qui n'en finissent pas", "Une conversation très crue qui dérape"]
  },
  a21: {
    title: "Dis-moi ce que tu veux",
    prompt: "❤️‍🔥 Si tu pouvais me demander une seule chose sexuelle pour rendre notre prochain moment plus intense, qu'est-ce que tu demanderais, sans filtre ?"
  },
  a22: {
    title: "Qui osera le premier pas ?",
    prompt: "😏 Selon toi, lequel de nous deux va craquer en premier ce soir ? Écris ton choix, puis découvre celui de l'autre."
  },
  a23: {
    title: "Le compliment sans filtre",
    prompt: "🔥 Peux-tu me dire exactement ce qui t'attire physiquement chez moi, avec des mots crus et précis, sans formule toute faite ?"
  },
  a24: {
    title: "La limite et l'envie",
    prompt: "🔒 Quelle envie sexuelle aimerais-tu explorer avec moi, et quelle limite veux-tu qu'on respecte absolument pour que tu te sentes totalement libre ?"
  },
  a28: {
    title: "Le scénario qui t'attire",
    prompt: "🔥 Quel scénario sexuel entre adultes consentants aimerais-tu imaginer avec moi, sans obligation de le vivre ?"
  },
  a29: {
    title: "L'audace de la soirée",
    prompt: "🍒 Quelle ambiance te donnerait le plus envie de te laisser faire ce soir ? Choisissez en secret.",
    options: ["Lumière tamisée et musique lente", "Une conversation très franche qui dérape", "Des baisers spontanés, debout", "Un jeu de défis sensuels"]
  },
  g01: {
    title: "Le fantasme précis",
    prompt: "🌶️ Quel fantasme sexuel aimerais-tu me décrire avec précision — les gestes, l'ordre, les mots — même si tu ne veux pas le réaliser ?"
  },
  g02: {
    title: "Le scénario sans pression",
    prompt: "😈 Choisissez en secret le scénario sexuel qui vous intrigue le plus, sans engagement de le réaliser.",
    options: ["Être attaché, à tour de rôle", "Faire l'amour dans un lieu où on pourrait être surpris", "Se filmer, puis tout effacer", "Obéir à trois ordres précis"]
  },
  g03: {
    title: "La confession attendue",
    prompt: "🫦 Quelle envie sexuelle penses-tu que je n'ai pas encore osé te dire ? Écris ton intuition, puis laisse-moi confirmer ou corriger."
  },
  g04: {
    title: "Le désir sans détour",
    prompt: "🔥 Peux-tu me dire franchement ce que tu veux me faire maintenant, en respectant ce que chacun accepte d'entendre ?"
  },
  g05: {
    title: "La limite non négociable",
    prompt: "🛑 Le premier peut-il nommer une limite sexuelle non négociable ? Le second peut-il la reformuler mot pour mot pour montrer qu'il l'a comprise ?"
  },
  g06: {
    title: "Le plaisir assumé",
    prompt: "💥 Qu'est-ce qui te donne le plus de plaisir au lit : la connexion, les sensations, les mots crus, le rythme, ou la nouveauté ? Explique sans filtre."
  },
  g07: {
    title: "Le niveau d'audace",
    prompt: "🌶️ Choisissez en secret le type de défi adulte que vous accepteriez volontiers ce soir.",
    options: ["Un strip-tease, sans rire", "Un jeu de dominant et dominé", "Une position qu'on n'a jamais essayée", "Me laisser te regarder me toucher"]
  },
  g08: {
    title: "La scène imaginée",
    prompt: "🖤 Décris une scène sexuelle entre nous que tu aimerais vivre, en précisant l'ambiance, les gestes, et ce qui te ferait te sentir irrésistible."
  },
  g09: {
    title: "Le plaisir deviné",
    prompt: "🔥 Quelle attention sexuelle précise me ferait le plus plaisir ? Devine, puis demande-moi ce que je préfère vraiment."
  },
  g10: {
    title: "La demande claire",
    prompt: "💬 Peux-tu formuler une demande sexuelle précise en laissant à l'autre toute liberté de répondre oui, non ou pas maintenant ?"
  },
  g11: {
    title: "L'après essentiel",
    prompt: "🫧 Le premier peut-il dire ce qu'il attend vraiment après un rapport ? Le second peut-il dire ce qu'il peut offrir et ce dont il a lui-même besoin ?"
  },
  g12: {
    title: "La nouveauté tentante",
    prompt: "😈 Quelle pratique sexuelle, nouvelle pour toi, t'intrigue assez pour que tu aies envie d'en parler sérieusement avec moi ?"
  },
  g13: {
    title: "La dynamique choisie",
    prompt: "🗝️ Choisissez en secret la dynamique qui vous attire dans un jeu intime consenti.",
    options: ["Je décide, tu suis", "Tu décides, je suis", "On alterne sans prévenir", "Aucune règle, juste nous"]
  },
  g14: {
    title: "Le mot déclencheur",
    prompt: "🫦 Quel mot ou quelle phrase pourrait faire monter mon désir d'un coup ? Devine, puis comparez."
  },
  g15: {
    title: "L'aveu sans détour",
    prompt: "🌶️ Peux-tu avouer une envie sexuelle que tu as déjà eue avec moi sans jamais me la formuler clairement ?"
  },
  g16: {
    title: "La sécurité absolue",
    prompt: "🛡️ Quelles conditions concrètes doivent être réunies pour que tu te sentes totalement libre d'explorer une envie sexuelle avec moi ?"
  },
  g17: {
    title: "Le fantasme partagé",
    prompt: "🔥 Le premier peut-il partager un fantasme sexuel qu'il serait prêt à discuter ? Le second peut-il dire ce qui l'attire ou non, sans jugement ?"
  },
  g18: {
    title: "Le mot d'arrêt",
    prompt: "🚦 Quel mot simple veux-tu utiliser pour tout arrêter immédiatement, et comment veux-tu que je réagisse à la seconde où tu le dis ?"
  },
  g19: {
    title: "La tentation verbale",
    prompt: "😏 Peux-tu me décrire avec des mots directs ce que tu aimerais me faire lors de notre prochain moment intime ?"
  },
  g20: {
    title: "La limite devinée",
    prompt: "🧭 Quelle limite sexuelle crois-tu que je ne franchirai jamais ? Demande-moi ensuite de confirmer ou de corriger."
  },
  g21: {
    title: "La vérité difficile",
    prompt: "🖤 Le premier peut-il dire une insatisfaction sexuelle sans accusation ? Le second peut-il écouter sans se défendre, puis répondre par sa propre vérité ?"
  },
  g22: {
    title: "Le désir à négocier",
    prompt: "🔥 Quelle envie sexuelle pourrais-tu envisager seulement si on définissait ensemble les règles, les limites et le droit d'arrêter à tout moment ?"
  },
  g23: {
    title: "La conversation brûlante",
    prompt: "💋 Choisissez en secret le sujet le plus cru que vous êtes prêts à aborder maintenant.",
    options: ["Ce qui nous manque au lit", "Un fantasme qu'on n'a jamais dit", "Ce qu'on voudrait essayer sans oser le demander", "Ce qu'on ne veut plus jamais faire"]
  },
  g24: {
    title: "Le consentement explicite",
    prompt: "🤝 Peux-tu demander un accord clair avant de me toucher, puis me montrer que tu accepteras aussi bien un oui qu'un non ?"
  },

  /* ================= SÉDUCTION PALIER 2 — plus directe ================= */
  s01: {
    title: "L'attirance immédiate",
    prompt: "😏 Quel comportement chez moi te fait basculer immédiatement, et que tu avoues rarement ?"
  },
  s02: {
    title: "La phrase qui fait rougir",
    prompt: "😏 Peux-tu m'adresser une phrase de séduction assez directe pour me faire rougir, sans aucun cliché ?"
  },
  s03: {
    title: "L'ambiance qui fait basculer",
    prompt: "💋 Quelle ambiance te fait basculer le plus vite vers l'envie de moi ? Choisissez en secret.",
    options: ["Lumière douce et musique lente", "Un parfum et une peau encore chaude", "Une promenade nocturne qui rapproche", "Un dîner préparé à deux"]
  },
  s04: {
    title: "Le premier déclic",
    prompt: "🔥 Qu'est-ce qui allume chez toi le premier déclic du désir : mon regard, ma voix, un effleurement, ou ma façon de te parler tout près ?"
  },
  s05: {
    title: "Le geste qui fait effet",
    prompt: "🫦 Devine le geste qui me ferait le plus d'effet ce soir. Écris, puis compare."
  },
  s06: {
    title: "Le premier effleurement",
    prompt: "🫧 Choisissez le geste qui vous touche le plus. On verra si vous vous êtes compris.",
    options: ["Une main qui attrape la mienne", "Des lèvres dans mon cou", "Un regard qui dure trop longtemps", "Une main posée à ma taille"]
  },
  x04: {
    title: "Le compliment osé",
    prompt: "❤️ Le premier peut-il dire ce qui l'attire physiquement chez l'autre ? Le second peut-il répondre par un compliment qu'il n'a jamais osé faire ?"
  },
  s07: {
    title: "Le détail irrésistible",
    prompt: "😉 Quel détail précis dans ma façon de bouger ou de te parler te paraît irrésistible ?"
  },
  e01: {
    title: "Le signal discret",
    prompt: "😏 Quel signe discret de ma part te fait comprendre que j'ai envie de toi ?"
  },
  e02: {
    title: "La tension préférée",
    prompt: "💋 Choisissez en secret ce qui crée le plus de tension entre vous.",
    options: ["Un regard prolongé", "Ma voix tout près de ton oreille", "Un compliment audacieux", "Un effleurement inattendu"]
  },
  e03: {
    title: "Le premier pas",
    prompt: "🔥 Qui de nous deux ferait le premier pas après une soirée pleine de sous-entendus ? Explique, puis devine."
  },
  e04: {
    title: "La phrase sans cliché",
    prompt: "🫦 Peux-tu me séduire en une seule phrase, sans utiliser les mots « beau », « belle » ou « sexy » ?"
  },
  e05: {
    title: "Le souvenir électrique",
    prompt: "⚡ Le premier peut-il raconter un moment où son désir pour l'autre était évident ? Le second peut-il dire ce qu'il ressentait à cet instant ?"
  },
  e08: {
    title: "Le détail magnétique",
    prompt: "🧲 Quel détail de mon corps ou de mon attitude attire ton regard même quand tu essaies de te concentrer ?"
  },
  e10: {
    title: "Le compliment physique",
    prompt: "🔥 Peux-tu me dire ce qui t'attire physiquement chez moi, avec des mots précis et assumés ?"
  },
  e13: {
    title: "Le moment qui rapproche",
    prompt: "🌹 Choisissez en secret le moment où vous vous sentez le plus attirés l'un par l'autre.",
    options: ["Après une longue journée", "Pendant une sortie", "Au réveil", "Quand la maison devient silencieuse"]
  },
  e15: {
    title: "Le baiser mémorable",
    prompt: "💋 Qu'est-ce qui rend un baiser vraiment mémorable pour toi : le contexte, le rythme, l'intention, ou la façon dont l'autre te tient ?"
  },
  e17: {
    title: "Le jeu des sous-entendus",
    prompt: "🫣 Le premier peut-il écrire une phrase à double sens assez osée ? Le second peut-il expliquer exactement comment il l'interprète ?"
  },
  e19: {
    title: "L'effet immédiat",
    prompt: "💥 Quel geste de désir de ma part pourrait changer instantanément ton humeur ce soir ? Devine ce que je choisirais pour toi."
  },
  e22: {
    title: "L'envie assumée",
    prompt: "😌 Quelle initiative de séduction aimerais-tu que je prenne plus souvent, sans que tu aies à la réclamer ?"
  },
  e24: {
    title: "La proximité",
    prompt: "🔥 Peux-tu me dire à voix basse ce que tu aimerais que je te fasse pour rendre ce moment plus intense, sans dépasser tes limites ?"
  }
};

let changed = 0;
const missing = [];
for (const [id, patch] of Object.entries(REWRITE)) {
  const card = cards.find((c) => c.id === id);
  if (!card) { missing.push(id); continue; }
  if (patch.title) card.title = patch.title;
  card.prompt = patch.prompt;
  if (patch.options) card.options = patch.options;
  changed += 1;
}

if (missing.length) {
  console.error("✗ Identifiants introuvables : " + missing.join(", "));
  process.exit(1);
}

fs.writeFileSync(PATH, JSON.stringify(cards, null, 2) + "\n");
console.log(`✓ ${changed} cartes réécrites dans ${PATH}`);
