module.exports = async (req, res) => {
  try {
    const SHOPIFY_DOMAIN = "YOUR-STORE.myshopify.com"; // <-- replace this
    const STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN;

    if (!SHOPIFY_DOMAIN || SHOPIFY_DOMAIN.includes("YOUR-STORE")) {
      return res.status(400).json({
        error: "SHOPIFY_DOMAIN is not set correctly in api/products.js"
      });
    }

    if (!STOREFRONT_TOKEN) {
      return res.status(400).json({
        error: "Missing SHOPIFY_STOREFRONT_TOKEN env var in Vercel (and redeploy)."
      });
    }

    const query = `
      {
        products(first: 10) {
          edges {
            node {
              id
              title
              handle
              description
              images(first: 1) {
                edges {
                  node {
                    url
                    altText
                  }
                }
              }
              variants(first: 1) {
                edges {
                  node {
                    price {
                      amount
                      currencyCode
                    }
                    availableForSale
                  }
                }
              }
            }
          }
        }
      }
    `;

    const shopifyRes = await fetch(
      `https://${SHOPIFY_DOMAIN}/api/2024-01/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": STOREFRONT_TOKEN
        },
        body: JSON.stringify({ query })
      }
    );

    const text = await shopifyRes.text();

    // If Shopify returns non-200, show the response body (super helpful)
    if (!shopifyRes.ok) {
      return res.status(shopifyRes.status).json({
        error: "Shopify request failed",
        status: shopifyRes.status,
        body: text
      });
    }

    // Shopify response is JSON; parse it safely
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return res.status(500).json({
        error: "Shopify returned non-JSON response",
        body: text
      });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({
      error: "Function crashed",
      message: err?.message || String(err)
    });
  }
};
