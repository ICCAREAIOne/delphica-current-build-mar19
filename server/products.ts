/**
 * Stripe Products Configuration
 * 
 * Patient Portal Subscription: $15/month
 */

export const PRODUCTS = {
  PATIENT_PORTAL_MONTHLY: {
    name: "Patient Portal Access",
    description: "Monthly subscription to ICCare AI Patient Portal with daily check-ins, progress tracking, and physician communication",
    priceInCents: 1500, // $15.00
    currency: "usd",
    interval: "month" as const,
    features: [
      "Daily AI-powered health check-ins",
      "Progress tracking and visualization",
      "Lab result upload and analysis",
      "Secure physician communication",
      "Personalized care plan access",
      "Outcome tracking and surveys",
    ],
  },
} as const;

export type ProductKey = keyof typeof PRODUCTS;
