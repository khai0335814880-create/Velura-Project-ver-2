import { defineConfig, loadEnv } from "vite";
import { resolve } from "path";
import injectHTML from "vite-plugin-html-inject";
import fs from "node:fs";

const envDirectory = resolve(__dirname, "../..");

export default defineConfig(({ mode }) => {
  const env = { ...process.env, ...loadEnv(mode, envDirectory, "") };
  const serverPort = Number(env.USER_WEB_PORT || 3001);
  const proxyTarget = env.API_PROXY_TARGET || `http://${env.DEV_HOST || "localhost"}:${env.PORT || 8787}`;

  return {
  root: ".",
  envDir: envDirectory,
  publicDir: "public",
  plugins: [injectHTML()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        products: resolve(__dirname, "src/pages/products/list.html"),
        productDetail: resolve(__dirname, "src/pages/products/detail.html"),
        chatbot: resolve(__dirname, "src/pages/chatbot.html"),
        policies: resolve(__dirname, "src/pages/policies.html"),
        offers: resolve(__dirname, "src/pages/offers.html"),
        contact: resolve(__dirname, "src/pages/contact.html"),
        signin: resolve(__dirname, "src/pages/auth/signin.html"),
        signup: resolve(__dirname, "src/pages/auth/signup.html"),
        forgotPassword: resolve(__dirname, "src/pages/auth/forgot-password.html"),
        resetPassword: resolve(__dirname, "src/pages/auth/reset-password.html"),
        authCallback: resolve(__dirname, "src/pages/auth/auth-callback.html"),
        paymentFailed: resolve(__dirname, "src/pages/checkout/payment-failed.html"),
        shippingPayment: resolve(__dirname, "src/pages/checkout/shipping-payment.html"),
        orderConfirm: resolve(__dirname, "src/pages/checkout/order-confirm.html"),
        paymentConfirm: resolve(__dirname, "src/pages/checkout/payment-confirm.html"),
        otpVerify: resolve(__dirname, "src/pages/checkout/otp-verify.html"),
        paymentGuest: resolve(__dirname, "src/pages/checkout/payment-guest.html"),
        paymentUser: resolve(__dirname, "src/pages/checkout/payment-user.html"),
        aiSuggestions: resolve(__dirname, "src/pages/ai/suggestions.html"),
        returnRequest: resolve(__dirname, "src/pages/account/return-request.html"),
        blog: resolve(__dirname, "src/pages/blog/blog.html"),
        blogDetail: resolve(__dirname, "src/pages/blog/blog-detail.html"),
        about: resolve(__dirname, "src/pages/about/about.html"),
        cart: resolve(__dirname, "src/pages/cart/cart.html"),
        trackOrder: resolve(__dirname, "src/pages/account/track-order.html"),
        orderDetail: resolve(__dirname, "src/pages/account/order-detail.html"),
        profile: resolve(__dirname, "src/pages/account/profile.html"),
        styleQuiz: resolve(__dirname, "src/pages/ai/style-quiz.html"),
        myOrders: resolve(__dirname, "src/pages/account/my-orders.html"),
        productReview: resolve(__dirname, "src/pages/account/product-review.html"),
        collections: resolve(__dirname, "src/pages/collections.html"),
        wishlist: resolve(__dirname, "src/pages/wishlist/wishlist.html")
      }
    }
  },
  server: {
    port: serverPort,
    host: true,
    ...(fs.existsSync(resolve(__dirname, "../../certs/key.pem")) ? {
      https: {
        key: fs.readFileSync(resolve(__dirname, "../../certs/key.pem")),
        cert: fs.readFileSync(resolve(__dirname, "../../certs/cert.pem"))
      }
    } : {}),
    proxy: {
      "/api": {
        target: proxyTarget,
        changeOrigin: true,
        secure: false
      },
      "/uploads": {
        target: proxyTarget,
        changeOrigin: true,
        secure: false
      }
    },
    open: "/src/pages/auth/signin.html"
  }
  };
});
