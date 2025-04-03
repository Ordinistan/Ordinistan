import React from "react";

const Figures: React.FC = () => {
  const stats: { value: string; label: string }[] = [
    { value: "1.2K", label: "Total Bridged" },
    { value: "500+", label: "Active Traders" },
    { value: "2.5K", label: "Total Volume" },
    { value: "100+", label: "Collections" },
  ];

  return (
    <>
      <div className="bg-black border-y-2 border-orange-500 p-2 md:p-2">
        <div className="grid grid-cols-2 md:grid-cols-4 overflow-x-auto max-w-[1370px] mx-auto px-8">
          {stats.map((item) => (
            <div key={item.value} className="flex flex-col gap-1 items-center justify-center mx-4 my-2">
              <div className="text-2xl md:text-4xl text-white font-medium">{item.value}</div>
              <div className="text-sm md:text-xl text-gray-400 font-[450]">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default Figures;
