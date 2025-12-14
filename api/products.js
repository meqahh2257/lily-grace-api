module.exports = async (req, res) => {
  try {
    const SHOPIFY_DOMAIN = "lilygraceco.com"; // <-- change this
    const STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN;

    const search = (req.query.search || "").trim();
    const limit = Math.min(parseInt(req.query.limit || "12", 10), 50);

    // Simple Shopify search: works even if you have ZERO tags set up
    // It searches title/description for the word(s) you type.
    const shopifySearch = search ? search : null;

    const query = `
      query Products($first: Int!, $q: String) {
        products(first: $first, query: $q) {
          edges {
            node {
              id
              title
              handle
              description
              tags
              productType
              images(first: 3) { edges { node { url altText } } }
              variants(first: 10) {
                edges {
                  node {
                    id
                    title
                    sku
                    availableForSale
                    price { amount currencyCode }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const response = await fetch(`https://${SHOPIFY_DOMAIN}/api/2024-01/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": STOREFRONT_TOKEN
      },
      body: JSON.stringify({
        query,
        variables: { first: limit, q: shopifySearch }
      })
    });

    const json = await response.json();

    if (!response.ok || json.errors) {
      return res.status(500).json({
        error: "Shopify query failed",
        shopifyStatus: response.status,
        shopifyErrors: json.errors || null
      });
    }

    const products = (json.data.products.edges || []).map(({ node }) => {
      const firstVariant = node.variants.edges?.[0]?.node;

      return {
        id: node.id,
        handle: node.handle,
        title: node.title,
        description: node.description,
        productType: node.productType || null,
        price: firstVariant ? Number(firstVariant.price.amount) : null,
        currency: firstVariant ? firstVariant.price.currencyCode : "USD",
        inStock: firstVariant ? !!firstVariant.availableForSale : null,
        images: (node.images.edges || []).map(({ node: img }) => ({
          url: img.url,
          altText: img.altText || ""
        })),
        productUrl: `https://YOUR-STOREFRONT-DOMAIN.com/products/${node.handle}`,
        tags: node.tags || []
      };
    });
return res.status(200).json({ version: "v2-search", queryReceived: req.query, products });

    return res.status(200).json({ products });
  } catch (err) {
    return res.status(500).json({
      error: "Function crashed",
      message: err?.message || String(err)
    });
  }
};
