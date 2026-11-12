/**
 * Select único para listagem e detalhe de cupons no admin.
 * O hint `products!discount_coupon_products_product_id_fkey` é obrigatório no PostgREST
 * para embutir `products` dentro de `discount_coupon_products` sem conflito com `products:product_id`.
 */
export const COUPON_ADMIN_SELECT = `
  *,
  products:product_id ( id, name, ref ),
  prices:price_id ( id, amount, currency ),
  discount_coupon_products (
    product_id,
    products!discount_coupon_products_product_id_fkey ( id, name, ref )
  ),
  discount_coupon_prices (
    price_id,
    prices!discount_coupon_prices_price_id_fkey ( id, amount, currency, product_id )
  )
`
