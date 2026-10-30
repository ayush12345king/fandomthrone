// Every board, its starting contenders and their crest colours [name, primary, secondary, pattern?].
// Names only: no logos, photos or official artwork. Colours are used for original crests.
export const BOARDS = [
  {
    id: 'ipl', name: 'IPL teams', short: 'IPL', color: '#1E7A46', ink: '#FFFFFF',
    blurb: 'Ten franchises. One throne. Whose fans pay up?',
    seeds: [
      ['Chennai Super Kings', '#F9CD05', '#1A3E8C'], ['Mumbai Indians', '#004BA0', '#D1AB3E'],
      ['Royal Challengers Bengaluru', '#D11F2F', '#1C1C1C', 'half'], ['Kolkata Knight Riders', '#3A225D', '#D4B53B'],
      ['Sunrisers Hyderabad', '#F26522', '#111111', 'sash'], ['Rajasthan Royals', '#EA1A85', '#254AA5'],
      ['Delhi Capitals', '#17449B', '#EF1B23', 'sash'], ['Punjab Kings', '#DD1F2D', '#C0C2C4'],
      ['Lucknow Super Giants', '#0B3D91', '#F28B00'], ['Gujarat Titans', '#1B2133', '#C8A951'],
    ],
    rivalries: [['mumbai-indians', 'chennai-super-kings'], ['royal-challengers-bengaluru', 'chennai-super-kings']],
  },
  {
    id: 'cricketers', name: 'Cricketers', short: 'Cricket', color: '#0B4F9C', ink: '#FFFFFF',
    blurb: 'King, Hitman, Thala or someone else entirely.',
    seeds: [
      ['Virat Kohli', '#1C4FA1', '#FF9933'], ['Rohit Sharma', '#1C4FA1', '#FF9933', 'sash'], ['MS Dhoni', '#1C4FA1', '#F9CD05'],
      ['Jasprit Bumrah', '#1C4FA1', '#FFFFFF', 'half'], ['Shubman Gill', '#1C4FA1', '#FF9933', 'stripes'],
      ['Babar Azam', '#01411C', '#FFFFFF'], ['Joe Root', '#1A2C5B', '#CE1124'], ['Steve Smith', '#FFCD00', '#00843D'],
      ['Pat Cummins', '#00843D', '#FFCD00'], ['Rashid Khan', '#0066B3', '#D32011'],
    ],
    rivalries: [['virat-kohli', 'babar-azam'], ['ms-dhoni', 'rohit-sharma']],
  },
  {
    id: 'kpop', name: 'K-pop groups', short: 'K-pop', color: '#E5368B', ink: '#FFFFFF',
    blurb: 'Streaming wins awards. This wins the throne.',
    seeds: [
      ['BTS', '#7B4AE2', '#F2F0FF'], ['BLACKPINK', '#111111', '#F7A8C4', 'half', 'BP'], ['Stray Kids', '#E4002B', '#111111', 'sash'],
      ['SEVENTEEN', '#F7CAC9', '#92A8D1', 'half', 'SVT'], ['TWICE', '#FF5FA2', '#FCC89B'], ['aespa', '#A6A6FF', '#1B1B2F'],
      ['ENHYPEN', '#1A1A1A', '#E2232A', 'stripes', 'EN-'], ['ATEEZ', '#F06B20', '#111111'], ['IVE', '#E3122B', '#FFFFFF', 'sash'],
      ['LE SSERAFIM', '#2E3A8C', '#D9D9E3'],
    ],
    rivalries: [['bts', 'stray-kids'], ['blackpink', 'twice']],
  },
  {
    id: 'anime', name: 'Anime characters', short: 'Anime', color: '#F26B1D', ink: '#15172B',
    blurb: 'Power levels mean nothing here. Wallets do.',
    seeds: [
      ['Goku', '#F58220', '#1D4FA0', 'half'], ['Monkey D. Luffy', '#D62828', '#F4C542', 'solid', 'LUFFY'], ['Naruto Uzumaki', '#F5821F', '#1A1A1A', 'sash'],
      ['Gojo Satoru', '#1E1F33', '#7FD3FF'], ['Levi Ackerman', '#3F5A3C', '#E8E2D0'], ['Roronoa Zoro', '#2E7D32', '#111111', 'sash'],
      ['Eren Yeager', '#5B4636', '#C9A227'], ['Tanjiro Kamado', '#1B7F5B', '#111111', 'checker'], ['Itachi Uchiha', '#B71C1C', '#111111', 'half'],
      ['Light Yagami', '#2B2B2B', '#E8E8E8', 'stripes'],
    ],
    rivalries: [['goku', 'monkey-d-luffy'], ['gojo-satoru', 'itachi-uchiha']],
  },
  {
    id: 'football', name: 'Football clubs', short: 'Football', color: '#C81E2B', ink: '#FFFFFF',
    blurb: 'Trophies are history. The throne is right now.',
    seeds: [
      ['Real Madrid', '#FFFFFF', '#C9A13B'], ['Barcelona', '#A50044', '#004D98', 'stripes', 'FCB'], ['Manchester United', '#DA291C', '#111111', 'solid', 'MUFC'],
      ['Manchester City', '#6CABDD', '#1C2C5B', 'solid', 'MCFC'], ['Liverpool', '#C8102E', '#00B2A9', 'solid', 'LFC'], ['Arsenal', '#EF0107', '#FFFFFF', 'half', 'AFC'],
      ['Chelsea', '#034694', '#FFFFFF', 'solid', 'CFC'], ['Bayern Munich', '#DC052D', '#0066B2', 'solid', 'FCB'], ['Paris Saint-Germain', '#004170', '#DA291C', 'stripes'],
      ['Juventus', '#111111', '#FFFFFF', 'stripes', 'JUV'],
    ],
    rivalries: [['real-madrid', 'barcelona'], ['manchester-united', 'liverpool'], ['arsenal', 'chelsea']],
  },
  {
    id: 'bollywood', name: 'Bollywood stars', short: 'Bollywood', color: '#7A2BC9', ink: '#FFFFFF',
    blurb: 'Box office is one number. This is another.',
    seeds: [
      ['Shah Rukh Khan', '#1F1147', '#F2B705'], ['Salman Khan', '#0E5A8A', '#E8E8E8'], ['Aamir Khan', '#7A1F1F', '#F4E3C1'],
      ['Ranbir Kapoor', '#2F2F2F', '#E35D2E', 'sash'], ['Hrithik Roshan', '#0F3D3E', '#C9A227'], ['Deepika Padukone', '#8E1B4B', '#F6D1C1'],
      ['Alia Bhatt', '#F28AB2', '#3B1E54'], ['Prabhas', '#5A2A0C', '#E0A43A', 'half'], ['Allu Arjun', '#B3261E', '#F2C14E', 'sash'],
      ['Akshay Kumar', '#1D3557', '#E63946'],
    ],
    rivalries: [['shah-rukh-khan', 'salman-khan'], ['prabhas', 'allu-arjun']],
  },
  {
    id: 'f1', name: 'F1 drivers', short: 'F1', color: '#23262F', ink: '#F2B705',
    blurb: 'Pole position, paid for by the grandstand.',
    seeds: [
      ['Max Verstappen', '#1E2A5A', '#E41E2B', 'sash'], ['Lewis Hamilton', '#E8002D', '#FFE600'], ['Charles Leclerc', '#E8002D', '#FFFFFF', 'half'],
      ['Lando Norris', '#FF8000', '#111111'], ['Oscar Piastri', '#FF8000', '#1C3F94', 'sash'], ['George Russell', '#111111', '#27F4D2', 'half'],
      ['Fernando Alonso', '#00594F', '#CEDC00'], ['Carlos Sainz', '#041E42', '#64C4FF', 'sash'],
    ],
    rivalries: [['max-verstappen', 'lewis-hamilton'], ['lando-norris', 'oscar-piastri']],
  },
];

export function slugify(s) {
  return String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'x';
}

export function getBoard(id) {
  return BOARDS.find((b) => b.id === id) || null;
}

// Colours for fan-added names, picked from the name so they stay stable.
const PALETTE = [
  ['#E63946', '#1D3557'], ['#2A9D8F', '#F4A261'], ['#6A4C93', '#FFCA3A'], ['#1982C4', '#FF595E'], ['#8AC926', '#1B1B2F'],
  ['#FF7B00', '#3A0CA3'], ['#F72585', '#4CC9F0'], ['#06D6A0', '#073B4C'], ['#118AB2', '#FFD166'], ['#9D0208', '#FFBA08'],
];
const PATTERNS = ['solid', 'half', 'sash', 'stripes'];
export function colorsFor(name) {
  let h = 0;
  for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const [c1, c2] = PALETTE[h % PALETTE.length];
  return { c1, c2, pattern: PATTERNS[(h >> 4) % PATTERNS.length] };
}

export function seedList(board) {
  return board.seeds.map(([name, c1, c2, pattern, abbr], i) => ({ id: slugify(name), name, order: i, c1, c2, pattern: pattern || 'solid', abbr }));
}
