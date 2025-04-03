import React from "react";

const one: string = "/images/one.png";
const two: string = "/images/two.png";
const three: string = "/images/three.png";

interface Item {
  id: number;
  image: string;
  title: string;
  description: string;
}

const WhyChooseUs: React.FC = () => {
  const items: Item[] = [
    {
      id: 1,
      image: one,
      title: "Lower Fees",
      description: "Save on transaction costs with Core Chain's efficient infrastructure",
    },
    {
      id: 2,
      image: two,
      title: "Fast Trading",
      description: "Experience lightning-fast transactions and seamless trading",
    },
    {
      id: 3,
      image: three,
      title: "Secure Bridge",
      description: "Your assets are protected with industry-leading security measures",
    },
  ];

  return (
    <div className="bg-black">
      <div className="max-w-[1370px] mx-auto px-8 py-10 md:py-16">
        {/* Section Title */}
        <div className="flex flex-col gap-2 mb-6 md:mb-10 text-center">
          <div className="rounded-full border-2 border-gray-600/50 px-5 py-2 text-gray-400 font-medium text-sm w-fit mx-auto">
            Why choose us?
          </div>
          <h2 className="text-3xl md:text-5xl font-[450] text-white max-w-[450px] mx-auto leading-tight">
            What makes us different?
          </h2>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.id} className="p-4 flex flex-col gap-4 items-center text-center">
              <img
                src={item.image}
                alt={item.title}
                className="max-h-[120px] md:max-h-[160px] mx-auto"
              />
              <div className="flex flex-col gap-2 -mt-8">
                <h3 className="text-2xl font-medium text-white">{item.title}</h3>
                <p className="text-lg text-gray-400 max-w-[300px] mx-auto">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WhyChooseUs;
