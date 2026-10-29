export interface Review {
  readonly rating: number
  readonly text: string
}

export interface Product {
  readonly id: string
  readonly name: string
  readonly price: number
  /** Lower-case words that identify the product in a customer's message. */
  readonly keywords: readonly string[]
  readonly specs: readonly string[]
  readonly reviews: readonly Review[]
}

const PRODUCTS: readonly Product[] = [
  {
    id: 'phone', name: 'Tecno Spark 20 smartphone', price: 139, keywords: ['tecno', 'spark', 'phone'],
    specs: ['6.6 inch display', '5000 mAh battery', '128 GB storage', '8 GB RAM', '50 MP main camera', 'dual SIM', 'no NFC', 'fast charging 18 W'],
    reviews: [
      { rating: 5, text: 'Battery lasts two days and the screen is bright. Great value for the price.' },
      { rating: 4, text: 'Camera is good in daylight but photos get grainy at night.' },
      { rating: 2, text: 'No NFC, so I cannot pay by tapping my phone. Charger got warm.' },
      { rating: 4, text: 'Fast, plenty of storage, dual SIM is handy for travel.' },
    ],
  },
  {
    id: 'earphones', name: 'Sony WI-XB400 wireless earphones', price: 59, keywords: ['sony', 'earphones', 'earphone', 'earbuds', 'headphones'],
    specs: ['neckband style', 'up to 15 hours of battery', 'Bluetooth 5.0', 'deep bass', 'splash resistant', 'built-in microphone'],
    reviews: [
      { rating: 5, text: 'Sound is amazing for the price and the bass is deep.' },
      { rating: 4, text: 'Comfortable for long walks. Battery easily lasts a work week of commuting.' },
      { rating: 3, text: 'The left earbud cable started to fray after four months.' },
      { rating: 5, text: 'Great for the gym, they survived sweat and light rain.' },
    ],
  },
  {
    id: 'shoes', name: 'Avia running shoes', price: 45, keywords: ['avia', 'shoes', 'running shoes', 'sneakers', 'trainers'],
    specs: ['lightweight mesh upper', 'cushioned sole', 'sizes 38 to 46', 'blue and black'],
    reviews: [
      { rating: 4, text: 'Light and comfortable for short runs. Looks good.' },
      { rating: 2, text: 'The stitching split at the heel after three weeks.' },
      { rating: 3, text: 'Fine for walking, the sole wears quickly on rough roads.' },
      { rating: 1, text: 'One shoe came apart at the seam. Feels cheap.' },
    ],
  },
  {
    id: 'watch-digital', name: 'Casio G-Shock DW-5600E', price: 99, keywords: ['g-shock', 'gshock', 'dw-5600', 'dw5600'],
    specs: ['shock resistant', '200 m water resistance', 'stopwatch and countdown timer', 'backlight', 'battery life about 2 years', 'resin strap'],
    reviews: [
      { rating: 5, text: 'Survived a drop on concrete without a scratch. Brilliant for running and hiking.' },
      { rating: 5, text: 'Stopwatch and lap timer are easy to use while running.' },
      { rating: 4, text: 'Chunky on a small wrist but very tough.' },
    ],
  },
  {
    id: 'watch-classic', name: 'Casio F-91W classic watch', price: 19, keywords: ['f-91w', 'f91w', 'classic watch', 'f-91'],
    specs: ['water resistant to splashes only', 'stopwatch', 'daily alarm', 'battery life about 7 years', 'lightweight resin case'],
    reviews: [
      { rating: 5, text: 'Light, cheap and the battery just keeps going. A classic.' },
      { rating: 4, text: 'Fine for runs, though the buttons are small with sweaty fingers.' },
      { rating: 3, text: 'Not for swimming. It fogged up after a dive.' },
    ],
  },
  {
    id: 'laptop', name: 'Lenovo IdeaPad laptop', price: 499, keywords: ['lenovo', 'ideapad', 'laptop'],
    specs: ['15.6 inch Full HD display', '8 GB RAM', '256 GB SSD', 'about 6 hours of battery', '1.9 kg', 'HDMI and USB-C'],
    reviews: [
      { rating: 4, text: 'Good for office work and video calls. The keyboard is comfortable.' },
      { rating: 2, text: 'Battery barely gets 4 hours with the screen bright. Fan is noisy.' },
      { rating: 3, text: 'Fine for the price but a bit heavy to carry every day.' },
    ],
  },
]

/** The shop's catalogue: specs and customer reviews, searchable by what a customer writes. */
export class ProductCatalog {
  private readonly products: readonly Product[]

  constructor(products: readonly Product[] = PRODUCTS) {
    this.products = products
  }

  /** Up to two products the text seems to be about (a comparison mentions two). */
  search(text: string): Product[] {
    const lower = text.toLowerCase()
    return this.products
      .map((p) => ({ p, score: p.keywords.filter((k) => lower.includes(k)).length }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map((x) => x.p)
  }

  /** The specs as plain text for a model. */
  describe(product: Product): string {
    return `${product.name}, $${product.price}. Specs: ${product.specs.join('; ')}.`
  }

  /** The reviews as plain text for a model. */
  reviewsOf(product: Product): string {
    return product.reviews.map((r) => `${r.rating}/5: ${r.text}`).join('\n')
  }
}
