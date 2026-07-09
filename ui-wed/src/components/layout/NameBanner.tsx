import { wedding } from "@/config/wedding";

function NameBanner() {
  return (
    <div className="flex h-24 items-center justify-center bg-linen sm:h-28 lg:h-32">
      <p className="font-script text-6xl text-walnut sm:text-7xl lg:text-8xl">
        {wedding.coupleNames}
      </p>
    </div>
  );
}

export default NameBanner;
