const StatsCard = ({ value, label }: { value: string; label: string }) => (
  <div className="text-center group hover:scale-105 transition-transform duration-300">
    <p className="text-3xl font-bold bg-gradient-to-r from-gradient-start to-gradient-end bg-clip-text text-transparent group-hover:from-core-accent group-hover:to-gradient-end transition-all">
      {value}
    </p>
    <p className="text-core-muted font-medium">{label}</p>
  </div>
);

const StatsSection = () => {
  const stats = [
    { value: "1.2K", label: "Total Bridged" },
    { value: "500+", label: "Active Traders" },
    { value: "2.5K", label: "Total Volume" },
    { value: "100+", label: "Collections" }
  ];

  return (
    <section className="px-4 mb-12">
      <div className="max-w-6xl mx-auto bg-white/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/50 p-6 sm:p-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          {stats.map((stat, index) => (
            <StatsCard key={index} {...stat} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection; 