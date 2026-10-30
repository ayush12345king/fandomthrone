// Every board and its starting contenders. Names only: no logos, photos or official marks.
export const BOARDS = [
  {
    id: 'ipl', name: 'IPL teams', color: '#1E7A46', ink: '#FFFFFF',
    blurb: 'Ten franchises. One throne. Whose fans pay up?',
    seeds: ['Chennai Super Kings', 'Mumbai Indians', 'Royal Challengers Bengaluru', 'Kolkata Knight Riders',
      'Sunrisers Hyderabad', 'Rajasthan Royals', 'Delhi Capitals', 'Punjab Kings', 'Lucknow Super Giants', 'Gujarat Titans'],
  },
  {
    id: 'cricketers', name: 'Cricketers', color: '#0B4F9C', ink: '#FFFFFF',
    blurb: 'King, Hitman, Thala or someone else entirely.',
    seeds: ['Virat Kohli', 'Rohit Sharma', 'MS Dhoni', 'Jasprit Bumrah', 'Shubman Gill', 'Babar Azam',
      'Joe Root', 'Steve Smith', 'Pat Cummins', 'Rashid Khan'],
  },
  {
    id: 'kpop', name: 'K-pop groups', color: '#E5368B', ink: '#FFFFFF',
    blurb: 'Streaming wins awards. This wins the throne.',
    seeds: ['BTS', 'BLACKPINK', 'Stray Kids', 'SEVENTEEN', 'TWICE', 'aespa', 'ENHYPEN', 'ATEEZ', 'IVE', 'LE SSERAFIM'],
  },
  {
    id: 'anime', name: 'Anime characters', color: '#F26B1D', ink: '#15172B',
    blurb: 'Power levels mean nothing here. Wallets do.',
    seeds: ['Goku', 'Monkey D. Luffy', 'Naruto Uzumaki', 'Gojo Satoru', 'Levi Ackerman', 'Roronoa Zoro',
      'Eren Yeager', 'Tanjiro Kamado', 'Itachi Uchiha', 'Light Yagami'],
  },
  {
    id: 'football', name: 'Football clubs', color: '#C81E2B', ink: '#FFFFFF',
    blurb: 'Trophies are history. The throne is right now.',
    seeds: ['Real Madrid', 'Barcelona', 'Manchester United', 'Manchester City', 'Liverpool', 'Arsenal',
      'Chelsea', 'Bayern Munich', 'Paris Saint-Germain', 'Juventus'],
  },
  {
    id: 'bollywood', name: 'Bollywood stars', color: '#7A2BC9', ink: '#FFFFFF',
    blurb: 'Box office is one number. This is another.',
    seeds: ['Shah Rukh Khan', 'Salman Khan', 'Aamir Khan', 'Ranbir Kapoor', 'Hrithik Roshan', 'Deepika Padukone',
      'Alia Bhatt', 'Prabhas', 'Allu Arjun', 'Akshay Kumar'],
  },
  {
    id: 'f1', name: 'F1 drivers', color: '#23262F', ink: '#F2B705',
    blurb: 'Pole position, paid for by the grandstand.',
    seeds: ['Max Verstappen', 'Lewis Hamilton', 'Charles Leclerc', 'Lando Norris', 'Oscar Piastri',
      'George Russell', 'Fernando Alonso', 'Carlos Sainz'],
  },
];

export function slugify(s) {
  return String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'x';
}

export function getBoard(id) {
  return BOARDS.find((b) => b.id === id) || null;
}

export function seedList(board) {
  return board.seeds.map((name, i) => ({ id: slugify(name), name, order: i }));
}
