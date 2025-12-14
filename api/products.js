export default async function handler(req, res) {
  const SHOPIFY_DOMAIN = "lilygraceco.com";
  const STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN;

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

  const response = await fetch(
    \`https://${SHOPIFY_DOMAIN}/api/2024-01/graphql.json\`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": STOREFRONT_TOKEN
      },
      body: JSON.stringify({ query })
    }
  );

  const data = await response.json();
  res.status(200).json(data);
}
