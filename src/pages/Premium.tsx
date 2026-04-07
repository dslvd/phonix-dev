import { useState } from "react";
import { motion } from "framer-motion";
import Card from "../components/Card";
import NavigationHeader from "../components/NavigationHeader";
import { Page } from "../App";
import { usePremium } from "../lib/usePremium";

interface PremiumProps {
  navigate: (page: Page) => void;
  premium: ReturnType<typeof usePremium>;
}

export default function Premium({ navigate, premium }: PremiumProps) {
  const { purchase, loading, restore, purchasing, restoring, error, isPremium } = premium;
  const [restoreSuccess, setRestoreSuccess] = useState(false);

  const handleUnlockPremium = async () => {
    if (loading || purchasing || isPremium) return;

    const ok = await purchase();
    if (!ok) return;
  };

  const handleRestore = async () => {
    setRestoreSuccess(false);

    const ok = await restore();

    if (ok) {
      setRestoreSuccess(true);
    }
  };

  const features = [
    {
      icon: "🔋",
      title: "Unlimited Batteries",
      description: "Make mistakes while learning without ever running out of batteries!",
      gradient: "from-[#7ed6ff] to-[#56b8e8]",
    },
    {
      icon: "📄",
      title: "Document Translation",
      description: "Translate entire documents and text passages",
      gradient: "from-[#FF9126] to-[#FF9126]",
    },
    {
      icon: "🎯",
      title: "Advanced Progress Tracking",
      description: "Detailed analytics and learning insights",
      gradient: "from-[#ffb86b] to-[#ff8e6d]",
    },
    {
      icon: "🎨",
      title: "Custom Themes",
      description: "Personalize your learning experience",
      gradient: "from-[#c8a4ff] to-[#8f66db]",
    },
    {
      icon: "👥",
      title: "Family Sharing",
      description: "Share premium with up to 5 family members",
      gradient: "from-[#56b8e8] to-[#2f9de4]",
    },
  ];

  return (
    // Premium Page Container
    <div className="theme-page min-h-screen relative overflow-hidden">
      {/* BACKGROUND */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(72,187,255,0.08),transparent_30%),#0f1b24] -z-10" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(251,191,36,0.15),transparent_50%)] -z-10" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(168,85,247,0.2),transparent_50%)] -z-10" />

      {/* STARS */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="fixed w-2 h-2 bg-yellow-300 rounded-full"
          style={{
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
          }}
          animate={{
            opacity: [0.2, 1, 0.2],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}

      {/* Top Navigation */}
      <NavigationHeader
        onBack={() => navigate("dashboard")}
        onLogout={() => navigate("landing")}
        title="Premium"
      />

      {/* Premium Content Wrapper */}
      <div className="max-w-6xl mx-auto p-4 mt-6">
        {/* HERO */}
        <motion.div className="text-center mb-12">
          <div className="text-9xl mb-6">✨</div>

          <h1 className="mb-4 bg-gradient-to-r from-[#dff1ff] via-[#7ed6ff] to-[#56b8e8] bg-clip-text font-baloo text-6xl font-bold text-transparent">
            Unlimited Batteries
          </h1>

          <p className="theme-title mb-6 text-2xl font-semibold">
            Unlock Your Full Learning Potential
          </p>

          {restoreSuccess && (
            <div className="mb-6 bg-green-900/30 border border-green-400/40 rounded-xl p-3 inline-block">
              <p className="text-green-300 font-semibold">✅ Purchase restored successfully</p>
            </div>
          )}

          {/* Pricing Card */}
          <Card className="theme-surface-strong shadow-2xl">
            <div className="p-8 text-center">
              <div className="text-6xl mb-3">🎁</div>

              <p className="theme-muted mb-2 text-lg font-bold">LIMITED TIME OFFER</p>

              <div className="flex justify-center items-end gap-2 mb-4">
                <span className="theme-muted text-2xl opacity-70 line-through">₱299.99</span>
                <span className="theme-title font-baloo text-6xl font-bold">FREE</span>
              </div>

              <div className="mt-2 flex flex-col items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleUnlockPremium}
                  disabled={loading || purchasing || isPremium}
                  className="rounded-2xl bg-[#FF9126] px-12 py-4 text-xl font-bold text-[#4a2a00] shadow-2xl hover:brightness-105 disabled:opacity-50"
                >
                  {isPremium
                    ? "Premium Unlocked"
                    : purchasing
                      ? "Processing…"
                      : "🔋Unlock Unlimited Batteries"}
                </motion.button>
                {/* Restore Purchase Action */}
                <motion.button
                  whileHover={{ opacity: 0.9 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleRestore}
                  disabled={loading || restoring || isPremium}
                  className="mt-4 text-sm text-[#8a55c6] underline opacity-80 hover:opacity-100 disabled:opacity-40"
                >
                  {restoring ? "Restoring..." : isPremium ? "Already Premium" : "Restore Purchase"}
                </motion.button>
              </div>

              {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
            </div>
          </Card>
        </motion.div>

        {/* Premium Features Section */}
        <motion.div className="mb-12">
          <h2 className="theme-title mb-8 text-center text-4xl font-bold">Premium Features</h2>

          <div className="flex flex-wrap justify-center gap-6">
            {features.map((feature) => (
              <Card
                key={feature.title}
                hover
                className="w-full md:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)] bg-white/10 border border-white/20"
              >
                <div className="text-center">
                  <div className="text-6xl mb-4">{feature.icon}</div>

                  <h3
                    className={`text-2xl font-bold mb-3 bg-gradient-to-r ${feature.gradient} bg-clip-text text-transparent`}
                  >
                    {feature.title}
                  </h3>

                  <p className="theme-muted">{feature.description}</p>
                </div>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* Testimonials Section */}
        <motion.div className="mb-12">
          <h2 className="theme-title mb-8 text-center font-baloo text-4xl font-bold">
            What Learners Say
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                name: "Maria Santos",
                quote:
                  "The unlimited batteries changed everything! I stay confident even when I make mistakes.",
                avatar: "👩",
                stars: 5,
              },
              {
                name: "Juan Dela Cruz",
                quote: "Offline mode is perfect for my daily commute. Worth every cent!",
                avatar: "👨",
                stars: 5,
              },
            ].map((testimonial, index) => (
              <Card key={index} className="bg-white/10 border border-white/20">
                <div className="flex gap-4">
                  <div className="text-5xl">{testimonial.avatar}</div>

                  <div>
                    <div className="mb-2">
                      {[...Array(testimonial.stars)].map((_, i) => (
                        <span key={i} className="text-yellow-400">
                          ⭐
                        </span>
                      ))}
                    </div>

                    <p className="theme-title mb-2 italic">"{testimonial.quote}"</p>

                    <p className="theme-muted text-sm font-bold">- {testimonial.name}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* FAQ Section */}
        <motion.div>
          <h2 className="theme-title mb-8 text-center font-baloo text-4xl font-bold">
            Frequently Asked Questions
          </h2>

          <div className="max-w-3xl mx-auto space-y-4">
            {[
              {
                q: "Can I cancel anytime?",
                a: "Yes! Cancel your subscription anytime with no penalties.",
              },
              {
                q: "What happens to my progress if I cancel?",
                a: "Your learning progress is always saved. You just lose premium features.",
              },
              {
                q: "Is there a family plan?",
                a: "Yes! Share premium with up to 5 family members.",
              },
            ].map((faq, index) => (
              <Card key={index} className="bg-white/10 border border-white/20">
                <h3 className="theme-title mb-2 font-bold">{faq.q}</h3>
                <p className="theme-muted">{faq.a}</p>
              </Card>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
