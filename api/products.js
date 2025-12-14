module.exports = async (req, res) => {
  try {
    const SHOPIFY_DOMAIN = "lilygraceco.com"; // <-- replace with your domain
    const STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN;

    const {
      search = "",
      category = "",
      colorway = "",
      limit = "12"
    } = req.query;

    const first = Math.min(parseInt(limit || "12", 10), 50);

    // Build a Shopify search string using tags/product type
    // Recommended tags: category:leash, colorway:Maranello Red, etc.
    const queryParts = [];
    if (search) queryParts.push(`title:*${search}* OR tag:*${search}*`);
    if (category) queryParts.push(`tag:category:${category}`);
    if (colorway) queryParts.push(`tag:colorway:${colorway}`);

    const shopifyQueryString = queryParts.length ? queryParts.join(" AND ") : "";

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
              images(first: 3) {
                edges { node { url altText } }
              }
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
        variables: { first, q: shopifyQueryString || null }
      })
    });

    const json = await response.json();

    if (!response.ok || json.errors) {
      return res.status(500).json({
        error: "Shopify query failed",
        shopifyStatus: response.status,
        shopifyErrors: json.errors || null,
        body: json
      });
    }

    // Normalize into a clean list for GPT use
    const products = (json.data.products.edges || []).map(({ node }) => {
      const firstVariant = node.variants.edges?.[0]?.node;
      const firstImage = node.images.edges?.[0]?.node;

      return {
        id: node.id,
        handle: node.handle,
        title: node.title,
        description: node.description,
        category: node.productType || null,
        colorway: (node.tags || []).find(t => t.startsWith("colorway:"))?.replace("colorway:", "") || null,
        collectionHandles: [],
        price: firstVariant ? parseFloat(firstVariant.price.amount) : null,
        currency: firstVariant ? firstVariant.price.currencyCode : "USD",
        inStock: firstVariant ? !!firstVariant.availableForSale : null,
        variants: (node.variants.edges || []).map(({ node: v }) => ({
          id: v.id,
          title: v.title,
          sku: v.sku,
          price: parseFloat(v.price.amount),
          currency: v.price.currencyCode,
          inStock: !!v.availableForSale
        })),
        images: (node.images.edges || []).map(({ node: img }) => ({
          url: img.url,
          altText: img.altText || ""
        })),
        productUrl: `https://${SHOPIFY_DOMAIN.replace(".myshopify.com", "")}.com/products/${node.handle}`,
        tags: node.tags || []
      };
    });

    return res.status(200).json({ products });
  } catch (err) {
    return res.status(500).json({ error: "Function crashed", message: err?.message || String(err) });
  }
};
