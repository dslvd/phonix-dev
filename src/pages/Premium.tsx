import { motion } from 'framer-motion';
import Card from '../components/Card';
import NavigationHeader from '../components/NavigationHeader';
import { Page, AppState } from '../App';

interface PremiumProps {
  navigate: (page: Page) => void;
  appState: AppState;
  updateState: (updates: Partial<AppState>) => void;
}

export default function Premium({ navigate, appState, updateState }: PremiumProps) {
  const handleUnlockPremium = () => {
    // In a real app, this would integrate with payment system
    // For demo purposes, we'll just unlock it
    updateState({ 
      isPremium: true,
      heartsRemaining: 5,
      scansRemaining: 999999 // Unlimited
    });
    
    // Store premium status
    localStorage.setItem('isPremium', 'true');
    
    // Show success and navigate back
    alert('🎉 Unlimited Batteries Unlocked! You now have infinite batteries and premium features!');
    navigate('scan');
  };

  const features = [
    {
      icon: '🔋',
      title: 'Unlimited Batteries',
      description: 'Make mistakes while learning without ever running out of batteries!',
      gradient: 'from-[#7ed6ff] to-[#56b8e8]'
    },
    {
      icon: '📄',
      title: 'Document Translation',
      description: 'Translate entire documents and text passages',
      gradient: 'from-[#FF9126] to-[#FF9126]'
    },
    {
      icon: '🎯',
      title: 'Advanced Progress Tracking',
      description: 'Detailed analytics and learning insights',
      gradient: 'from-[#ffb86b] to-[#ff8e6d]'
    },
    {
      icon: '🎨',
      title: 'Custom Themes',
      description: 'Personalize your learning experience',
      gradient: 'from-[#c8a4ff] to-[#8f66db]'
    },
    {
      icon: '👥',
      title: 'Family Sharing',
      description: 'Share premium with up to 5 family members',
      gradient: 'from-[#56b8e8] to-[#2f9de4]'
    }
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Premium animated background */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(72,187,255,0.08),transparent_30%),#0f1b24] -z-10" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(251,191,36,0.15),transparent_50%)] -z-10" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(168,85,247,0.2),transparent_50%)] -z-10" />
      
      {/* Animated stars */}
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
      
      <NavigationHeader
        onBack={() => navigate('dashboard')}
        onLogout={() => navigate('landing')}
        title="Premium"
      />

      <div className="max-w-6xl mx-auto p-4 mt-6">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <motion.div
            animate={{ 
              rotate: [0, 5, -5, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 3, repeat: Infinity }}
            className="text-9xl mb-6 leading-none flex items-center justify-center"
          >
            ✨
          </motion.div>
          
          <h1 className="mb-4 bg-gradient-to-r from-[#dff1ff] via-[#7ed6ff] to-[#56b8e8] bg-clip-text font-baloo text-6xl font-bold text-transparent">
            Unlimited Batteries
          </h1>
          
          <p className="mb-2 text-2xl font-semibold text-[#dff1ff]">
            Unlock Your Full Learning Potential
          </p>
          
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-[#56b8e8]" />
            <p className="font-bold text-[#8bb1c7]">Premium Subscription</p>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-[#56b8e8]" />
          </div>

          {/* Current Status Banner */}
          {!appState.isPremium && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <div className="inline-block rounded-xl border border-[#2a4151] bg-[#122733] p-4 backdrop-blur-sm">
                <p className="mb-2 font-bold text-[#ffb86b]">
                  ⚠️ You have {appState.heartsRemaining} out of 5 batteries left
                </p>
                <p className="text-sm text-[#8bb1c7]">
                  Upgrade now to learn with unlimited batteries!
                </p>
              </div>
            </motion.div>
          )}
          
          {/* Pricing Card */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="inline-block"
          >
            <Card className="border border-[#2a4151] bg-[#0f202a] shadow-2xl">
              <div className="text-center p-8">
                <div className="text-6xl mb-3 leading-none flex items-center justify-center">🎁</div>
                <p className="mb-2 text-lg font-bold text-[#8bb1c7]">LIMITED TIME OFFER</p>
                <div className="flex items-end justify-center gap-2 mb-4">
                  <span className="text-2xl text-[#7fa2b8] line-through opacity-70">₱299.99</span>
                  <span className="font-baloo text-6xl font-bold text-[#dff1ff]">FREE</span>
                </div>
                <p className="mb-6 text-xl font-bold text-[#dff1ff]">
                  Demo Version - Unlock Now!
                </p>
                
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(255,255,255,0.5)" }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleUnlockPremium}
                  className="rounded-2xl border-b-4 border-[#FF9126] bg-[#FF9126] px-12 py-4 text-xl font-bold text-[#184a00] shadow-2xl transition-colors hover:brightness-105"
                >
                  <span className="flex items-center gap-3">
                    <span>🔋</span>
                    Unlock Unlimited Batteries
                    <span>🔋</span>
                  </span>
                </motion.button>
              </div>
            </Card>
          </motion.div>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-12"
        >
          <h2 className="font-baloo text-4xl font-bold text-white text-center mb-8">
            Premium Features
          </h2>
          
          <div className="flex flex-wrap justify-center gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="w-full md:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)]"
              >
                <Card 
                  hover 
                  className="bg-white/10 backdrop-blur-xl border-2 border-white/20 h-full"
                >
                  <div className="text-center">
                    {feature.icon ? (
                      <motion.div
                        whileHover={{ scale: 1.2, rotate: 10 }}
                        className="text-6xl mb-4 inline-block leading-none flex items-center justify-center"
                      >
                        {feature.icon}
                      </motion.div>
                    ) : null}
                    <h3 className={`font-baloo text-2xl font-bold mb-3 bg-gradient-to-r ${feature.gradient} bg-clip-text text-transparent`}>
                      {feature.title}
                    </h3>
                    <p className="leading-relaxed text-[#8bb1c7]">
                      {feature.description}
                    </p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Testimonials */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mb-12"
        >
          <h2 className="font-baloo text-4xl font-bold text-white text-center mb-8">
            What Learners Say
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                name: 'Maria Santos',
                quote: 'The unlimited batteries changed everything! I stay confident even when I make mistakes.',
                avatar: '👩',
                stars: 5
              },
              {
                name: 'Juan Dela Cruz',
                quote: 'Offline mode is perfect for my daily commute. Worth every cent!',
                avatar: '👨',
                stars: 5
              }
            ].map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, x: index === 0 ? -30 : 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.9 + index * 0.1 }}
              >
                <Card className="bg-white/10 backdrop-blur-xl border-2 border-white/20">
                  <div className="flex items-start gap-4">
                    <div className="text-5xl leading-none flex items-center justify-center">
                      {testimonial.avatar}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-1 mb-2">
                        {[...Array(testimonial.stars)].map((_, i) => (
                          <span key={i} className="text-yellow-400 text-xl leading-none flex items-center justify-center">⭐</span>
                        ))}
                      </div>
                      <p className="text-white font-semibold italic mb-2">
                        "{testimonial.quote}"
                      </p>
                      <p className="text-sm font-bold text-[#8bb1c7]">
                        - {testimonial.name}
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <h2 className="font-baloo text-4xl font-bold text-white text-center mb-8">
            Frequently Asked Questions
          </h2>
          
          <div className="max-w-3xl mx-auto space-y-4">
            {[
              {
                q: 'Can I cancel anytime?',
                a: 'Yes! Cancel your subscription anytime with no penalties.'
              },
              {
                q: 'What happens to my progress if I cancel?',
                a: 'Your learning progress is always saved. You just lose premium features.'
              },
              {
                q: 'Is there a family plan?',
                a: 'Yes! Share premium with up to 5 family members.'
              }
            ].map((faq, index) => (
              <Card 
                key={index} 
                className="bg-white/10 backdrop-blur-xl border-2 border-white/20"
              >
                <h3 className="font-bold text-yellow-300 text-lg mb-2">
                  {faq.q}
                </h3>
                <p className="text-[#8bb1c7]">
                  {faq.a}
                </p>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="text-center mt-12"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleUnlockPremium}
            className="rounded-3xl border-b-4 border-[#FF9126] bg-[#FF9126] px-16 py-6 text-2xl font-bold text-[#184a00] shadow-2xl transition-all hover:brightness-105"
          >
            <span className="flex items-center gap-3">
              <span className="text-3xl leading-none flex items-center justify-center">🚀</span>
              Start Your Magic Journey
              <span className="text-3xl leading-none flex items-center justify-center">✨</span>
            </span>
          </motion.button>
          
          <p className="mt-4 text-sm text-[#8bb1c7]">
            No credit card required • Instant activation
          </p>
        </motion.div>
      </div>
    </div>
  );
}
