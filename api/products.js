module.exports = async (req, res) => {
  try {
    // IMPORTANT: use your Shopify *.myshopify.com domain here (NOT lilygraceco.com)
    // Example: "lily-grace-co.myshopify.com"
    const SHOPIFY_DOMAIN = "www.lilygraceco.com"; // <-- replace this
    const STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN;

    if (!STOREFRONT_TOKEN) {
      return res.status(400).json({ error: "Missing SHOPIFY_STOREFRONT_TOKEN env var" });
    }

    // Read query parameters from the URL
    const search = (req.query.search || "").trim();
    const category = (req.query.category || "").trim();   // expects tags like category:leash
    const colorway = (req.query.colorway || "").trim();   // expects tags like colorway:Lemon Yellow
    const limit = Math.min(parseInt(req.query.limit || "12", 10), 50);

    // Build Shopify query string
    const parts = [];

    if (search) {
      parts.push(`title:*${search}* OR tag:*${search}* OR product_type:*${search}*`);
    }
    if (category) {
      parts.push(`tag:category:${category}`);
    }
    if (colorway) {
      parts.push(`tag:colorway:${colorway}`);
    }

    const shopifySearch = parts.length ? parts.join(" AND ") : null;

    // Shopify Storefront API GraphQL query
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
        // IMPORTANT: replace with your real customer-facing domain:
        productUrl: `https://lilygraceco.com/products/${node.handle}`,
        tags: node.tags || []
      };
    });

    // Debug output so you can see what filters were applied
    return res.status(200).json({
      version: "v3-filters",
      queryReceived: req.query,
      shopifySearch,
      count: products.length,
      products
    });
  } catch (err) {
    return res.status(500).json({
      error: "Function crashed",
      message: err?.message || String(err)
    });
  }
};
