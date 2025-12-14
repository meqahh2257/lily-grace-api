module.exports = async (req, res) => {
  try {
    const SHOPIFY_DOMAIN = "lilygraceco.com"; // <-- change this
    const STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN;
    const category = (req.query.category || "backpack").trim();
    const colorway = (req.query.colorway || "Tuxedo Black").trim();
    const category = (req.query.category || "clutch").trim();
    const colorway = (req.query.colorway || "Airlie Blue").trim();
    const category = (req.query.category || "tote").trim();
    const colorway = (req.query.colorway || "Rose Petal Pink").trim();
    const category = (req.query.category || "collar").trim();
    const colorway = (req.query.colorway || "Lemon Yellow").trim();
    const category = (req.query.category || "harness").trim();
    const colorway = (req.query.colorway || "Lily Grace Blue").trim();
    const category = (req.query.category || "set").trim();
    const category = (req.query.category || "wristlet").trim();
    const category = (req.query.category || "leash").trim();
    const category = (req.query.category || "phonebag").trim();


   const search = (req.query.search || "").trim();
const category = (req.query.category || "").trim();
const colorway = (req.query.colorway || "").trim();
const limit = Math.min(parseInt(req.query.limit || "12", 10), 50);

// 👉 THIS is the Shopify search builder
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
