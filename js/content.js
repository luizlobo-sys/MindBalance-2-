/* MindBalance — conteúdo fixo (textos, exercícios, contatos).
   Tudo aqui foi escrito para este projeto. Edite à vontade. */
window.MB = window.MB || {};

MB.VERSION = '2.0.0';

MB.MOODS = [
  { v: 1, emoji: '😢', label: 'Muito mal' },
  { v: 2, emoji: '😕', label: 'Mal' },
  { v: 3, emoji: '😐', label: 'Mais ou menos' },
  { v: 4, emoji: '🙂', label: 'Bem' },
  { v: 5, emoji: '😄', label: 'Muito bem' }
];

MB.EMOTIONS = [
  'Feliz', 'Calmo(a)', 'Animado(a)', 'Grato(a)', 'Confiante', 'Orgulhoso(a)',
  'Ansioso(a)', 'Estressado(a)', 'Triste', 'Irritado(a)', 'Cansado(a)',
  'Sozinho(a)', 'Entediado(a)', 'Com medo', 'Sobrecarregado(a)'
];

MB.FACTORS = [
  'Sono', 'Estudos', 'Prova ou trabalho', 'Amigos', 'Família', 'Namoro',
  'Redes sociais', 'Jogos', 'Exercício', 'Ar livre', 'Música', 'Alimentação',
  'Saúde', 'Conflito'
];

MB.PROMPTS = [
  { label: 'Algo de que me orgulho', text: 'Hoje eu me senti orgulhoso(a) de…' },
  { label: 'Algo que pesa em mim', text: 'Uma coisa que está pesando em mim é…' },
  { label: 'Três coisas boas', text: 'Três coisas boas que aconteceram hoje:\n1. \n2. \n3. ' },
  { label: 'Carta para o futuro', text: 'Se eu pudesse conversar com meu eu do futuro, diria…' },
  { label: 'O que preciso agora', text: 'Neste momento, o que eu mais preciso é…' },
  { label: 'Quem me faz bem', text: 'Uma pessoa que me faz bem e por quê:' }
];

MB.TIPS = [
  'Beber água e alongar pescoço e ombros por um minuto já conta como pausa.',
  'Dormir em horários parecidos todos os dias ajuda o corpo a descansar melhor.',
  'Escrever o que você sente, mesmo em poucas linhas, ajuda a organizar os pensamentos.',
  'Dividir uma tarefa grande em passos pequenos deixa tudo mais leve.',
  'Conversar com alguém de confiança não é fraqueza. É cuidado.',
  'Uma caminhada curta ao ar livre pode mudar o clima do seu dia.',
  'Nas redes, quase sempre vemos só o melhor ângulo da vida dos outros.',
  'Errar faz parte de aprender. O que o último erro te ensinou?',
  'Estudar 25 minutos e descansar 5 é uma forma simples de manter o foco.',
  'Antes de uma prova, respire fundo: inspire pelo nariz e solte devagar pela boca.',
  'Sentir ansiedade ou tristeza de vez em quando faz parte de ser humano. Se pesar demais ou durar muito, peça ajuda.',
  'Agradecer por uma coisa pequena por dia ajuda a perceber o que está indo bem.',
  'Deixar o celular longe da cama 30 minutos antes de dormir pode ajudar no sono.',
  'Você não precisa dar conta de tudo sozinho(a). Pedir ajuda é uma habilidade.',
  'Mexer o corpo, seja dançando, andando ou alongando, também é cuidar da cabeça.',
  'Comemore pequenas vitórias: terminar uma lição já é um passo.'
];

