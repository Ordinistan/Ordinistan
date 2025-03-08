import { FiTrendingUp, FiBriefcase, FiShield } from 'react-icons/fi';

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg hover:shadow-xl transition-all border border-white/50 group hover:bg-white/90">
    <div className="text-core-primary text-3xl mb-4 group-hover:scale-110 transition-transform">{icon}</div>
    <h3 className="text-xl font-semibold text-core-dark mb-2">{title}</h3>
    <p className="text-core-muted">{description}</p>
  </div>
);

const FeaturesSection = () => {
  const features = [
    {
      icon: <FiTrendingUp />,
      title: "Lower Fees",
      description: "Save on transaction costs with Core Chain's efficient infrastructure"
    },
    {
      icon: <FiBriefcase />,
      title: "Fast Trading",
      description: "Experience lightning-fast transactions and seamless trading"
    },
    {
      icon: <FiShield />,
      title: "Secure Bridge",
      description: "Your assets are protected with industry-leading security measures"
    }
  ];

  return (
    <section className="relative -mt-10 z-10 px-4 mb-12">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {features.map((feature, index) => (
          <FeatureCard key={index} {...feature} />
        ))}
      </div>
    </section>
  );
};

export default FeaturesSection; 