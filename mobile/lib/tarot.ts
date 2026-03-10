import tarotGr from './tarot-gr.json';

// ── Greek name lookup ─────────────────────────────────────────────────────────

const EN_TO_GR: Record<string, string> = {};
for (const entry of tarotGr) {
  if (entry.name_en && !EN_TO_GR[entry.name_en]) {
    EN_TO_GR[entry.name_en] = entry.name_el;
  }
}

export function getCardDisplayName(nameEn: string): string {
  return EN_TO_GR[nameEn] ?? nameEn;
}

// ── Static image map (Metro requires static require() calls) ──────────────────

// eslint-disable-next-line @typescript-eslint/no-var-requires
const IMAGE_MAP: Record<string, any> = {
  // Major Arcana
  'The Fool':           require('../assets/tarot/0. The Fool.jpg'),
  'The Magician':       require('../assets/tarot/1. The Magician.jpg'),
  'The High Priestess': require('../assets/tarot/2. The High Priestess.jpg'),
  'The Empress':        require('../assets/tarot/3. The Empress.jpg'),
  'The Emperor':        require('../assets/tarot/4. The Emperor.jpg'),
  'The Hierophant':     require('../assets/tarot/5. The Hierophant.jpg'),
  'The Lovers':         require('../assets/tarot/6. The Lovers.jpg'),
  'The Chariot':        require('../assets/tarot/7. The Chariot.jpg'),
  'Strength':           require('../assets/tarot/8. Strength.jpg'),
  'The Hermit':         require('../assets/tarot/9. The Hermit.jpg'),
  'Wheel of Fortune':   require('../assets/tarot/10. The Wheel of Fortune.jpg'),
  'Justice':            require('../assets/tarot/11. Justice.jpg'),
  'The Hanged Man':     require('../assets/tarot/12. The Hanged Man.jpg'),
  'Death':              require('../assets/tarot/13. Death.jpg'),
  'Temperance':         require('../assets/tarot/14. Temperance.jpg'),
  'The Devil':          require('../assets/tarot/15. The Devil.jpg'),
  'The Tower':          require('../assets/tarot/16. The Tower.jpg'),
  'The Star':           require('../assets/tarot/17. The Star.jpg'),
  'The Moon':           require('../assets/tarot/18. The Moon.jpg'),
  'The Sun':            require('../assets/tarot/19. The Sun.jpg'),
  'Judgement':          require('../assets/tarot/20. Judgement.jpg'),
  'The World':          require('../assets/tarot/22. The World.jpg'),
  // Minor Arcana — Cups
  'Ace of Cups':    require('../assets/tarot/Ace of Cups.jpg'),
  'Two of Cups':    require('../assets/tarot/Two of Cups.jpg'),
  'Three of Cups':  require('../assets/tarot/Three of Cups.jpg'),
  'Four of Cups':   require('../assets/tarot/Four of Cups.jpg'),
  'Five of Cups':   require('../assets/tarot/Five of Cups.jpg'),
  'Six of Cups':    require('../assets/tarot/Six of Cups.jpg'),
  'Seven of Cups':  require('../assets/tarot/Seven of Cups.jpg'),
  'Eight of Cups':  require('../assets/tarot/Eight of Cups.jpg'),
  'Nine of Cups':   require('../assets/tarot/Nine of Cups.jpg'),
  'Ten of Cups':    require('../assets/tarot/Ten of Cups.jpg'),
  'Page of Cups':   require('../assets/tarot/Page of Cups.jpg'),
  'Knight of Cups': require('../assets/tarot/Knight of Cups.jpg'),
  'Queen of Cups':  require('../assets/tarot/Queen of Cups.jpg'),
  'King of Cups':   require('../assets/tarot/King of Cups.jpg'),
  // Minor Arcana — Pentacles
  'Ace of Pentacles':    require('../assets/tarot/Ace of Pentacles.jpg'),
  'Two of Pentacles':    require('../assets/tarot/Two of Pentacles.jpg'),
  'Three of Pentacles':  require('../assets/tarot/Three of Pentacles.jpg'),
  'Four of Pentacles':   require('../assets/tarot/Four of Pentacles.jpg'),
  'Five of Pentacles':   require('../assets/tarot/Five of Pentacles.jpg'),
  'Six of Pentacles':    require('../assets/tarot/Six of Pentacles.jpg'),
  'Seven of Pentacles':  require('../assets/tarot/Seven of Pentacles.jpg'),
  'Eight of Pentacles':  require('../assets/tarot/Eight of Pentacles.jpg'),
  'Nine of Pentacles':   require('../assets/tarot/Nine of Pentacles.jpg'),
  'Ten of Pentacles':    require('../assets/tarot/Ten of Pentacles.jpg'),
  'Page of Pentacles':   require('../assets/tarot/Page of Pentacles.jpg'),
  'Knight of Pentacles': require('../assets/tarot/Knight of Pentacles.jpg'),
  'Queen of Pentacles':  require('../assets/tarot/Queen of Pentacles.jpg'),
  'King of Pentacles':   require('../assets/tarot/King of Pentacles.jpg'),
  // Minor Arcana — Swords
  'Ace of Swords':    require('../assets/tarot/Ace of Swords.jpg'),
  'Two of Swords':    require('../assets/tarot/Two of Swords.jpg'),
  'Three of Swords':  require('../assets/tarot/Three of Swords.jpg'),
  'Four of Swords':   require('../assets/tarot/Four of Swords.jpg'),
  'Five of Swords':   require('../assets/tarot/Five of Swords.jpg'),
  'Six of Swords':    require('../assets/tarot/Six of Swords.jpg'),
  'Seven of Swords':  require('../assets/tarot/Seven of Swords.jpg'),
  'Eight of Swords':  require('../assets/tarot/Eight of Swords.jpg'),
  'Nine of Swords':   require('../assets/tarot/Nine of Swords.jpg'),
  'Ten of Swords':    require('../assets/tarot/Ten of Swords.jpg'),
  'Page of Swords':   require('../assets/tarot/Page of Swords.jpg'),
  'Knight of Swords': require('../assets/tarot/Knight of Swords.jpg'),
  'Queen of Swords':  require('../assets/tarot/Queen of Swords.jpg'),
  'King of Swords':   require('../assets/tarot/King of Swords.jpg'),
  // Minor Arcana — Wands
  'Ace of Wands':    require('../assets/tarot/Ace of Wands.jpg'),
  'Two of Wands':    require('../assets/tarot/Two of Wands.jpg'),
  'Three of Wands':  require('../assets/tarot/Three of Wands.jpg'),
  'Four of Wands':   require('../assets/tarot/Four of Wands.jpg'),
  'Five of Wands':   require('../assets/tarot/Five of Wands.jpg'),
  'Six of Wands':    require('../assets/tarot/Six of Wands.jpg'),
  'Seven of Wands':  require('../assets/tarot/Seven of Wands.jpg'),
  'Eight of Wands':  require('../assets/tarot/Eight of Wands.jpg'),
  'Nine of Wands':   require('../assets/tarot/Nine of Wands.jpg'),
  'Ten of Wands':    require('../assets/tarot/Ten of Wands.jpg'),
  'Page of Wands':   require('../assets/tarot/Page of Wands.jpg'),
  'Knight of Wands': require('../assets/tarot/Knight of Wands.jpg'),
  'Queen of Wands':  require('../assets/tarot/Queen of Wands.jpg'),
  'King of Wands':   require('../assets/tarot/King of Wands.jpg'),
};

export function getCardImageSource(cardName: string): any {
  return IMAGE_MAP[cardName] ?? null;
}