/* Exercícios de respiração. s = segundos de cada fase. */
MB.BREATH = [
  {
    id: 'calma', name: 'Respiração calma 5-5', emoji: '🌿',
    desc: 'Inspire por 5 segundos e solte por 5. Ritmo constante e suave, bom para qualquer hora do dia.',
    note: 'Respire pelo nariz, sem forçar.',
    phases: [{ k: 'in', label: 'Inspire', s: 5 }, { k: 'out', label: 'Solte', s: 5 }]
  },
  {
    id: 'quadrada', name: 'Respiração quadrada 4-4-4-4', emoji: '🔲',
    desc: 'Quatro tempos iguais: inspirar, segurar, soltar, segurar. Ajuda a focar antes de provas e apresentações.',
    note: 'Se sentir tontura, volte a respirar normalmente.',
    phases: [{ k: 'in', label: 'Inspire', s: 4 }, { k: 'hold', label: 'Segure', s: 4 }, { k: 'out', label: 'Solte', s: 4 }, { k: 'hold', label: 'Segure', s: 4 }]
  },
  {
    id: '478', name: 'Respiração 4-7-8', emoji: '🌙',
    desc: 'Inspirar por 4, segurar por 7 e soltar por 8. Muita gente usa para desacelerar antes de dormir.',
    note: 'Se sentir tontura, pare e respire normalmente.',
    phases: [{ k: 'in', label: 'Inspire', s: 4 }, { k: 'hold', label: 'Segure', s: 7 }, { k: 'out', label: 'Solte', s: 8 }]
  },
  {
    id: 'suspiro', name: 'Expiração longa 4-6', emoji: '🍃',
    desc: 'Soltar o ar por mais tempo do que inspirar costuma dar uma sensação de alívio.',
    note: 'Solte o ar devagar, como se soprasse uma vela.',
    phases: [{ k: 'in', label: 'Inspire', s: 4 }, { k: 'out', label: 'Solte', s: 6 }]
  }
];

