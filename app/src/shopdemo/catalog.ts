export interface Product {
  readonly id: string
  readonly name: string
  readonly price: number
  readonly rating: number
  readonly reviews: number
  /** File in public/images/shop/ (photo credits are in CREDITS.md next to them). */
  readonly image: string
}

/** The products on the demo shop's page. Names are real products; prices and ratings are made up. */
export const PRODUCTS: readonly Product[] = [
  { id: 'phone', name: 'Tecno Spark 20 smartphone', price: 139, rating: 4.4, reviews: 1280, image: 'phone.jpg' },
  { id: 'earphones', name: 'Sony WI-XB400 wireless earphones', price: 59, rating: 4.5, reviews: 864, image: 'earphones.jpg' },
  { id: 'shoes', name: 'Avia running shoes', price: 45, rating: 4.2, reviews: 412, image: 'shoes.jpg' },
  { id: 'watch-digital', name: 'Casio G-Shock DW-5600E', price: 99, rating: 4.8, reviews: 2210, image: 'watch-digital.jpg' },
  { id: 'watch-classic', name: 'Casio F-91W classic watch', price: 19, rating: 4.6, reviews: 5320, image: 'watch-classic.jpg' },
  { id: 'laptop', name: 'Lenovo IdeaPad laptop', price: 499, rating: 4.3, reviews: 397, image: 'laptop.jpg' },
]
