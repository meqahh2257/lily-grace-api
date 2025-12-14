module.exports = async (req, res) => {
  res.status(200).json({
    vercelEnv: process.env.VERCEL_ENV || null,          // "production" or "preview"
    hasStorefrontToken: !!process.env.SHOPIFY_STOREFRONT_TOKEN
  });
};