/* Práticas guiadas. s = segundos do passo; sem s = você avança quando quiser. */
MB.GUIDED = [
  {
    id: 'grounding', name: 'Ancorar no presente (5-4-3-2-1)', emoji: '🧭', minutes: 3,
    desc: 'Usa os cinco sentidos para trazer a atenção ao aqui e agora. Útil quando a mente está acelerada.',
    steps: [
      { text: 'Sente-se com os pés no chão. Respire fundo uma vez e solte devagar.' },
      { text: 'Olhe ao redor e encontre 5 coisas que você consegue VER. Observe cores e formas.' },
      { text: 'Agora encontre 4 coisas que você pode TOCAR. Sinta a textura de cada uma.' },
      { text: 'Escute com atenção: 3 sons que você consegue OUVIR, perto ou longe.' },
      { text: 'Perceba 2 cheiros ao seu redor. Se não sentir nenhum, lembre de 2 cheiros de que você gosta.' },
      { text: 'Por fim, 1 coisa boa sobre você ou sobre este dia. Pode ser pequena.' },
      { text: 'Respire fundo mais uma vez. Você voltou para o presente.' }
    ]
  },
  {
    id: 'presente', name: 'Atenção ao presente', emoji: '🧘', minutes: 3,
    desc: 'Uma pausa curta para observar a respiração e os sons, sem tentar mudar nada.',
    steps: [
      { s: 15, text: 'Sente-se confortavelmente. Apoie os pés no chão e solte os ombros.' },
      { s: 10, text: 'Se quiser, feche os olhos ou olhe para um ponto à sua frente.' },
      { s: 30, text: 'Perceba sua respiração, sem mudar nada. Sinta o ar entrando e saindo.' },
      { s: 30, text: 'Repare nos sons agora: os mais próximos e os mais distantes.' },
      { s: 30, text: 'Perceba o corpo apoiado: costas, pernas, mãos.' },
      { s: 30, text: 'Se a mente se distrair com pensamentos, tudo bem. Note e volte para a respiração.' },
      { s: 20, text: 'Mais algumas respirações. Inspire e solte devagar.' },
      { s: 15, text: 'Quando estiver pronto(a), movimente os dedos, alongue-se e volte ao seu dia.' }
    ]
  },
  {
    id: 'corpo', name: 'Escaneamento do corpo', emoji: '🌅', minutes: 5,
    desc: 'Passe a atenção por cada parte do corpo, soltando a tensão aos poucos.',
    steps: [
      { s: 25, text: 'Deite ou sente-se confortavelmente. Respire fundo três vezes, soltando o ar devagar.' },
      { s: 35, text: 'Leve a atenção aos pés. Sinta o contato com o chão ou com a cama. Solte qualquer tensão.' },
      { s: 35, text: 'Suba para as pernas: panturrilhas, joelhos, coxas. Deixe-as pesadas e soltas.' },
      { s: 40, text: 'Perceba o quadril e a barriga. A cada expiração, deixe a barriga amolecer.' },
      { s: 40, text: 'Agora o peito e as costas. Sinta o movimento suave da respiração.' },
      { s: 40, text: 'Ombros, braços e mãos. Deixe os ombros descerem, as mãos ficarem moles.' },
      { s: 40, text: 'Pescoço, rosto e testa. Solte a mandíbula, relaxe os olhos.' },
      { s: 30, text: 'Sinta o corpo inteiro, de uma só vez. Respire com calma.' },
      { s: 15, text: 'Quando quiser, mexa os dedos, alongue-se e abra os olhos.' }
    ]
  },
  {
    id: 'gratidao', name: 'Gratidão em 2 minutos', emoji: '🙏', minutes: 2,
    desc: 'Lembrar do que está bom, mesmo nos dias difíceis, ajuda a enxergar além do problema.',
    steps: [
      { s: 15, text: 'Respire fundo e solte devagar. Deixe a mente desacelerar.' },
      { s: 30, text: 'Pense em uma pessoa que fez algo de bom por você. Lembre do que ela fez.' },
      { s: 30, text: 'Lembre de algo simples que foi bom hoje: uma conversa, uma comida, um momento de sossego.' },
      { s: 30, text: 'Pense em algo seu pelo qual você é grato(a): uma qualidade, um esforço, uma conquista.' },
      { s: 15, text: 'Respire fundo mais uma vez e leve esse sentimento com você.' }
    ]
  },
  {
    id: 'estudos', name: 'Pausa entre os estudos', emoji: '📚', minutes: 2,
    desc: 'Para quando você está há muito tempo na frente do caderno ou da tela.',
    steps: [
      { s: 20, text: 'Levante-se, se puder. Beba um pouco de água.' },
      { s: 25, text: 'Gire os ombros devagar para trás, 5 vezes. Depois para frente, 5 vezes.' },
      { s: 25, text: 'Incline a cabeça suavemente para um lado e depois para o outro, sem forçar.' },
      { s: 25, text: 'Abra e feche as mãos algumas vezes. Alongue os punhos com cuidado.' },
      { s: 25, text: 'Olhe para longe, pela janela ou para o fundo da sala, e deixe os olhos descansarem.' }
    ]
  }
];

MB.HELP = [
  { name: 'CVV - Centro de Valorização da Vida', tel: '188', desc: 'Apoio emocional e prevenção do suicídio. Gratuito, 24 horas. Também atende por chat em cvv.org.br.' },
  { name: 'SAMU', tel: '192', desc: 'Emergências de saúde, inclusive crises com risco imediato.' },
  { name: 'Polícia Militar', tel: '190', desc: 'Situações de perigo imediato.' },
  { name: 'Disque 100', tel: '100', desc: 'Denúncias de violência contra crianças e adolescentes. Gratuito.' }
];

/* Palavras que indicam sofrimento intenso. Se aparecerem no diário ou no check-in,
   o app mostra uma mensagem de acolhimento com os contatos de ajuda.
   O texto nunca sai do aparelho. */
MB.RISK = [
  /\bme matar\b/, /\bsuicid/, /\bquero morrer\b/, /\bvou me matar\b/,
  /\bnao quero (mais )?viver\b/, /\bacabar com (tudo|minha vida)\b/,
  /\btirar (a )?minha (propria )?vida\b/, /\bme machucar\b/, /\bme cortar\b/,
  /\bautomutil/, /\bpensando em morrer\b/, /\bdar fim (a|na) (tudo|minha vida)\b/
];

MB.norm = function (s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
};
MB.isRisk = function (text) {
  const t = MB.norm(text);
  return MB.RISK.some(function (r) { return r.test(t); });
};
