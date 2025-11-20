import Stripe from "stripe";
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY); // pode por sua chave secreta direto

export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment", // Único pagamento (produto teste)
        line_items: [
          {
            price: "price_1SVhWiKAfVdjPCM9fGdWRzZx", // coloque aqui o PRICE_ID do produto teste
            quantity: 1,
          },
        ],
        success_url: `${req.headers.origin}/success`,
        cancel_url: `${req.headers.origin}/cancel`,
      });
      res.status(200).json({ url: session.url });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    res.setHeader("Allow", "POST");
    res.status(405).end("Method Not Allowed");
  }
}
